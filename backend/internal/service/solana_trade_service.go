package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/gagliardetto/solana-go"
	associatedtoken "github.com/gagliardetto/solana-go/programs/associated-token-account"
	computebudget "github.com/gagliardetto/solana-go/programs/compute-budget"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

var (
	// Default compute unit limits for transactions
	defaultComputeUnitLimit uint32 = 70000
	// Error definitions
	ErrInvalidCoin = errors.New("invalid coin")
	ErrATAFailure  = errors.New("failed to handle associated token account")
)

// SolanaTradeService handles the execution of trades on the Solana blockchain
type SolanaTradeService struct {
	client           *rpc.Client
	wsClient         *ws.Client
	programID        solana.PublicKey
	poolWallet       solana.PublicKey
	db               db.DB
	computeUnitLimit uint32
	feeMicroLamports uint64
	skipATALookup    bool
}

// NewSolanaTradeService creates a new instance of SolanaTradeService
func NewSolanaTradeService(rpcEndpoint string, wsEndpoint string, programID string, poolWallet string, db db.DB) (*SolanaTradeService, error) {
	client := rpc.New(rpcEndpoint)
	wsClient, err := ws.Connect(context.Background(), wsEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to websocket: %w", err)
	}

	programPubkey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %w", err)
	}

	poolPubkey, err := solana.PublicKeyFromBase58(poolWallet)
	if err != nil {
		return nil, fmt.Errorf("invalid pool wallet: %w", err)
	}

	return &SolanaTradeService{
		client:           client,
		wsClient:         wsClient,
		programID:        programPubkey,
		poolWallet:       poolPubkey,
		db:               db,
		computeUnitLimit: defaultComputeUnitLimit,
		feeMicroLamports: 0,     // Default to 0, can be set via method
		skipATALookup:    false, // Default to false, can be set via method
	}, nil
}

// SetComputeUnitLimit sets the compute unit limit for transactions
func (s *SolanaTradeService) SetComputeUnitLimit(limit uint32) {
	s.computeUnitLimit = limit
}

// SetFeeMicroLamports sets the fee in micro lamports for transactions
func (s *SolanaTradeService) SetFeeMicroLamports(fee uint64) {
	s.feeMicroLamports = fee
}

// SetSkipATALookup sets whether to skip ATA lookup
func (s *SolanaTradeService) SetSkipATALookup(skip bool) {
	s.skipATALookup = skip
}

// ExecuteTrade executes a trade on the Solana blockchain
func (s *SolanaTradeService) ExecuteTrade(ctx context.Context, trade *model.Trade, userWallet solana.PublicKey) error {
	if trade == nil {
		return ErrInvalidCoin
	}

	// Get recent blockhash for transaction
	recent, err := s.client.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Create compute budget instructions
	culInst := computebudget.NewSetComputeUnitLimitInstruction(s.computeUnitLimit)
	cupInst := computebudget.NewSetComputeUnitPriceInstruction(s.feeMicroLamports)

	// Initialize instructions array with compute budget instructions
	instructions := []solana.Instruction{
		culInst.Build(),
		cupInst.Build(),
	}

	// Handle ATA creation if needed
	var shouldCreateATA bool
	if s.skipATALookup {
		shouldCreateATA = true
	} else {
		ata, _, err := solana.FindAssociatedTokenAddress(userWallet, solana.MustPublicKeyFromBase58(trade.CoinID))
		if err != nil {
			return fmt.Errorf("failed to find associated token address: %w", err)
		}

		// Check if account exists
		account, err := s.client.GetAccountInfo(ctx, ata)
		shouldCreateATA = (err != nil || account == nil)
	}

	// Create ATA instruction if needed
	if shouldCreateATA {
		ataInstruction, err := s.createAssociatedTokenAccountInstruction(ctx, trade, userWallet)
		if err != nil {
			return fmt.Errorf("failed to create ATA instruction: %w", err)
		}
		if ataInstruction != nil {
			instructions = append(instructions, ataInstruction)
		}
	}

	// Create the trade instruction
	tradeInstruction, err := s.createTradeInstruction(trade, userWallet)
	if err != nil {
		return fmt.Errorf("failed to create trade instruction: %w", err)
	}
	instructions = append(instructions, tradeInstruction)

	// Build transaction
	tx, err := solana.NewTransaction(
		instructions,
		recent.Value.Blockhash,
		solana.TransactionPayer(userWallet),
	)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	// Get the user's private key from the database
	var privateKeyStr string
	err = s.db.QueryRow(ctx, `
		SELECT private_key
		FROM wallets
		WHERE user_id = $1
	`, trade.UserID).Scan(&privateKeyStr)
	if err != nil {
		return fmt.Errorf("failed to get user's private key: %w", err)
	}

	// Convert private key string to Solana private key
	privateKey, err := solana.PrivateKeyFromBase58(privateKeyStr)
	if err != nil {
		return fmt.Errorf("invalid private key: %w", err)
	}

	// Sign transaction
	tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(userWallet) {
			return &privateKey
		}
		return nil
	})

	// Serialize and encode transaction
	serializedTx, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to serialize transaction: %w", err)
	}

	// Base64 encode the transaction
	encodedTx := base64.StdEncoding.EncodeToString(serializedTx)

	// Submit transaction
	sig, err := s.client.SendEncodedTransaction(ctx, encodedTx)
	if err != nil {
		return fmt.Errorf("failed to submit transaction: %w", err)
	}

	// Wait for confirmation with improved error handling
	confirmed, err := s.waitForSignatureConfirmation(ctx, sig)
	if err != nil {
		if err == context.DeadlineExceeded {
			return fmt.Errorf("transaction confirmation timeout: %s", sig.String())
		}
		return fmt.Errorf("transaction failed: %w", err)
	}

	if !confirmed {
		return fmt.Errorf("transaction failed to confirm: %s", sig.String())
	}

	return nil
}

