package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	// SolTokenAddress is the native SOL token address
	SolTokenAddress = "So11111111111111111111111111111111111111112"
	// TrendingTokensFile is the default path to the trending tokens file
	TrendingTokensFile = "cmd/trending/trending_tokens.json"
)

// TrendingToken represents a token from the trending list
type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

// Config holds the configuration for the coin service
type Config struct {
	BirdEyeBaseURL    string
	BirdEyeAPIKey     string
	CoinGeckoAPIKey   string
	TrendingTokenPath string // Optional: override default trending tokens path
}

// Service handles coin-related operations
type Service struct {
	config        *Config
	httpClient    *http.Client
	jupiterClient *JupiterClient
	coins         map[string]model.Coin
}

// NewService creates a new CoinService instance
func NewService(config *Config, httpClient *http.Client, jupiterClient *JupiterClient) *Service {
	service := &Service{
		config:        config,
		httpClient:    httpClient,
		jupiterClient: jupiterClient,
		coins:         make(map[string]model.Coin),
	}

	if err := service.refreshCoins(); err != nil {
		log.Printf("Warning: Error initializing coin service: %v", err)
	}

	return service
}

// GetCoins returns a list of all available coins
func (s *Service) GetCoins(ctx context.Context) ([]model.Coin, error) {
	coins := make([]model.Coin, 0, len(s.coins))
	for _, coin := range s.coins {
		coins = append(coins, coin)
	}

	sort.Slice(coins, func(i, j int) bool {
		return coins[i].DailyVolume > coins[j].DailyVolume
	})

	return coins, nil
}

// GetCoinByID returns a coin by its ID
func (s *Service) GetCoinByID(ctx context.Context, id string) (*model.Coin, error) {
	if coin, exists := s.coins[id]; exists {
		return &coin, nil
	}

	coin := model.Coin{ID: id}
	if err := s.enrichCoinData(&coin); err != nil {
		return nil, fmt.Errorf("failed to fetch coin %s: %w", id, err)
	}

	s.coins[id] = coin
	return &coin, nil
}

// GetTokenDetails fetches detailed information about a token from Jupiter API
func (s *Service) GetTokenDetails(ctx context.Context, tokenAddress string) (*model.Coin, error) {
	return s.GetCoinByID(ctx, tokenAddress)
}

// enrichCoinData enriches a coin with data
// External Services:
// - Jupiter API: Used to fetch token info and current price
// - CoinGecko API: Used to enrich with additional metadata (optional)
func (s *Service) enrichCoinData(coin *model.Coin) error {
	// Get Jupiter data
	jupiterInfo, err := s.jupiterClient.GetTokenInfo(coin.ID)
	if err != nil {
		return fmt.Errorf("failed to get Jupiter info: %w", err)
	}

	// Basic info from Jupiter
	coin.Name = jupiterInfo.Name
	coin.Symbol = jupiterInfo.Symbol
	coin.Decimals = jupiterInfo.Decimals
	coin.DailyVolume = jupiterInfo.DailyVolume
	coin.Tags = jupiterInfo.Tags
	coin.IconUrl = jupiterInfo.LogoURI
	coin.CreatedAt = jupiterInfo.CreatedAt
	coin.Description = fmt.Sprintf("%s (%s) is a Solana token.", jupiterInfo.Name, jupiterInfo.Symbol)

	// Get price from Jupiter
	price, err := s.jupiterClient.GetTokenPrice(coin.ID)
	if err == nil {
		coin.Price = price
	}

	// Try to enrich with CoinGecko data
	if err := s.enrichWithCoinGecko(coin); err != nil {
		log.Printf("Warning: Could not enrich %s with CoinGecko data: %v", coin.Symbol, err)
	}

	return nil
}

