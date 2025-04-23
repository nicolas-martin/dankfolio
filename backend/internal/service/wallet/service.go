package wallet

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles wallet-related operations
type Service struct {
	rpcClient *rpc.Client
}

// New creates a new wallet service
func New(rpcClient *rpc.Client) *Service {
	return &Service{
		rpcClient: rpcClient,
	}
}

// CreateWallet generates a new Solana wallet
func (s *Service) CreateWallet(ctx context.Context) (*WalletInfo, error) {
	// Generate a new keypair
	account := solana.NewWallet()

	return &WalletInfo{
		PublicKey: account.PublicKey().String(),
		SecretKey: account.PrivateKey.String(),
	}, nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *Service) PrepareTransfer(ctx context.Context, fromAddress, toAddress, tokenMint string, amount float64) (string, error) {
	log.Printf("🔄 Preparing transfer: From=%s To=%s Amount=%.9f TokenMint=%s\n",
		fromAddress, toAddress, amount, tokenMint)

	// Parse addresses
	fromPubKey, err := solana.PublicKeyFromBase58(fromAddress)
	if err != nil {
		log.Printf("❌ Invalid from address: %v\n", err)
		return "", fmt.Errorf("invalid from address: %w", err)
	}
	log.Printf("✅ From address parsed: %s\n", fromPubKey)

	toPubKey, err := solana.PublicKeyFromBase58(toAddress)
	if err != nil {
		log.Printf("❌ Invalid to address: %v\n", err)
		return "", fmt.Errorf("invalid to address: %w", err)
	}
	log.Printf("✅ To address parsed: %s\n", toPubKey)

	// Create transaction
	var tx *solana.Transaction
	if tokenMint == "" {
		log.Printf("🪙 Creating SOL transfer transaction\n")
		lamports := uint64(amount * float64(solana.LAMPORTS_PER_SOL))
		log.Printf("💰 Amount in lamports: %d\n", lamports)
		tx, err = s.createSolTransfer(ctx, fromPubKey, toPubKey, lamports)
	} else {
		log.Printf("🪙 Creating token transfer transaction\n")
		tx, err = s.createTokenTransfer(ctx, fromPubKey, toPubKey, tokenMint, amount)
	}
	if err != nil {
		log.Printf("❌ Failed to create transfer transaction: %v\n", err)
		return "", fmt.Errorf("failed to create transfer transaction: %w", err)
	}
	log.Printf("✅ Transaction created successfully\n")

	// Serialize transaction
	serializedTx, err := tx.MarshalBinary()
	if err != nil {
		log.Printf("❌ Failed to serialize transaction: %v\n", err)
		return "", fmt.Errorf("failed to serialize transaction: %w", err)
	}
	log.Printf("✅ Transaction serialized successfully\n")

	encoded := base64.StdEncoding.EncodeToString(serializedTx)
	log.Printf("✅ Transaction encoded successfully (length: %d)\n", len(encoded))
	return encoded, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *Service) SubmitTransfer(ctx context.Context, signedTransaction string) (string, error) {
	// Decode signed transaction
	txBytes, err := base64.StdEncoding.DecodeString(signedTransaction)
	if err != nil {
		return "", fmt.Errorf("failed to decode signed transaction: %w", err)
	}

	// Parse transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse transaction: %w", err)
	}

	// Submit transaction with optimized options
	maxRetries := uint(3)
	sig, err := s.rpcClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentConfirmed,
		MaxRetries:          &maxRetries,
	})
	if err != nil {
		return "", fmt.Errorf("failed to submit transaction: %w", err)
	}

	return sig.String(), nil
}

// createSolTransfer creates a SOL transfer transaction
func (s *Service) createSolTransfer(ctx context.Context, from, to solana.PublicKey, lamports uint64) (*solana.Transaction, error) {
	log.Printf("🔄 Creating SOL transfer: From=%s To=%s Lamports=%d\n", from, to, lamports)

	// Get recent blockhash
	log.Printf("🔍 Getting recent blockhash...\n")
	recent, err := s.rpcClient.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		log.Printf("❌ Failed to get recent blockhash: %+v\n", err)
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}
	log.Printf("✅ Got recent blockhash: %s\n", recent.Value.Blockhash)

	// Create transfer instruction
	log.Printf("🔄 Creating transfer instruction...\n")
	transferIx := system.NewTransferInstruction(
		lamports,
		from,
		to,
	).Build()
	log.Printf("✅ Transfer instruction created\n")

	// Create transaction
	log.Printf("🔄 Building transaction...\n")
	tx, err := solana.NewTransaction(
		[]solana.Instruction{transferIx},
		recent.Value.Blockhash,
		solana.TransactionPayer(from),
	)
	if err != nil {
		log.Printf("❌ Failed to create transaction: %v\n", err)
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}
	log.Printf("✅ Transaction built successfully\n")

	return tx, nil
}

