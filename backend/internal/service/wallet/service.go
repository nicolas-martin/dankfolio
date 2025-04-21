package wallet

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
)

// Balance represents information about a token balance
type Balance struct {
	ID     string  `json:"id"`
	Amount float64 `json:"amount"`
}

// WalletBalance represents a wallet's complete balance
type WalletBalance struct {
	Balances []Balance `json:"balances"`
}

// WalletInfo represents a wallet's public and private keys
type WalletInfo struct {
	PublicKey string `json:"public_key"`
	SecretKey string `json:"secret_key"`
}

// Service handles wallet-related operations
type Service struct {
	rpcClient   *rpc.Client
	coinService *coin.Service
}

// New creates a new wallet service
func New(rpcClient *rpc.Client, coinService *coin.Service) *Service {
	return &Service{
		rpcClient:   rpcClient,
		coinService: coinService,
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
	// Parse addresses
	fromPubKey, err := solana.PublicKeyFromBase58(fromAddress)
	if err != nil {
		return "", fmt.Errorf("invalid from address: %w", err)
	}

	toPubKey, err := solana.PublicKeyFromBase58(toAddress)
	if err != nil {
		return "", fmt.Errorf("invalid to address: %w", err)
	}

	// Create transaction
	var tx *solana.Transaction
	if tokenMint == "" {
		// SOL transfer
		lamports := uint64(amount * float64(solana.LAMPORTS_PER_SOL))
		tx, err = s.createSolTransfer(ctx, fromPubKey, toPubKey, lamports)
	} else {
		// Token transfer
		tx, err = s.createTokenTransfer(ctx, fromPubKey, toPubKey, tokenMint, amount)
	}
	if err != nil {
		return "", fmt.Errorf("failed to create transfer transaction: %w", err)
	}

	// Serialize transaction
	serializedTx, err := tx.MarshalBinary()
	if err != nil {
		return "", fmt.Errorf("failed to serialize transaction: %w", err)
	}

	return base64.StdEncoding.EncodeToString(serializedTx), nil
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

	// Submit transaction
	sig, err := s.rpcClient.SendTransaction(ctx, tx)
	if err != nil {
		return "", fmt.Errorf("failed to submit transaction: %w", err)
	}

	return sig.String(), nil
}

// createSolTransfer creates a SOL transfer transaction
func (s *Service) createSolTransfer(ctx context.Context, from, to solana.PublicKey, lamports uint64) (*solana.Transaction, error) {
	// Get recent blockhash
	recent, err := s.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Create transfer instruction
	transferIx := system.NewTransferInstruction(
		lamports,
		from,
		to,
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
	recent, err := s.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentConfirmed)
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

		// "tokenAmount": {
		//     "amount": "1483648132140",
		//     "decimals": 6,
		//     "uiAmount": 1483648.13214,
		//     "uiAmountString": "1483648.13214"
		// }
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

		// NOTE: Let's not enrich the data here, we might only care about a few things
		// // Get enriched coin data from coin service
		// coinData, err := s.coinService.GetCoinByID(ctx, mintAddress)
		// if err != nil {
		// 	fmt.Printf("Warning: failed to get coin data for %s: %v\n", mintAddress, err)
		// 	continue
		// }

		// Create token info with enriched data
		token := Balance{
			ID:     parsedAccount.Parsed.Info.Mint,
			Amount: parsedAccount.Parsed.Info.TokenAmount.UiAmount,
		}

		tokens = append(tokens, token)
	}

	return tokens, nil
}
