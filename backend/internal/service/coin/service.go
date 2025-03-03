package coin

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

// Service provides methods to interact with cryptocurrency coins
type Service struct {
	cache         *CoinCache
	raydiumClient *RaydiumClient
	jupiterClient *JupiterClient
}

// NewService creates a new Service instance
func NewService() *Service {
	service := &Service{
		cache:         NewCoinCache(15 * time.Minute),
		raydiumClient: NewRaydiumClient(),
		jupiterClient: NewJupiterClient(),
	}

	// Initialize with data
	err := service.refreshCoins()
	if err != nil {
		log.Printf("Error initializing coin service: %v", err)
	}

	// Start a background goroutine to periodically update the cache
	go func() {
		// Wait a short time for initial setup
		time.Sleep(10 * time.Second)

		// First update with detailed token information
		service.UpdateCoinCache()

		// Then set up periodic refreshes
		ticker := time.NewTicker(service.cache.cacheTTL)
		defer ticker.Stop()

		for range ticker.C {
			service.UpdateCoinCache()
		}
	}()

	return service
}

// GetCoins returns a list of all available coins
func (s *Service) GetCoins(ctx context.Context) ([]model.Coin, error) {
	// Check if we need to refresh the cache
	if s.cache.NeedsRefresh() {
		err := s.refreshCoins()
		if err != nil {
			log.Printf("Error refreshing coins: %v", err)
			// Continue with stale data if we have any
			if s.cache.Size() == 0 {
				return nil, fmt.Errorf("failed to load coins: %w", err)
			}
		}
	}

	return s.cache.GetAll(), nil
}

// GetCoinByID returns a coin by its ID
func (s *Service) GetCoinByID(ctx context.Context, id string) (*model.Coin, error) {
	// Check if coin exists in cache
	coin, found := s.cache.Get(id)
	if found {
		// Return a copy to prevent modification of cached value
		return &coin, nil
	}

	// Try to fetch from external API if not in cache
	fetchedCoin, err := s.fetchCoinFromExternal(id)
	if err != nil {
		return nil, fmt.Errorf("coin not found: %w", err)
	}

	// Add to cache
	s.cache.Set(*fetchedCoin)

	return fetchedCoin, nil
}

// GetTokenDetails fetches detailed information about a token from Jupiter API
func (s *Service) GetTokenDetails(ctx context.Context, tokenAddress string) (*JupiterTokenInfoResponse, error) {
	return s.jupiterClient.GetTokenInfo(tokenAddress)
}

// FetchCoinDetails returns detailed information about a coin
func (s *Service) FetchCoinDetails(ctx context.Context, id string) (*model.Coin, error) {
	// Try to get from cache first
	coin, found := s.cache.Get(id)
	if found {
		return &coin, nil
	}

	// Fetch from external if not in cache
	return s.fetchCoinFromExternal(id)
}

// UpdateCoinCache updates the coin cache with the latest data
func (s *Service) UpdateCoinCache() {
	log.Println("Updating coin cache...")

	// Refresh basic coin data
	err := s.refreshCoins()
	if err != nil {
		log.Printf("Error refreshing coins: %v", err)
		return
	}

	// Add enrichment here if needed
	s.cache.UpdateLastFetch()
	log.Printf("Coin cache updated with %d coins", s.cache.Size())
}

// fetchCoinFromExternal fetches a single coin from external APIs
func (s *Service) fetchCoinFromExternal(id string) (*model.Coin, error) {
	// Get token info from Jupiter API
	tokenInfo, err := s.jupiterClient.GetTokenInfo(id)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token info: %w", err)
	}

	// Create base coin
	coin := tokenInfo.ToCoin()

	// Get price if available
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

// refreshCoins refreshes the coin cache with data from APIs or file
func (s *Service) refreshCoins() error {
	// Try to load tokens info from file first
	tokenList, err := s.raydiumClient.LoadTokensFromFile("")
	if err != nil {
		// If file loading fails, try fetching from APIs
		tokenList, err = s.fetchTokensFromAPI()
		if err != nil {
			return fmt.Errorf("failed to load tokens: %w", err)
		}
	}

	coins := make(map[string]model.Coin)

	// Process each token and convert to Coin
	for _, tokenInfo := range tokenList.Tokens {
		coin := model.Coin{
			ID:      tokenInfo.Token.Mint,
			Symbol:  tokenInfo.Token.Symbol,
			Name:    tokenInfo.Token.Name,
			IconUrl: tokenInfo.Token.LogoURI,
		}

		// Add to the map if not already present
		if _, exists := coins[coin.ID]; !exists {
			coins[coin.ID] = coin
		}
	}

	// Make sure stable coins exist
	s.ensureStableCoinsExist(coins)

	// Update cache with all coins
	s.cache.SetAll(coins)

	return nil
}

