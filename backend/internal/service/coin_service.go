package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

// CoinService handles operations related to cryptocurrency coins
type CoinService struct {
	mu        sync.RWMutex
	coins     map[string]model.Coin
	lastFetch time.Time
	cacheTTL  time.Duration
}

// TokenInfo represents a token from the Raydium API
type TokenInfo struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Mint     string `json:"mint"` // This is the ID we'll use
	Decimals int    `json:"decimals"`
}

// RaydiumPool represents a liquidity pool from the Raydium API
type RaydiumPool struct {
	ID            string `json:"id"`
	BaseMint      string `json:"baseMint"`
	QuoteMint     string `json:"quoteMint"`
	BaseDecimals  int    `json:"baseDecimals"`
	QuoteDecimals int    `json:"quoteDecimals"`
	MarketID      string `json:"marketId"`
}

// TokenPoolInfo combines token information with its pools
type TokenPoolInfo struct {
	Token TokenInfo     `json:"token"`
	Pools []RaydiumPool `json:"pools"`
}

// TokenPoolInfoList represents the JSON structure of our token data file
type TokenPoolInfoList struct {
	Tokens []TokenPoolInfo `json:"tokens"`
}

// Define URLs for external API data
const (
	raydiumTokensURL    = "https://api.raydium.io/v2/sdk/token/raydium.mainnet.json"
	raydiumLiquidityURL = "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
	coinGeckoAPI        = "https://api.coingecko.com/api/v3"
	defaultTokenFile    = "cmd/trim-mainnet/trimmed_mainnet.json"
)

// RaydiumTokenResponse represents the token list API response
type RaydiumTokenResponse struct {
	Official   []TokenInfo `json:"official"`
	Unofficial []TokenInfo `json:"unOfficial"`
}

// RaydiumPoolsResponse represents the pools API response
type RaydiumPoolsResponse struct {
	Name       string        `json:"name"`
	Official   []RaydiumPool `json:"official"`
	Unofficial []RaydiumPool `json:"unOfficial"`
}

// NewCoinService creates a new instance of CoinService
func NewCoinService() *CoinService {
	service := &CoinService{
		coins:    make(map[string]model.Coin),
		cacheTTL: 15 * time.Minute, // Cache data for 15 minutes
	}

	// Initialize the service by loading coins
	go service.refreshCoins()

	return service
}

// GetCoins returns all available coins
func (s *CoinService) GetCoins(ctx context.Context) ([]model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// If data is stale or not initialized, refresh it
	if time.Since(s.lastFetch) > s.cacheTTL || len(s.coins) == 0 {
		s.mu.RUnlock() // Unlock before potentially long operation

		if err := s.refreshCoins(); err != nil {
			return nil, err
		}

		s.mu.RLock() // Lock again to read data
	}

	coins := make([]model.Coin, 0, len(s.coins))
	for _, coin := range s.coins {
		coins = append(coins, coin)
	}

	return coins, nil
}

// GetCoinByID returns a specific coin by its ID (mint address)
func (s *CoinService) GetCoinByID(ctx context.Context, id string) (*model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// If data is stale or not initialized, refresh it
	if time.Since(s.lastFetch) > s.cacheTTL || len(s.coins) == 0 {
		s.mu.RUnlock() // Unlock before potentially long operation

		if err := s.refreshCoins(); err != nil {
			return nil, err
		}

		s.mu.RLock() // Lock again to read data
	}

	coin, exists := s.coins[id]
	if !exists {
		return nil, fmt.Errorf("coin with ID %s not found", id)
	}

	return &coin, nil
}

// refreshCoins updates the coin data from local file or external API
func (s *CoinService) refreshCoins() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// First try to load from local file
	tokenData, err := s.loadTokensFromFile()
	if err != nil {
		// If local file fails, try to fetch from Raydium API
		tokenData, err = s.fetchTokensFromAPI()
		if err != nil {
			return fmt.Errorf("failed to load tokens: %w", err)
		}
	}

	// Process tokens into coins
	newCoins := make(map[string]model.Coin)
	for _, tokenInfo := range tokenData.Tokens {
		// Create basic coin info
		coin := model.Coin{
			ID:     tokenInfo.Token.Mint,
			Name:   tokenInfo.Token.Name,
			Symbol: tokenInfo.Token.Symbol,
			// We'll set default values for now and enrich later
			Price:       0.0,
			Balance:     0.0,
			Change24h:   0.0,
			IconUrl:     fmt.Sprintf("https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/%s/logo.png", tokenInfo.Token.Mint),
			Description: fmt.Sprintf("%s token on Solana blockchain", tokenInfo.Token.Name),
		}

		// Try to enrich with additional data (prices, market data)
		s.enrichCoinData(&coin)

		newCoins[coin.ID] = coin
	}

	// Add some stable coins if they're not already in the list
	s.ensureStableCoinsExist(newCoins)

	// Update the service data
	s.coins = newCoins
	s.lastFetch = time.Now()

	return nil
}

