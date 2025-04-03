package wallet

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
)

// TokenInfo represents information about a token balance
type TokenInfo struct {
	model.Coin         // Embed the Coin model
	Value      float64 `json:"value"`      // Additional field specific to wallet tokens
	Percentage float64 `json:"percentage"` // Additional field specific to wallet tokens
}

// WalletBalance represents a wallet's complete balance
type WalletBalance struct {
	Tokens []TokenInfo `json:"tokens"`
}

// Service handles wallet-related operations
type Service struct {
	client      *rpc.Client
	coinService *coin.Service
}

// New creates a new wallet service
func New(client *rpc.Client, coinService *coin.Service) *Service {
	return &Service{
		client:      client,
		coinService: coinService,
	}
}

// GetTokens returns all tokens in a wallet including SOL
func (s *Service) GetTokens(ctx context.Context, address string) (*WalletBalance, error) {
	// Parse the public key
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid address: %v", err)
	}

	// Get SOL balance first
	balance, err := s.client.GetBalance(
		ctx,
		pubKey,
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get SOL balance: %v", err)
	}

	// Convert lamports to SOL (balance.Value is in lamports)
	solBalance := float64(balance.Value) / 1e9

	// Get enriched SOL data from coin service
	solData, err := s.coinService.GetCoinByID(ctx, "So11111111111111111111111111111111111111112")
	if err != nil {
		return nil, fmt.Errorf("failed to get SOL data: %v", err)
	}

	// Get other token balances
	tokens, err := s.getTokenBalances(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}

	// Create SOL token info
	solToken := TokenInfo{
		Coin: model.Coin{
			ID:      solData.ID,
			Name:    solData.Name,
			Symbol:  solData.Symbol,
			Price:   solData.Price,
			Balance: solBalance,
		},
		Value: solBalance * solData.Price,
	}

	// Combine SOL with other tokens
	allTokens := append([]TokenInfo{solToken}, tokens...)

	// Recalculate total value and percentages including SOL
	var totalValue float64
	for _, token := range allTokens {
		totalValue += token.Value
	}

	// Update percentages
	for i := range allTokens {
		if totalValue > 0 {
			allTokens[i].Percentage = (allTokens[i].Value / totalValue) * 100
		}
	}

	// Sort by value descending
	sort.Slice(allTokens, func(i, j int) bool {
		return allTokens[i].Value > allTokens[j].Value
	})

	return &WalletBalance{
		Tokens: allTokens,
	}, nil
}

// getTokenBalances is a helper function that gets just the token balances
func (s *Service) getTokenBalances(ctx context.Context, address string) ([]TokenInfo, error) {
	// Validate wallet address
	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet address: %v", err)
	}

	// Get token accounts with jsonParsed encoding
	accounts, err := s.client.GetTokenAccountsByOwner(
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
		return []TokenInfo{}, fmt.Errorf("failed to get token accounts: %v", err)
	}

	// First collect mint addresses and balances for tokens with positive balance
	tokens := make([]TokenInfo, 0)
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

		mintAddress := parsedAccount.Parsed.Info.Mint
		balance := parsedAccount.Parsed.Info.TokenAmount.UiAmount

		// Get enriched coin data from coin service
		coinData, err := s.coinService.GetCoinByID(ctx, mintAddress)
		if err != nil {
			fmt.Printf("Warning: failed to get coin data for %s: %v\n", mintAddress, err)
			continue
		}

		// Create token info with enriched data
		token := TokenInfo{
			Coin: model.Coin{
				ID:      coinData.ID,
				Name:    coinData.Name,
				Symbol:  coinData.Symbol,
				Price:   coinData.Price,
				Balance: balance,
			},
			Value: balance * coinData.Price,
		}

		tokens = append(tokens, token)
	}

	return tokens, nil
}
