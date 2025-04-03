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
	"strings"
	"sync"
	"time"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/blocto/solana-go-sdk/rpc"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	// TrendingTokensFile is the default path to the trending tokens file
	TrendingTokensFile = "cmd/trending/trending_tokens.json"
	// CacheExpiration is the duration for which cached data is valid
	CacheExpiration = 5 * time.Minute
)

// Config holds the configuration for the coin service
type Config struct {
	BirdEyeBaseURL    string
	BirdEyeAPIKey     string
	TrendingTokenPath string // Optional: override default trending tokens path
	CoinGeckoAPIKey   string // Uncomment when needed
}

// Cache represents a cached item with expiration
type Cache struct {
	Data       interface{}
	Expiration time.Time
}

// TrendingToken represents a token from the trending list
type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

// Service handles coin-related operations
type Service struct {
	config        *Config
	httpClient    *http.Client
	jupiterClient *JupiterClient
	coins         map[string]model.Coin
	cache         map[string]Cache
	mu            sync.RWMutex
}

// NewService creates a new CoinService instance
func NewService(config *Config, httpClient *http.Client, jupiterClient *JupiterClient) *Service {
	service := &Service{
		config:        config,
		httpClient:    httpClient,
		jupiterClient: jupiterClient,
		coins:         make(map[string]model.Coin),
		cache:         make(map[string]Cache),
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
	s.mu.RLock()
	coin, exists := s.coins[id]
	s.mu.RUnlock()

	if exists {
		// Even if the coin exists, we need to ensure it's enriched
		if err := s.enrichCoin(&coin); err != nil {
			return nil, fmt.Errorf("failed to enrich existing coin %s: %w", id, err)
		}
		s.mu.Lock()
		s.coins[id] = coin // Store the enriched version back
		s.mu.Unlock()
		return &coin, nil
	}

	coin = model.Coin{ID: id}
	if err := s.enrichCoin(&coin); err != nil {
		return nil, fmt.Errorf("failed to fetch coin %s: %w", id, err)
	}

	s.mu.Lock()
	s.coins[id] = coin
	s.mu.Unlock()
	return &coin, nil
}

// GetTokenDetails fetches detailed information about a token
func (s *Service) GetTokenDetails(ctx context.Context, tokenAddress string) (*model.Coin, error) {
	return s.GetCoinByID(ctx, tokenAddress)
}

// enrichCoin enriches a coin with data from Jupiter and IPFS
func (s *Service) enrichCoin(coin *model.Coin) error {
	// Check cache first
	s.mu.RLock()
	if cached, exists := s.cache[coin.ID]; exists && time.Now().Before(cached.Expiration) {
		if cachedCoin, ok := cached.Data.(model.Coin); ok {
			*coin = cachedCoin // Copy all fields from cached coin
			s.mu.RUnlock()
			return nil
		}
	}
	s.mu.RUnlock()

	// Get Jupiter data for basic info
	log.Printf("Fetching Jupiter token info for %s (%s)", coin.Symbol, coin.ID)
	jupiterInfo, err := s.jupiterClient.GetTokenInfo(coin.ID)
	if err != nil {
		return fmt.Errorf("failed to get Jupiter info: %w", err)
	}
	log.Printf("Got Jupiter token info for %s: %s (%s)", coin.ID, jupiterInfo.Name, jupiterInfo.Symbol)

	// Basic info from Jupiter
	coin.Name = jupiterInfo.Name
	coin.Symbol = jupiterInfo.Symbol
	coin.Decimals = jupiterInfo.Decimals
	coin.DailyVolume = jupiterInfo.DailyVolume
	coin.Tags = jupiterInfo.Tags
	coin.IconUrl = jupiterInfo.LogoURI
	coin.CreatedAt = jupiterInfo.CreatedAt

	// Get price from Jupiter
	log.Printf("Fetching Jupiter price for %s (%s)", coin.Symbol, coin.ID)
	price, err := s.jupiterClient.GetTokenPrice(coin.ID)
	if err != nil {
		log.Printf("Warning: Error fetching price for %s: %v", coin.ID, err)
	} else {
		coin.Price = price
		log.Printf("Got Jupiter price for %s: %f", coin.ID, price)
	}

	// Get metadata account for the token
	metadataAccount, err := s.getMetadataAccount(coin.ID)
	if err != nil {
		log.Printf("Warning: Error fetching metadata for %s: %v", coin.ID, err)
		return nil // Not all tokens have metadata, so this is not a fatal error
	}

	// Fetch off-chain metadata
	uri := resolveIPFSGateway(metadataAccount.Data.Uri)
	metadata, err := fetchOffChainMetadataWithFallback(uri)
	if err != nil {
		log.Printf("Warning: Error fetching off-chain metadata for %s: %v", coin.ID, err)
	}

	// Enrich with metadata
	s.enrichFromMetadata(coin, metadata)

	// Cache the fully enriched coin
	s.mu.Lock()
	s.cache[coin.ID] = Cache{
		Data:       *coin,
		Expiration: time.Now().Add(CacheExpiration),
	}
	s.mu.Unlock()

	return nil
}

// enrichFromMetadata updates coin fields from metadata
func (s *Service) enrichFromMetadata(coin *model.Coin, metadata map[string]interface{}) {
	if description, ok := metadata["description"].(string); ok {
		coin.Description = description
	} else {
		coin.Description = fmt.Sprintf("%s (%s) is a Solana token.", coin.Name, coin.Symbol)
	}

	// Handle website field with multiple possible names
	if website, ok := metadata["website"].(string); ok {
		coin.Website = website
	} else if website, ok := metadata["external_url"].(string); ok {
		coin.Website = website
	} else if website, ok := metadata["createdOn"].(string); ok {
		coin.Website = website
	}

	// Image/Icon URL (only if not set by Jupiter)
	if coin.IconUrl == "" {
		if image, ok := metadata["image"].(string); ok {
			coin.IconUrl = image
		}
	}

	// Social links
	if twitter, ok := metadata["twitter"].(string); ok {
		coin.Twitter = twitter
	}
	if telegram, ok := metadata["telegram"].(string); ok {
		coin.Telegram = telegram
	}

	// Check attributes array as fallback
	if attributes, ok := metadata["attributes"].([]interface{}); ok {
		for _, attr := range attributes {
			if attrMap, ok := attr.(map[string]interface{}); ok {
				trait := fmt.Sprintf("%v", attrMap["trait_type"])
				value := fmt.Sprintf("%v", attrMap["value"])
				switch strings.ToLower(trait) {
				case "twitter":
					if coin.Twitter == "" {
						coin.Twitter = value
					}
				case "telegram":
					if coin.Telegram == "" {
						coin.Telegram = value
					}
				}
			}
		}
	}
}

// refreshCoins updates the coin list from external APIs
func (s *Service) refreshCoins() error {
	if os.Getenv("APP_ENV") == "development" {
		for _, coin := range MockCoins {
			s.coins[coin.ID] = coin
		}
		return nil
	}

	// Load trending tokens from local file
	trending, err := s.loadTrendingTokens()
	if err != nil {
		return fmt.Errorf("failed to load trending tokens: %w", err)
	}

	newCoins := make(map[string]model.Coin)

	// Load and enrich each trending token
	for _, t := range trending {
		coin := model.Coin{
			ID:          t.Mint,
			Symbol:      t.Symbol,
			DailyVolume: t.Volume,
		}

		if err := s.enrichCoin(&coin); err != nil {
			log.Printf("Warning: Error enriching token %s: %v", t.Symbol, err)
			continue
		}

		newCoins[t.Mint] = coin
	}

	s.mu.Lock()
	s.coins = newCoins
	s.mu.Unlock()

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

// resolveIPFSGateway rewrites the URI if it uses a known gateway that might be unreliable.
func resolveIPFSGateway(uri string) string {
	if strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			cid := parts[1]
			return "ipfs://" + cid
		}
	}
	return uri
}

