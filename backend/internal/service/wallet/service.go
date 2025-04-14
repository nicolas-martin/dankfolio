package wallet

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gagliardetto/solana-go"
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