// fetchTokensFromAPI fetches token information from various APIs
func (s *Service) fetchTokensFromAPI() (*TokenPoolInfoList, error) {
	// Get tokens from Raydium
	tokensResp, err := s.raydiumClient.FetchTokens()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tokens: %w", err)
	}

	// Get pools from Raydium
	poolsResp, err := s.raydiumClient.FetchPools()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pools: %w", err)
	}

	// Create token pool info list
	result := TokenPoolInfoList{
		Tokens: make([]TokenPoolInfo, 0),
	}

	// Process official tokens
	for _, token := range tokensResp.Official {
		pools := s.raydiumClient.FindPoolsForToken(token.Mint, poolsResp)
		result.Tokens = append(result.Tokens, TokenPoolInfo{
			Token: token,
			Pools: pools,
		})
	}

	// Process unofficial tokens
	for _, token := range tokensResp.Unofficial {
		pools := s.raydiumClient.FindPoolsForToken(token.Mint, poolsResp)
		result.Tokens = append(result.Tokens, TokenPoolInfo{
			Token: token,
			Pools: pools,
		})
	}

	return &result, nil
}

// ensureStableCoinsExist ensures that common stable coins are in the map
func (s *Service) ensureStableCoinsExist(coins map[string]model.Coin) {
	// USDC
	usdcID := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	if _, exists := coins[usdcID]; !exists {
		coins[usdcID] = model.Coin{
			ID:      usdcID,
			Name:    "USD Coin",
			Symbol:  "USDC",
			Price:   1.0,
			IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
		}
	}

	// USDT
	usdtID := "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
	if _, exists := coins[usdtID]; !exists {
		coins[usdtID] = model.Coin{
			ID:      usdtID,
			Name:    "USDT",
			Symbol:  "USDT",
			Price:   1.0,
			IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
		}
	}

	// Bonk
	bonkID := "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
	if _, exists := coins[bonkID]; !exists {
		coins[bonkID] = model.Coin{
			ID:      bonkID,
			Name:    "Bonk",
			Symbol:  "BONK",
			IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png",
		}
	}

	// SOL (Wrapped SOL)
	solID := "So11111111111111111111111111111111111111112"
	if _, exists := coins[solID]; !exists {
		coins[solID] = model.Coin{
			ID:      solID,
			Name:    "Wrapped SOL",
			Symbol:  "SOL",
			IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
		}
	}
}

// GetCacheSize returns the current size of the coin cache
func (s *Service) GetCacheSize() int {
	return s.cache.Size()
}

// initializeWithTestData populates the coin cache with test data
// This is primarily used for testing to avoid external API calls
func (s *Service) initializeWithTestData() {
	coins := make(map[string]model.Coin)

	// Add test coins
	// USDC
	coins["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"] = model.Coin{
		ID:      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
		Name:    "USD Coin",
		Symbol:  "USDC",
		Price:   1.0,
		IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
	}

	// SOL (Wrapped SOL)
	coins["So11111111111111111111111111111111111111112"] = model.Coin{
		ID:      "So11111111111111111111111111111111111111112",
		Name:    "Wrapped SOL",
		Symbol:  "SOL",
		Price:   150.0, // Example price
		IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
	}

	// BONK
	coins["DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"] = model.Coin{
		ID:      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
		Name:    "Bonk",
		Symbol:  "BONK",
		Price:   0.00001, // Example price
		IconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png",
	}

	// Update cache with test coins
	s.cache.SetAll(coins)
	s.cache.UpdateLastFetch()
}

// NewTestService creates a service initialized with test data
func NewTestService() *Service {
	service := &Service{
		cache:         NewCoinCache(15 * time.Minute),
		raydiumClient: NewRaydiumClient(),
		jupiterClient: NewJupiterClient(),
	}

	// Initialize with test data instead of making API calls
	service.initializeWithTestData()

	return service
}