// enrichWithCoinGecko enriches a coin with data from CoinGecko API
// External Services:
// - CoinGecko API: Fetches social links, website, and other metadata
// Endpoint: https://api.coingecko.com/api/v3/coins/solana/contract/{address}
func (s *Service) enrichWithCoinGecko(coin *model.Coin) error {
	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.coingecko.com/api/v3/coins/solana/contract/%s", coin.ID), nil)
	if err != nil {
		return err
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-cg-demo-api-key", s.config.CoinGeckoAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var geckoData CoinGeckoMetadata
	if err := json.NewDecoder(resp.Body).Decode(&geckoData); err != nil {
		return err
	}

	if len(geckoData.Links.Homepage) > 0 {
		coin.Website = geckoData.Links.Homepage[0]
	}
	coin.Twitter = geckoData.Links.TwitterScreenName
	coin.Telegram = geckoData.Links.TelegramChannelIdentifier
	coin.LastUpdated = geckoData.LastUpdated
	coin.CoingeckoID = geckoData.ID

	return nil
}

// refreshCoins updates the coin list from external APIs
// External Services:
// - Jupiter API: Primary source for token info and prices
// - CoinGecko API: Secondary source for additional metadata
// - Local file: Trending tokens list from cmd/trending/trending_tokens.json
func (s *Service) refreshCoins() error {
	if os.Getenv("APP_ENV") == "development" {
		for _, coin := range MockCoins {
			s.coins[coin.ID] = coin
		}
		return nil
	}

	// Load trending tokens from local file (includes SOL)
	trending, err := s.loadTrendingTokens()
	if err != nil {
		return fmt.Errorf("failed to load trending tokens: %w", err)
	}

	// Enrich each trending token with Jupiter and CoinGecko data
	for _, t := range trending {
		coin := model.Coin{
			ID:          t.Mint,
			Symbol:      t.Symbol,
			DailyVolume: t.Volume,
		}

		if err := s.enrichCoinData(&coin); err != nil {
			log.Printf("Warning: Error enriching token %s: %v", t.Symbol, err)
			continue
		}

		s.coins[t.Mint] = coin
	}

	return nil
}

// findWorkspaceRoot attempts to find the workspace root by looking for trending_tokens.json
// in parent directories up to maxDepth levels
func findWorkspaceRoot(startDir string, maxDepth int) (string, error) {
	currentDir := startDir
	for i := 0; i < maxDepth; i++ {
		// Try the current directory
		possiblePath := filepath.Join(currentDir, TrendingTokensFile)
		if _, err := os.Stat(possiblePath); err == nil {
			return currentDir, nil
		}

		// Try backend directory (common when running from a subdirectory)
		backendPath := filepath.Join(currentDir, "backend", TrendingTokensFile)
		if _, err := os.Stat(backendPath); err == nil {
			return filepath.Dir(filepath.Dir(backendPath)), nil
		}

		// Move up one directory
		parent := filepath.Dir(currentDir)
		if parent == currentDir {
			break // Reached root directory
		}
		currentDir = parent
	}
	return "", fmt.Errorf("workspace root not found within %d levels", maxDepth)
}

// loadTrendingTokens loads the list of trending tokens from a local JSON file
func (s *Service) loadTrendingTokens() ([]TrendingToken, error) {
	var filePath string

	// Try config path first
	if s.config.TrendingTokenPath != "" {
		if _, err := os.Stat(s.config.TrendingTokenPath); err == nil {
			filePath = s.config.TrendingTokenPath
		}
	}

	// Try WORKSPACE_ROOT environment variable
	if filePath == "" && os.Getenv("WORKSPACE_ROOT") != "" {
		path := filepath.Join(os.Getenv("WORKSPACE_ROOT"), TrendingTokensFile)
		if _, err := os.Stat(path); err == nil {
			filePath = path
		}
	}

	// Try to find workspace root from current directory
	if filePath == "" {
		wd, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("failed to get working directory: %w", err)
		}

		root, err := findWorkspaceRoot(wd, 5) // Look up to 5 levels up
		if err == nil {
			filePath = filepath.Join(root, TrendingTokensFile)
		}
	}

	// If still not found, try relative to executable path
	if filePath == "" {
		execPath, err := os.Executable()
		if err == nil {
			execDir := filepath.Dir(execPath)
			root, err := findWorkspaceRoot(execDir, 5)
			if err == nil {
				filePath = filepath.Join(root, TrendingTokensFile)
			}
		}
	}

	if filePath == "" {
		return nil, fmt.Errorf("trending tokens file not found in any location")
	}

	// Read and parse the file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read trending tokens file: %w", err)
	}

	var trending []TrendingToken
	if err := json.Unmarshal(data, &trending); err != nil {
		return nil, fmt.Errorf("failed to parse trending tokens: %w", err)
	}

	return trending, nil
}
