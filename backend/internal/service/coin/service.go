package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

// TokenList represents the structure of trimmed_mainnet.json
type TokenList struct {
	Tokens []struct {
		Token struct {
			Symbol   string `json:"symbol"`
			Name     string `json:"name"`
			Mint     string `json:"mint"`
			Decimals int    `json:"decimals"`
		} `json:"token"`
		Pools []struct {
			ID string `json:"id"`
		} `json:"pools"`
	} `json:"tokens"`
}

// Service provides methods for working with coins
type Service struct {
	raydiumClient *RaydiumClient
	jupiterClient *JupiterClient
	coins         map[string]model.Coin // Simple in-memory storage
}

// NewService creates a new coin service
func NewService() *Service {
	service := &Service{
		raydiumClient: NewRaydiumClient(),
		jupiterClient: NewJupiterClient(),
		coins:         make(map[string]model.Coin),
	}

	// Load initial data but don't block or fail if it doesn't work
	err := service.refreshCoins()
	if err != nil {
		log.Printf("Error initializing coin service: %v", err)
	}

	return service
}

// GetCoins returns a list of all available coins
func (s *Service) GetCoins(ctx context.Context) ([]model.Coin, error) {
	// Convert map to slice
	coins := make([]model.Coin, 0, len(s.coins))
	for _, coin := range s.coins {
		coins = append(coins, coin)
	}
	return coins, nil
}

// GetCoinByID returns a coin by its ID
func (s *Service) GetCoinByID(ctx context.Context, id string) (*model.Coin, error) {
	// Check if coin exists in memory
	if coin, exists := s.coins[id]; exists {
		return &coin, nil
	}

	// Try to fetch from Jupiter API if not in memory
	fetchedCoin, err := s.fetchCoinFromExternal(id)
	if err != nil {
		return nil, fmt.Errorf("coin not found: %w", err)
	}

	// Add to memory storage
	s.coins[id] = *fetchedCoin
	return fetchedCoin, nil
}

// GetTokenDetails fetches detailed information about a token from Jupiter API
func (s *Service) GetTokenDetails(ctx context.Context, tokenAddress string) (*JupiterTokenInfoResponse, error) {
	return s.jupiterClient.GetTokenInfo(tokenAddress)
}

// fetchCoinFromExternal fetches coin data from external APIs
func (s *Service) fetchCoinFromExternal(id string) (*model.Coin, error) {
	// Initialize a basic coin with the ID
	coin := model.Coin{
		ID: id,
	}

	// Try to get token info from Jupiter API
	tokenInfo, err := s.jupiterClient.GetTokenInfo(id)
	if err == nil && tokenInfo != nil {
		coin.Name = tokenInfo.Name
		coin.Symbol = tokenInfo.Symbol
	}

	// Try to get price from Jupiter API
	price, err := s.jupiterClient.GetTokenPrice(id)
	if err == nil && price != "" {
		priceFloat, parseErr := strconv.ParseFloat(price, 64)
		if parseErr == nil {
			coin.Price = priceFloat
		}
	}

	// Ensure all required fields are populated
	if coin.ID == "" || coin.Symbol == "" || coin.Name == "" {
		return nil, fmt.Errorf("incomplete coin data retrieved for %s", id)
	}

	return &coin, nil
}

// refreshCoins loads initial coin data from trimmed_mainnet.json and enriches it with Jupiter data
func (s *Service) refreshCoins() error {
	log.Printf("Loading initial coin data from trimmed_mainnet.json")

	// Read the trimmed_mainnet.json file
	jsonPath := filepath.Join("cmd", "trim-mainnet", "trimmed_mainnet.json")
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		return fmt.Errorf("failed to read trimmed_mainnet.json: %w", err)
	}

	// Parse the JSON data
	var tokenList TokenList
	if err := json.Unmarshal(data, &tokenList); err != nil {
		return fmt.Errorf("failed to parse trimmed_mainnet.json: %w", err)
	}

	// Create a new map for coins
	newCoins := make(map[string]model.Coin)

	// Process each token and enrich with Jupiter data
	for _, tokenInfo := range tokenList.Tokens {
		// Create basic coin info from trimmed_mainnet.json
		coin := model.Coin{
			ID:       tokenInfo.Token.Mint,
			Name:     tokenInfo.Token.Name,
			Symbol:   tokenInfo.Token.Symbol,
			Decimals: tokenInfo.Token.Decimals,
		}

		// Enrich with Jupiter data
		if jupiterInfo, err := s.jupiterClient.GetTokenInfo(coin.ID); err == nil && jupiterInfo != nil {
			// Update with any additional info from Jupiter
			if jupiterInfo.LogoURI != "" {
				coin.IconUrl = jupiterInfo.LogoURI
				coin.Tags = jupiterInfo.Tags
				coin.DailyVolume = jupiterInfo.DailyVolume
			}
		}

		// Get price from Jupiter
		if price, err := s.jupiterClient.GetTokenPrice(coin.ID); err == nil && price != "" {
			if priceFloat, err := strconv.ParseFloat(price, 64); err == nil {
				coin.Price = priceFloat
			}
		}

		newCoins[coin.ID] = coin
	}

	// Update internal storage
	s.coins = newCoins

	log.Printf("Successfully loaded %d coins from trimmed_mainnet.json", len(newCoins))
	return nil
}