// createAssociatedTokenAccountInstruction creates an instruction to create an associated token account if it doesn't exist
func (s *SolanaTradeService) createAssociatedTokenAccountInstruction(ctx context.Context, trade *model.Trade, userWallet solana.PublicKey) (solana.Instruction, error) {
	mint, err := solana.PublicKeyFromBase58(trade.CoinID)
	if err != nil {
		return nil, fmt.Errorf("invalid coin ID: %w", err)
	}

	ata, _, err := solana.FindAssociatedTokenAddress(userWallet, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to find associated token address: %w", err)
	}

	// Check if account exists
	account, err := s.client.GetAccountInfo(ctx, ata)
	if err != nil || account == nil {
		// Create ATA instruction using SPL Token program
		instruction := associatedtoken.NewCreateInstruction(
			userWallet,
			userWallet,
			mint,
		).Build()
		return instruction, nil
	}

	return nil, nil
}

// createTradeInstruction creates the instruction for executing the trade
func (s *SolanaTradeService) createTradeInstruction(trade *model.Trade, userWallet solana.PublicKey) (solana.Instruction, error) {
	mint, err := solana.PublicKeyFromBase58(trade.CoinID)
	if err != nil {
		return nil, fmt.Errorf("invalid coin ID: %w", err)
	}

	// Convert amount to lamports (smallest unit)
	amountLamports := uint64(trade.Amount * 1e9) // Convert SOL to lamports

	// Check if this is a native SOL trade
	isNativeSOL := mint.Equals(solana.SolMint)

	if isNativeSOL {
		// For native SOL, use system program transfer
		return system.NewTransferInstruction(
			amountLamports,
			userWallet,
			s.poolWallet,
		).Build(), nil
	}

	// For token trades
	userATA, _, err := solana.FindAssociatedTokenAddress(userWallet, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to find user token address: %w", err)
	}

	poolATA, _, err := solana.FindAssociatedTokenAddress(s.poolWallet, mint)
	if err != nil {
		return nil, fmt.Errorf("failed to find pool token address: %w", err)
	}

	if trade.Type == "buy" {
		// For buy trades, transfer SOL from user to pool
		return system.NewTransferInstruction(
			amountLamports,
			userWallet,
			s.poolWallet,
		).Build(), nil
	} else {
		// For sell trades, transfer tokens from user to pool
		return token.NewTransferInstruction(
			amountLamports,
			userATA,
			poolATA,
			userWallet,
			[]solana.PublicKey{},
		).Build(), nil
	}
}

// waitForSignatureConfirmation waits for a transaction to be confirmed
func (s *SolanaTradeService) waitForSignatureConfirmation(ctx context.Context, signature solana.Signature) (bool, error) {
	for i := 0; i < 50; i++ { // Try for about 25 seconds
		sigs := []solana.Signature{signature}
		result, err := s.client.GetSignatureStatuses(ctx, true, sigs...)
		if err != nil {
			return false, err
		}

		if result.Value != nil && len(result.Value) > 0 && result.Value[0] != nil {
			if result.Value[0].Err != nil {
				return false, fmt.Errorf("transaction failed: %v", result.Value[0].Err)
			}
			return true, nil
		}

		select {
		case <-ctx.Done():
			return false, ctx.Err()
		case <-time.After(500 * time.Millisecond):
			continue
		}
	}

	return false, fmt.Errorf("timeout waiting for confirmation")
}

