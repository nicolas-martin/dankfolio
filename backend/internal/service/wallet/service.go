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

// GetTokens retrieves token balances for a wallet
func (s *Service) GetTokens(ctx context.Context, address string) ([]TokenInfo, error) {
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
			Coin:  *coinData,
			Value: balance * coinData.Price,
		}
		token.Balance = balance // Override the balance with actual wallet balance

		tokens = append(tokens, token)
	}

	// Calculate total value and percentages
	var totalValue float64
	for _, token := range tokens {
		totalValue += token.Value
	}

	// Calculate percentages
	for i := range tokens {
		if totalValue > 0 {
			tokens[i].Percentage = (tokens[i].Value / totalValue) * 100
		}
	}

	// Sort by value descending
	sort.Slice(tokens, func(i, j int) bool {
		return tokens[i].Value > tokens[j].Value
	})

	return tokens, nil
}