// loadTokensFromFile loads token data from the local JSON file
func (s *CoinService) loadTokensFromFile() (*TokenPoolInfoList, error) {
	// Get the absolute path to the token file
	workingDir, _ := os.Getwd()
	filePath := filepath.Join(workingDir, "backend", defaultTokenFile)

	// Try the direct path first
	fileData, err := os.ReadFile(filePath)
	if err != nil {
		// If that fails, try a relative path (useful for tests or when run from different directories)
		fileData, err = os.ReadFile(defaultTokenFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read token file: %w", err)
		}
	}

	var tokenData TokenPoolInfoList
	if err := json.Unmarshal(fileData, &tokenData); err != nil {
		return nil, fmt.Errorf("failed to parse token data: %w", err)
	}

	return &tokenData, nil
}

// fetchTokensFromAPI fetches token data from the Raydium API
func (s *CoinService) fetchTokensFromAPI() (*TokenPoolInfoList, error) {
	// Fetch tokens from Raydium
	tokenResp, err := s.fetchRaydiumTokens()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tokens from Raydium: %w", err)
	}

	// Fetch pools from Raydium
	poolsResp, err := s.fetchRaydiumPools()
	if err != nil {
		// If pools fetch fails, we can still continue with tokens
		// and just won't have pool information
		log.Printf("Warning: Failed to fetch pools from Raydium: %v", err)
	}

	// Combine tokens and pools
	result := &TokenPoolInfoList{
		Tokens: make([]TokenPoolInfo, 0),
	}

	// Process official tokens
	for _, token := range tokenResp.Official {
		pools := s.findPoolsForToken(token.Mint, poolsResp)
		tokenInfo := TokenPoolInfo{
			Token: token,
			Pools: pools,
		}
		result.Tokens = append(result.Tokens, tokenInfo)
	}

	// Process unofficial tokens (typically memecoins)
	for _, token := range tokenResp.Unofficial {
		pools := s.findPoolsForToken(token.Mint, poolsResp)
		tokenInfo := TokenPoolInfo{
			Token: token,
			Pools: pools,
		}
		result.Tokens = append(result.Tokens, tokenInfo)
	}

	return result, nil
}

