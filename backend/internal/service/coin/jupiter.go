package coin

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TokenMetadataCache represents a cache for token metadata
type TokenMetadataCache struct {
	sync.RWMutex
	data        map[string]*JupiterTokenInfoResponse
	lastUpdated time.Time
}

var tokenInfoCache *TokenMetadataCache

// JupiterClient handles interactions with the Jupiter API
type JupiterClient struct {
	httpClient *http.Client
}

// NewJupiterClient creates a new instance of JupiterClient
func NewJupiterClient() *JupiterClient {
	// Initialize the cache if it doesn't exist
	if tokenInfoCache == nil {
		tokenInfoCache = &TokenMetadataCache{
			data: make(map[string]*JupiterTokenInfoResponse),
		}
	}

	return &JupiterClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetTokenInfo fetches detailed information about a token from Jupiter API
func (c *JupiterClient) GetTokenInfo(tokenAddress string) (*JupiterTokenInfoResponse, error) {
	// Try to get from cached metadata first
	tokenInfoCache.RLock()
	if time.Since(tokenInfoCache.lastUpdated) < 5*time.Minute {
		if metadata, ok := tokenInfoCache.data[tokenAddress]; ok {
			tokenInfoCache.RUnlock()
			return metadata, nil
		}
	}
	tokenInfoCache.RUnlock()

	// If not in cache or cache expired, fetch directly
	url := fmt.Sprintf("%s/%s", jupiterTokenInfoURL, tokenAddress)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("token not found: %s", tokenAddress)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch token info, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var tokenInfo JupiterTokenInfoResponse
	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token info: %w", err)
	}

	// Update cache
	tokenInfoCache.Lock()
	tokenInfoCache.data[tokenAddress] = &tokenInfo
	tokenInfoCache.lastUpdated = time.Now()
	tokenInfoCache.Unlock()

	return &tokenInfo, nil
}

// GetTokenPrices fetches prices for one or more tokens from Jupiter API
func (c *JupiterClient) GetTokenPrices(tokenAddresses []string) (map[string]float64, error) {
	// Handle empty input
	if len(tokenAddresses) == 0 {
		return nil, fmt.Errorf("no token addresses provided")
	}

	// Join addresses with comma
	addressList := strings.Join(tokenAddresses, ",")

	// Make request
	url := fmt.Sprintf("%s?ids=%s", jupiterPriceURL, addressList)
	log.Printf("🔄 Fetching token prices from Jupiter: %s", url)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token prices: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch token prices, status: %d", resp.StatusCode)
	}

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	log.Printf("🔄 Raw Jupiter price response: %s", string(body))

	// Parse response using the correct model
	var result JupiterPriceResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal price response: %w", err)
	}

	// Extract prices
	prices := make(map[string]float64)
	for addr, data := range result.Data {
		price, err := strconv.ParseFloat(data.Price, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse price for token %s: %w", addr, err)
		}
		log.Printf("💰 Token price from Jupiter: %s = %f", addr, price)
		prices[addr] = price
	}

	return prices, nil
}

// GetQuote fetches a swap quote from Jupiter API
func (c *JupiterClient) GetQuote(params QuoteParams) (*JupiterQuoteResponse, error) {
	// Build query parameters
	queryParams := url.Values{}
	if strings.Contains(params.Amount, ".") {
		return nil, fmt.Errorf("amount cannot contain any decimal points")
	}

	if params.Amount == "0" {
		return nil, fmt.Errorf("amount cannot be 0")
	}

	// Required parameters
	queryParams.Add("inputMint", params.InputMint)
	queryParams.Add("outputMint", params.OutputMint)
	queryParams.Add("amount", params.Amount)

	queryParams.Add("slippageBps", params.SlippageBps)

	if params.SwapMode == "" {
		params.SwapMode = "ExactIn" // Default swap mode
	}
	queryParams.Add("swapMode", params.SwapMode)

	// Optional parameters
	if len(params.Dexes) > 0 {
		queryParams.Add("dexes", joinStrings(params.Dexes))
	}

	if len(params.ExcludeDexes) > 0 {
		queryParams.Add("excludeDexes", joinStrings(params.ExcludeDexes))
	}

	if params.RestrictIntermediateTokens {
		queryParams.Add("restrictIntermediateTokens", "true")
	}

	if params.OnlyDirectRoutes {
		queryParams.Add("onlyDirectRoutes", "true")
	}

	if params.AsLegacyTransaction {
		queryParams.Add("asLegacyTransaction", "true")
	}

	if params.PlatformFeeBps > 0 {
		queryParams.Add("platformFeeBps", fmt.Sprintf("%d", params.PlatformFeeBps))
	}

	if params.MaxAccounts > 0 {
		queryParams.Add("maxAccounts", fmt.Sprintf("%d", params.MaxAccounts))
	}

	// Construct the full URL with query parameters
	fullURL := fmt.Sprintf("%s?%s", jupiterQuoteURL, queryParams.Encode())

	// Make the request
	resp, err := c.httpClient.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quote: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch quote, status: %d, body: %s, url: %s", resp.StatusCode, string(body), fullURL)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var quoteResp JupiterQuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal quote response: %w", err)
	}

	// Log the quote response
	log.Printf("🔄 RAW Jupiter Quote Response: %s", body)

	return &quoteResp, nil
}

// Helper function to join string slices with commas
func joinStrings(strs []string) string {
	if len(strs) == 0 {
		return ""
	}

	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += "," + strs[i]
	}
	return result
}
