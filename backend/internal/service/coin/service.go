package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	// SolTokenAddress is the native SOL token address
	SolTokenAddress = "So11111111111111111111111111111111111111112"
)

// Config holds the configuration for the coin service
type Config struct {
	BirdEyeBaseURL  string
	BirdEyeAPIKey   string
	CoinGeckoAPIKey string
}

// Service provides methods for working with coins
type Service struct {
	raydiumClient *RaydiumClient
	jupiterClient *JupiterClient
	coins         map[string]model.Coin // Simple in-memory storage
	config        *Config
	httpClient    *http.Client
}

// NewService creates a new coin service
func NewService(config *Config, httpClient *http.Client) *Service {
	service := &Service{
		raydiumClient: NewRaydiumClient(),
		jupiterClient: NewJupiterClient(),
		coins:         make(map[string]model.Coin),
		config:        config,
		httpClient:    httpClient,
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

	// Sort coins by daily volume in descending order
	sort.Slice(coins, func(i, j int) bool {
		return coins[i].DailyVolume > coins[j].DailyVolume
	})

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
	err := s.enrichCoinWithJupiterData(&fetchedCoin)
	if err != nil {
		log.Printf("Warning: Error enriching coin data for %s: %v", id, err)
		return nil, fmt.Errorf("coin not found: %s", id)
	}

	// Ensure all required fields are populated
	if fetchedCoin.ID == "" || fetchedCoin.Symbol == "" || fetchedCoin.Name == "" {
		return nil, fmt.Errorf("coin not found: %s", id)
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
		log.Printf("❌ Failed to get Jupiter token info for %s: %v", coin.Symbol, err)
		return err
	}

	log.Printf("✅ Jupiter token info success for %s", coin.Symbol)

	// Update with any additional info from Jupiter
	coin.Name = jupiterInfo.Name
	coin.Symbol = jupiterInfo.Symbol
	coin.Decimals = jupiterInfo.Decimals
	coin.DailyVolume = jupiterInfo.DailyVolume
	coin.Tags = jupiterInfo.Tags

	// Ensure IconUrl is properly set (this is used by the frontend)
	if jupiterInfo.LogoURI != "" {
		coin.IconUrl = jupiterInfo.LogoURI
		log.Printf("🖼️ Set icon URL for %s: %s", coin.Symbol, coin.IconUrl)
	}

	// Set empty description if not already set
	if coin.Description == "" {
		coin.Description = fmt.Sprintf("%s (%s) is a Solana token.", jupiterInfo.Name, jupiterInfo.Symbol)
		log.Printf("📝 Set default description for %s", coin.Symbol)
	}

	// Log metadata update
	log.Printf("📊 Updated metadata for %s: DailyVolume=%.2f, Tags=%v, IconUrl=%s, Decimals=%d",
		coin.Symbol, jupiterInfo.DailyVolume, jupiterInfo.Tags, coin.IconUrl, jupiterInfo.Decimals)

	// Try to get price from Jupiter API
	price, err := s.jupiterClient.GetTokenPrice(coin.ID)
	if err == nil && price != "" {
		priceFloat, parseErr := strconv.ParseFloat(price, 64)
		if parseErr != nil {
			log.Printf("⚠️ Failed to parse price for %s: %v", coin.Symbol, parseErr)
		} else {
			coin.Price = priceFloat
			log.Printf("💰 Updated price for %s: %v", coin.Symbol, coin.Price)
		}
	} else {
		log.Printf("⚠️ No price data available for %s, setting default price", coin.Symbol)
		// Set a default price of 0 to avoid frontend issues
		coin.Price = 0
	}

	return nil
}

// initializeSolData creates and enriches SOL coin data
func (s *Service) initializeSolData() error {
	// Create basic SOL coin
	solCoin := model.Coin{
		ID:       SolTokenAddress,
		Symbol:   "SOL",
		Name:     "Solana",
		Decimals: 9, // SOL has 9 decimals
	}

	// Enrich with Jupiter data
	err := s.enrichCoinWithJupiterData(&solCoin)
	if err != nil {
		log.Printf("⚠️ Warning: Error enriching SOL data: %v", err)
		// Continue anyway as we have basic data
	}

	// Set a default description if not set by Jupiter
	if solCoin.Description == "" {
		solCoin.Description = "SOL is the native token of the Solana blockchain."
	}

	// Add to storage
	s.coins[SolTokenAddress] = solCoin
	log.Printf("✨ Added SOL to coin list with price: %v", solCoin.Price)

	return nil
}

// refreshCoins loads initial coin data from trimmed_mainnet.json and enriches it with Jupiter data
func (s *Service) refreshCoins() error {
	log.Printf("🔄 Starting coin refresh operation")

	// First initialize SOL data
	if err := s.initializeSolData(); err != nil {
		log.Printf("❌ Error initializing SOL data: %v", err)
		// Continue with other tokens even if SOL fails
	}

	// Load trending tokens first to get volume data
	trendingTokens := make(map[string]float64)
	trendingFile := "backend/cmd/trending/trending_tokens.json"
	if jsonFile, err := os.Open(trendingFile); err == nil {
		var trending []struct {
			Symbol string  `json:"symbol"`
			Mint   string  `json:"mint"`
			Volume float64 `json:"volume"`
		}
		if err := json.NewDecoder(jsonFile).Decode(&trending); err == nil {
			for _, t := range trending {
				trendingTokens[t.Mint] = t.Volume
				log.Printf("📊 Loaded trending token %s with volume %.2f", t.Symbol, t.Volume)
			}
		}
		jsonFile.Close()
	}

	// Load tokens from trimmed_mainnet.json
	jsonFile, err := os.Open("cmd/trim-mainnet/trimmed_mainnet.json")
	if err != nil {
		// Try with backend prefix
		jsonFile, err = os.Open("backend/cmd/trim-mainnet/trimmed_mainnet.json")
		if err != nil {
			// Try with absolute path from working directory
			wd, _ := os.Getwd()
			jsonFile, err = os.Open(wd + "/cmd/trim-mainnet/trimmed_mainnet.json")
			if err != nil {
				return fmt.Errorf("failed to open token list file: %w", err)
			}
		}
	}
	defer jsonFile.Close()

	var tokenList TokenList
	if err := json.NewDecoder(jsonFile).Decode(&tokenList); err != nil {
		return fmt.Errorf("failed to parse token list: %w", err)
	}

	log.Printf("📝 Found %d tokens in trimmed_mainnet.json", len(tokenList.Tokens))

	// Process each token
	for _, token := range tokenList.Tokens {
		// Create a basic coin from the token info
		coin := model.Coin{
			ID:       token.Token.Mint,
			Symbol:   token.Token.Symbol,
			Name:     token.Token.Name,
			Decimals: token.Token.Decimals,
		}

		// Set volume from trending tokens if available
		if volume, exists := trendingTokens[coin.ID]; exists {
			coin.DailyVolume = volume
			log.Printf("📈 Set volume for %s: %.2f", coin.Symbol, volume)
		}

		log.Printf("🔄 Processing coin %s (%s)", coin.Symbol, coin.ID)

		// Enrich with Jupiter data
		if err := s.enrichCoinWithJupiterData(&coin); err != nil {
			log.Printf("⚠️ Warning: Error enriching %s data: %v", coin.Symbol, err)
			continue
		}

		// Add to storage
		s.coins[coin.ID] = coin
	}

	log.Printf("✨ Successfully refreshed %d coins with Jupiter data", len(s.coins))
	return nil
}

func (s *Service) getCoinBirdeyeMetadata(address string) (*TokenMetadata, error) {
	if address == "" {
		return nil, fmt.Errorf("address is required")
	}

	url := fmt.Sprintf("%s/defi/v3/token/meta-data/single?address=%s", s.config.BirdEyeBaseURL, address)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-chain", "solana")
	req.Header.Set("x-api-key", s.config.BirdEyeAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var response BirdEyeMetadataResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("API returned unsuccessful response")
	}

	metadata := &TokenMetadata{}
	metadata.FromBirdEye(&response.Data)
	return metadata, nil
}

func (s *Service) getCoinGeckoMetadata(address string) (*TokenMetadata, error) {
	if address == "" {
		return nil, fmt.Errorf("address is required")
	}

	url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/solana/contract/%s", address)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-cg-demo-api-key", s.config.CoinGeckoAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("token not found on CoinGecko")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var geckoMetadata CoinGeckoMetadata
	if err := json.NewDecoder(resp.Body).Decode(&geckoMetadata); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	metadata := &TokenMetadata{}
	metadata.FromCoinGecko(&geckoMetadata)
	return metadata, nil
}

// GetCoinMetadata fetches metadata from the default provider (CoinGecko)
func (s *Service) GetCoinMetadata(address string) (*TokenMetadata, error) {
	return s.getCoinGeckoMetadata(address)
}