// fetchOffChainMetadataWithFallback attempts to fetch off-chain metadata
// using a list of HTTP gateways as fallback for IPFS content.
func fetchOffChainMetadataWithFallback(uri string) (map[string]interface{}, error) {
	var offchainMeta map[string]interface{}

	if strings.HasPrefix(uri, "ipfs://") {
		cid := strings.TrimPrefix(uri, "ipfs://")
		gateways := []string{
			"https://ipfs.io/ipfs/",
			"https://dweb.link/ipfs/",
			"https://cloudflare-ipfs.com/ipfs/",
		}
		var err error
		for _, gw := range gateways {
			fullURL := gw + cid
			log.Printf("Attempting gateway: %s", fullURL)
			offchainMeta, err = fetchOffChainMetadataHTTP(fullURL)
			if err == nil {
				return offchainMeta, nil
			}
			log.Printf("Gateway %s failed: %v", gw, err)
		}
		return nil, err
	}

	if strings.HasPrefix(uri, "http") {
		return fetchOffChainMetadataHTTP(uri)
	}

	return nil, nil
}

// fetchOffChainMetadataHTTP fetches JSON metadata from the given HTTP URL.
func fetchOffChainMetadataHTTP(url string) (map[string]interface{}, error) {
	var offchainMeta map[string]interface{}
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status %d", resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(&offchainMeta); err != nil {
		return nil, err
	}
	return offchainMeta, nil
}

// getMetadataAccount retrieves the metadata account for a token
func (s *Service) getMetadataAccount(mint string) (*token_metadata.Metadata, error) {
	mintPubkey := common.PublicKeyFromString(mint)
	metadataAccount, err := token_metadata.GetTokenMetaPubkey(mintPubkey)
	if err != nil {
		return nil, fmt.Errorf("failed to get metadata account: %w", err)
	}

	c := client.NewClient(rpc.MainnetRPCEndpoint)
	accountInfo, err := c.GetAccountInfo(context.Background(), metadataAccount.ToBase58())
	if err != nil {
		return nil, fmt.Errorf("failed to get account info: %w", err)
	}

	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	return &metadata, nil
}

// enrichWithCoinGecko enriches a coin with data from CoinGecko API
// External Services:
// - CoinGecko API: Fetches social links, website, and other metadata
// Endpoint: https://api.coingecko.com/api/v3/coins/solana/contract/{address}
func (s *Service) enrichWithCoinGecko(coin *model.Coin) error {
	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.coingecko.com/api/v3/coins/solana/contract/%s", coin.ID), nil)
	if err != nil {
		return fmt.Errorf("failed to create coingecko request for %s: %w", coin.ID, err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-cg-demo-api-key", s.config.CoinGeckoAPIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute coingecko request for %s: %w", coin.ID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code %d from coingecko for %s (%s)", resp.StatusCode, coin.ID, req.URL.String())
	}

	var geckoData CoinGeckoMetadata
	if err := json.NewDecoder(resp.Body).Decode(&geckoData); err != nil {
		return fmt.Errorf("failed to decode coingecko response for %s: %w", coin.ID, err)
	}

	if len(geckoData.Links.Homepage) > 0 {
		coin.Website = geckoData.Links.Homepage[0]
	}
	coin.Twitter = geckoData.Links.TwitterScreenName
	coin.Telegram = geckoData.Links.TelegramChannelIdentifier
	coin.LastUpdated = geckoData.LastUpdated

	return nil
}