// fetchRaydiumTokens fetches token data from the Raydium API
func (s *CoinService) fetchRaydiumTokens() (*RaydiumTokenResponse, error) {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Make the request
	resp, err := client.Get(raydiumTokensURL)
	if err != nil {
		return nil, fmt.Errorf("error making request to Raydium API: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Parse JSON
	var tokenResp RaydiumTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("error parsing response JSON: %w", err)
	}

	return &tokenResp, nil
}

// fetchRaydiumPools fetches liquidity pool data from the Raydium API
func (s *CoinService) fetchRaydiumPools() (*RaydiumPoolsResponse, error) {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Make the request
	resp, err := client.Get(raydiumLiquidityURL)
	if err != nil {
		return nil, fmt.Errorf("error making request to Raydium liquidity API: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	// Parse JSON
	var poolsResp RaydiumPoolsResponse
	if err := json.Unmarshal(body, &poolsResp); err != nil {
		return nil, fmt.Errorf("error parsing pools response JSON: %w", err)
	}

	return &poolsResp, nil
}

// findPoolsForToken finds all pools that contain the specified token
func (s *CoinService) findPoolsForToken(mint string, poolsResp *RaydiumPoolsResponse) []RaydiumPool {
	if poolsResp == nil {
		return []RaydiumPool{}
	}

	pools := make([]RaydiumPool, 0)

	// Check official pools
	for _, pool := range poolsResp.Official {
		if pool.BaseMint == mint || pool.QuoteMint == mint {
			pools = append(pools, pool)
		}
	}

	// Check unofficial pools
	for _, pool := range poolsResp.Unofficial {
		if pool.BaseMint == mint || pool.QuoteMint == mint {
			pools = append(pools, pool)
		}
	}

	return pools
}

// enrichCoinData adds additional data to a coin from external sources
func (s *CoinService) enrichCoinData(coin *model.Coin) {
	// Try to fetch price and market data from external APIs
	// In a real implementation, we'd fetch from CoinGecko or other APIs
	// For now, we'll still use the static data for common coins

	// First try to fetch data from external source
	success := s.enrichCoinFromExternal(coin)

	// If external enrichment fails, use our static data for known coins
	if !success {
		switch coin.Symbol {
		case "SOL":
			coin.Price = 150.0
			coin.Change24h = 5.2
			coin.MarketCap = 28500000000
			coin.Volume24h = 1250000000
			coin.Description = "Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale."
			coin.IconUrl = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png"
		case "USDC":
			coin.Price = 1.0
			coin.Change24h = 0.01
			coin.MarketCap = 33500000000
			coin.Volume24h = 3100000000
			coin.Description = "USD Coin (USDC) is a stablecoin pegged to the US dollar on a 1:1 basis."
			coin.IconUrl = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
		case "USDT":
			coin.Price = 1.0
			coin.Change24h = 0.0
			coin.MarketCap = 83500000000
			coin.Volume24h = 42000000000
			coin.Description = "Tether is a stablecoin pegged to the US dollar on a 1:1 basis."
			coin.IconUrl = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
		default:
			// For all other tokens, set some default values
			// In reality, we would fetch this data from an API
			coin.Price = 0.1 + float64(len(coin.Symbol))*0.01 // Just a mock price based on symbol length
			coin.Change24h = -2.0 + float64(len(coin.Name))*0.5
			coin.MarketCap = 1000000 + float64(len(coin.Name))*100000
			coin.Volume24h = 100000 + float64(len(coin.Symbol))*10000
		}
	}

	// Ensure we set a default icon URL if it's empty
	if coin.IconUrl == "" {
		coin.IconUrl = fmt.Sprintf("https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/%s/logo.png", coin.ID)
	}

	// Ensure we set a default description if it's empty
	if coin.Description == "" {
		coin.Description = fmt.Sprintf("%s (%s) token on Solana blockchain", coin.Name, coin.Symbol)
	}
}

// enrichCoinFromExternal tries to enrich coin data from external APIs
// Returns true if successful, false otherwise
func (s *CoinService) enrichCoinFromExternal(coin *model.Coin) bool {
	// This is a simplified implementation
	// In a real application, this would make API calls to CoinGecko or similar
	// to get price and market data

	// For demonstration purposes, this always returns false to use our static data
	// In a real implementation, you'd do something like:
	/*
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(fmt.Sprintf("%s/coins/markets?vs_currency=usd&ids=%s", coinGeckoAPI, coinID))
		if err != nil {
			return false
		}
		defer resp.Body.Close()

		// Parse response and update coin data
		// ...

		return true
	*/

	// For the purpose of this implementation, we'll just return false
	return false
}

// ensureStableCoinsExist makes sure common stablecoins are in our list
func (s *CoinService) ensureStableCoinsExist(coins map[string]model.Coin) {
	stableCoins := []model.Coin{
		{
			ID:          "So11111111111111111111111111111111111111112",
			Name:        "Solana",
			Symbol:      "SOL",
			Price:       150.0,
			Balance:     0.5,
			Change24h:   5.2,
			MarketCap:   28500000000,
			Volume24h:   1250000000,
			Description: "Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale.",
			IconUrl:     "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
		},
		{
			ID:          "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			Name:        "USD Coin",
			Symbol:      "USDC",
			Price:       1.0,
			Balance:     125.0,
			Change24h:   0.01,
			MarketCap:   33500000000,
			Volume24h:   3100000000,
			Description: "USD Coin (USDC) is a stablecoin pegged to the US dollar on a 1:1 basis.",
			IconUrl:     "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
		},
		{
			ID:          "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
			Name:        "Tether",
			Symbol:      "USDT",
			Price:       1.0,
			Balance:     50.0,
			Change24h:   0.0,
			MarketCap:   83500000000,
			Volume24h:   42000000000,
			Description: "Tether is a stablecoin pegged to the US dollar on a 1:1 basis.",
			IconUrl:     "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
		},
	}

	// Add stable coins if they don't exist
	for _, stableCoin := range stableCoins {
		if _, exists := coins[stableCoin.ID]; !exists {
			coins[stableCoin.ID] = stableCoin
		}
	}
}

// FetchCoinDetails fetches detailed information about a coin from external sources
func (s *CoinService) FetchCoinDetails(ctx context.Context, id string) (*model.Coin, error) {
	// Get the basic coin data first
	coin, err := s.GetCoinByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Try to fetch additional data from external sources
	// For now, this is a placeholder for future implementation
	s.fetchAdditionalCoinDetails(coin)

	return coin, nil
}

// fetchAdditionalCoinDetails fetches additional details like social links, website, etc.
func (s *CoinService) fetchAdditionalCoinDetails(coin *model.Coin) {
	// This is a placeholder for future implementation
	// In a real app, you would fetch social links, website, community info, etc.
	// from relevant APIs

	// Example implementation:
	/*
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(fmt.Sprintf("%s/coins/%s?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true", coinGeckoAPI, coinID))
		if err != nil {
			return
		}
		defer resp.Body.Close()

		// Parse response and update coin data with website, social links, etc.
		// ...
	*/
}
