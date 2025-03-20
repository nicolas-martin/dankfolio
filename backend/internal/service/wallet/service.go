package wallet

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
)

// TokenInfo represents information about a token balance
type TokenInfo struct {
	Symbol     string  `json:"symbol"`
	Name       string  `json:"name"`
	Balance    float64 `json:"balance"`
	Price      float64 `json:"price"`
	Value      float64 `json:"value"`
	Percentage float64 `json:"percentage"`
	LogoURL    string  `json:"logoURL"`
}

// Service handles wallet-related operations
type Service struct {
	client  *rpc.Client
	jupiter *coin.JupiterClient
}

// New creates a new wallet service
func New(client *rpc.Client, jupiter *coin.JupiterClient) *Service {
	if client == nil {
		client = rpc.New("https://api.mainnet-beta.solana.com")
	}
	if jupiter == nil {
		jupiter = coin.NewJupiterClient()
	}
	return &Service{
		client:  client,
		jupiter: jupiter,
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
		return nil, fmt.Errorf("failed to get token accounts: %v", err)
	}

	// First collect mint addresses and balances for tokens with positive balance
	var tokens []TokenInfo
	var mintAddresses []string
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

		// Try to get token info, but don't skip if we can't
		token := TokenInfo{
			Symbol:  mintAddress[:8] + "...", // Default to shortened address
			Name:    "Unknown Token",
			Balance: balance,
		}

		tokenInfo, err := s.jupiter.GetTokenInfo(mintAddress)
		if err == nil {
			token.Symbol = tokenInfo.Symbol
			token.Name = tokenInfo.Name
			token.LogoURL = tokenInfo.LogoURI
		} else {
			fmt.Printf("Warning: failed to get token info for %s: %v\n", mintAddress, err)
		}

		mintAddresses = append(mintAddresses, mintAddress)
		tokens = append(tokens, token)
	}

	// Skip price fetching if we have no tokens
	if len(mintAddresses) == 0 {
		return nil, nil
	}

	// Get token prices
	prices, err := s.jupiter.GetTokenPrices(mintAddresses)
	if err != nil {
		return nil, fmt.Errorf("failed to get token prices: %v", err)
	}

	// Calculate total value and update token info
	var totalValue float64
	for i, addr := range mintAddresses {
		price := prices[addr]
		value := tokens[i].Balance * price
		tokens[i].Price = price
		tokens[i].Value = value
		totalValue += value
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