// createTokenTransfer creates a token transfer transaction
func (s *Service) createTokenTransfer(ctx context.Context, from, to solana.PublicKey, tokenMint string, amount float64) (*solana.Transaction, error) {
	// Get token mint info
	mintPubKey, err := solana.PublicKeyFromBase58(tokenMint)
	if err != nil {
		return nil, fmt.Errorf("invalid token mint address: %w", err)
	}

	// Get token account info
	fromATA, _, err := solana.FindAssociatedTokenAddress(from, mintPubKey)
	if err != nil {
		return nil, fmt.Errorf("failed to find source token account: %w", err)
	}

	toATA, _, err := solana.FindAssociatedTokenAddress(to, mintPubKey)
	if err != nil {
		return nil, fmt.Errorf("failed to find destination token account: %w", err)
	}

	// Get recent blockhash
	recent, err := s.rpcClient.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Get token decimals
	mintAcct, err := s.rpcClient.GetAccountInfo(ctx, mintPubKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get mint info: %w", err)
	}

	var mintInfo struct {
		Decimals uint8 `json:"decimals"`
	}
	if err := json.Unmarshal(mintAcct.Value.Data.GetRawJSON(), &mintInfo); err != nil {
		return nil, fmt.Errorf("failed to parse mint info: %w", err)
	}

	// Convert amount to raw units
	rawAmount := uint64(amount * float64(uint64(1)<<mintInfo.Decimals))

	// Create transfer instruction
	transferIx := token.NewTransferCheckedInstruction(
		rawAmount,
		mintInfo.Decimals,
		fromATA,
		mintPubKey,
		toATA,
		from,
		[]solana.PublicKey{},
	).Build()

	// Create transaction
	tx, err := solana.NewTransaction(
		[]solana.Instruction{transferIx},
		recent.Value.Blockhash,
		solana.TransactionPayer(from),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	return tx, nil
}

func (s *Service) GetWalletBalances(ctx context.Context, address string) (*WalletBalance, error) {
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid address: %v", err)
	}

	// Get SOL solData first
	solData, err := s.rpcClient.GetBalance(
		ctx,
		pubKey,
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get SOL balance: %v", err)
	}

	// Convert lamports to SOL (balance.Value is in lamports)
	// solBalance := float64(balance.Value) / 1e9

	// Get other token balances
	tokenBalances, err := s.getTokenBalances(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}

	solValue := float64(solData.Value) / float64(solana.LAMPORTS_PER_SOL)
	// Create SOL token info
	solBalance := Balance{
		ID:     model.SolMint,
		Amount: solValue,
	}

	// Combine SOL with other tokens
	allBalances := append([]Balance{solBalance}, tokenBalances...)

	return &WalletBalance{
		Balances: allBalances,
	}, nil
}

// getTokenBalances is a helper function that gets just the token balances
func (s *Service) getTokenBalances(ctx context.Context, address string) ([]Balance, error) {
	// Validate wallet address
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet address: %v", err)
	}

	// Get token accounts with jsonParsed encoding
	accounts, err := s.rpcClient.GetTokenAccountsByOwner(
		ctx,
		pubKey,
		&rpc.GetTokenAccountsConfig{
			ProgramId: solana.TokenProgramID.ToPointer(),
		},
		&rpc.GetTokenAccountsOpts{
			Encoding:   solana.EncodingJSONParsed,
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		return []Balance{}, fmt.Errorf("failed to get token accounts: %v", err)
	}

	// First collect mint addresses and balances for tokens with positive balance
	tokens := make([]Balance, 0)
	for _, account := range accounts.Value {
		// Get the parsed token account data
		parsedData := account.Account.Data.GetRawJSON()
		if len(parsedData) == 0 {
			continue
		}

		var parsedAccount struct {
			Parsed struct {
				Info struct {
					Mint        string `json:"mint"`
					TokenAmount struct {
						UiAmount float64 `json:"uiAmount"`
					} `json:"tokenAmount"`
				} `json:"info"`
			} `json:"parsed"`
		}

		if err = json.Unmarshal(parsedData, &parsedAccount); err != nil {
			continue
		}

		// Skip if no balance
		if parsedAccount.Parsed.Info.TokenAmount.UiAmount <= 0 {
			continue
		}

		// Create token info with enriched data
		token := Balance{
			ID:     parsedAccount.Parsed.Info.Mint,
			Amount: parsedAccount.Parsed.Info.TokenAmount.UiAmount,
		}

		tokens = append(tokens, token)
	}

	return tokens, nil
}
