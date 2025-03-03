package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
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
	// Initialize a basic coin with the ID
	fetchedCoin := model.Coin{
		ID: id,
	}

	// Enrich with Jupiter data
	s.enrichCoinWithJupiterData(&fetchedCoin)

	// Ensure all required fields are populated
	if fetchedCoin.ID == "" || fetchedCoin.Symbol == "" || fetchedCoin.Name == "" {
		return nil, fmt.Errorf("incomplete coin data retrieved for %s", id)
	}

	// Add to memory storage
	s.coins[id] = fetchedCoin
	return &fetchedCoin, nil
}

// GetTokenDetails fetches detailed information about a token from Jupiter API
func (s *Service) GetTokenDetails(ctx context.Context, tokenAddress string) (*JupiterTokenInfoResponse, error) {
	return s.jupiterClient.GetTokenInfo(tokenAddress)
}

// enrichCoinWithJupiterData enriches a coin with data from Jupiter API
func (s *Service) enrichCoinWithJupiterData(coin *model.Coin) error {
	// Try to get token info from Jupiter API
	jupiterInfo, err := s.jupiterClient.GetTokenInfo(coin.ID)
	if err != nil {
		log.Printf("⚠️ Failed to get Jupiter token info for %s: %v", coin.Symbol, err)
		return err
	}

	log.Printf("✅ Jupiter token info success for %s", coin.Symbol)

	// Update with any additional info from Jupiter
	coin.Name = jupiterInfo.Name
	coin.Symbol = jupiterInfo.Symbol
	coin.Decimals = jupiterInfo.Decimals
	coin.DailyVolume = jupiterInfo.DailyVolume
	coin.Tags = jupiterInfo.Tags
	coin.IconUrl = jupiterInfo.LogoURI

	// Try to get logo URL from Jupiter first
	log.Printf("📊 Updated metadata for %s: DailyVolume=%.2f, Tags=%v, IconUrl=%s, Decimals=%d",
		coin.Symbol, jupiterInfo.DailyVolume, jupiterInfo.Tags, coin.IconUrl, jupiterInfo.Decimals)

	// Try to get price from Jupiter API
	price, err := s.jupiterClient.GetTokenPrice(coin.ID)
	if err == nil && price != "" {
		priceFloat, parseErr := strconv.ParseFloat(price, 64)
		if parseErr != nil {
			log.Printf("⚠️ Failed to parse price for %s: %v", coin.Symbol, parseErr)
			return parseErr
		}
		coin.Price = priceFloat
		log.Printf("💰 Updated price for %s: %v", coin.Symbol, coin.Price)
	} else {
		log.Printf("⚠️ Failed to get Jupiter price for %s: %v", coin.Symbol, err)
	}

	return nil
}

// refreshCoins loads initial coin data from trimmed_mainnet.json and enriches it with Jupiter data
func (s *Service) refreshCoins() error {
	log.Printf("🔄 Starting coin refresh operation")

	// Load tokens from trimmed_mainnet.json
	jsonFile, err := os.Open("cmd/trim-mainnet/trimmed_mainnet.json")
	if err != nil {
		return fmt.Errorf("failed to open token list file: %w", err)
	}
	defer jsonFile.Close()

	var tokenList TokenList
	if err := json.NewDecoder(jsonFile).Decode(&tokenList); err != nil {
		return fmt.Errorf("failed to parse token list: %w", err)
	}

	log.Printf(" Found %d tokens in trimmed_mainnet.json", len(tokenList.Tokens))

	// Clear existing coins
	s.coins = make(map[string]model.Coin)

	// Process each token
	for _, token := range tokenList.Tokens {
		// Create a basic coin from the token info
		coin := model.Coin{
			ID:       token.Token.Mint,
			Symbol:   token.Token.Symbol,
			Name:     token.Token.Name,
			Decimals: token.Token.Decimals,
		}

		log.Printf(" Processing coin %s (%s)", coin.Symbol, coin.ID)

		// Enrich with Jupiter data
		s.enrichCoinWithJupiterData(&coin)

		// Add to storage
		s.coins[coin.ID] = coin
	}

	log.Printf("✨ Successfully refreshed %d coins with Jupiter data", len(s.coins))
	return nil
}