// Helper function to convert uint64 to bytes
func uint64ToBytes(n uint64) []byte {
	b := make([]byte, 8)
	for i := 0; i < 8; i++ {
		b[i] = byte(n >> (i * 8))
	}
	return b
}

// GetClient returns the RPC client for direct blockchain interactions
func (s *SolanaTradeService) GetClient() *rpc.Client {
	return s.client
}

// GetTokenBalance gets the token balance for a specific token account
func (s *SolanaTradeService) GetTokenBalance(ctx context.Context, walletAddress string, tokenMint string) (uint64, error) {
	pubKey, err := solana.PublicKeyFromBase58(walletAddress)
	if err != nil {
		return 0, fmt.Errorf("invalid wallet address: %w", err)
	}

	mint, err := solana.PublicKeyFromBase58(tokenMint)
	if err != nil {
		return 0, fmt.Errorf("invalid token mint: %w", err)
	}

	ata, _, err := solana.FindAssociatedTokenAddress(pubKey, mint)
	if err != nil {
		return 0, fmt.Errorf("failed to find associated token address: %w", err)
	}

	account, err := s.client.GetTokenAccountBalance(ctx, ata, rpc.CommitmentFinalized)
	if err != nil {
		return 0, fmt.Errorf("failed to get token balance: %w", err)
	}

	var balance uint64
	_, err = fmt.Sscanf(account.Value.Amount, "%d", &balance)
	if err != nil {
		return 0, fmt.Errorf("failed to parse token amount: %w", err)
	}

	return balance, nil
}

// CreateAssociatedTokenAccountIfNeeded creates an ATA if it doesn't exist
func (s *SolanaTradeService) CreateAssociatedTokenAccountIfNeeded(ctx context.Context, trade *model.Trade, userWallet solana.PublicKey) error {
	mint, err := solana.PublicKeyFromBase58(trade.CoinID)
	if err != nil {
		return fmt.Errorf("invalid coin ID: %w", err)
	}

	ata, _, err := solana.FindAssociatedTokenAddress(userWallet, mint)
	if err != nil {
		return fmt.Errorf("failed to find associated token address: %w", err)
	}

	// Check if account exists
	account, err := s.client.GetAccountInfo(ctx, ata)
	if err == nil && account != nil {
		// ATA already exists
		return nil
	}

	// Get recent blockhash
	recent, err := s.client.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Create compute budget instructions
	culInst := computebudget.NewSetComputeUnitLimitInstruction(s.computeUnitLimit)
	cupInst := computebudget.NewSetComputeUnitPriceInstruction(s.feeMicroLamports)

	// Create ATA instruction
	ataInstruction := associatedtoken.NewCreateInstruction(
		userWallet,
		userWallet,
		mint,
	).Build()

	// Build transaction
	tx, err := solana.NewTransaction(
		[]solana.Instruction{
			culInst.Build(),
			cupInst.Build(),
			ataInstruction,
		},
		recent.Value.Blockhash,
		solana.TransactionPayer(userWallet),
	)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	// Get the user's private key from the database
	var privateKeyStr string
	err = s.db.QueryRow(ctx, `
		SELECT private_key
		FROM wallets
		WHERE user_id = $1
	`, trade.UserID).Scan(&privateKeyStr)
	if err != nil {
		return fmt.Errorf("failed to get user's private key: %w", err)
	}

	// Convert private key string to Solana private key
	privateKey, err := solana.PrivateKeyFromBase58(privateKeyStr)
	if err != nil {
		return fmt.Errorf("invalid private key: %w", err)
	}

	// Sign transaction
	tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(userWallet) {
			return &privateKey
		}
		return nil
	})

	// Serialize and encode transaction
	serializedTx, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to serialize transaction: %w", err)
	}

	// Base64 encode the transaction
	encodedTx := base64.StdEncoding.EncodeToString(serializedTx)

	// Submit transaction
	sig, err := s.client.SendEncodedTransaction(ctx, encodedTx)
	if err != nil {
		return fmt.Errorf("failed to submit transaction: %w", err)
	}

	// Wait for confirmation
	confirmed, err := s.waitForSignatureConfirmation(ctx, sig)
	if err != nil {
		return fmt.Errorf("failed to confirm transaction: %w", err)
	}

	if !confirmed {
		return fmt.Errorf("transaction failed to confirm")
	}

	return nil
}
