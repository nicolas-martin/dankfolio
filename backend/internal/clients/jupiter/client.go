package jupiter

import (
	"context"
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

const (
	// Base URL for Jupiter API
	baseURL = "https://api.jup.ag"

	// API endpoints
	priceURL     = baseURL + "/price/v2"
	swapBaseURL  = baseURL + "/swap/v1"
	tokenInfoURL = baseURL + "/tokens/v1/token"
	tokenListURL = baseURL + "/tokens/v1/list"
	quoteURL     = swapBaseURL + "/quote"
)

// Client handles interactions with the Jupiter API
type Client struct {
	httpClient *http.Client
	cache      *cache
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

type cache struct {
	sync.RWMutex
	data        map[string]*TokenListInfo
	lastUpdated time.Time
}

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client) ClientAPI {
	return &Client{
		httpClient: httpClient,
		cache: &cache{
			data: make(map[string]*TokenListInfo),
		},
	}
}

// GetTokenInfo fetches detailed information about a token from Jupiter API
func (c *Client) GetTokenInfo(ctx context.Context, tokenAddress string) (*TokenListInfo, error) {
	// Check cache first
	c.cache.RLock()
	if info, exists := c.cache.data[tokenAddress]; exists {
		if time.Since(c.cache.lastUpdated) < 1*time.Hour {
			c.cache.RUnlock()
			return info, nil
		}
	}
	c.cache.RUnlock()

	url := fmt.Sprintf("%s/tokens/v1/token/%s", baseURL, tokenAddress)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var tokenInfo TokenListInfo
	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token info: %w", err)
	}

	// Update cache
	c.cache.Lock()
	c.cache.data[tokenAddress] = &tokenInfo
	c.cache.lastUpdated = time.Now()
	c.cache.Unlock()

	return &tokenInfo, nil
}

// GetTokenPrices fetches prices for one or more tokens from Jupiter API
func (c *Client) GetTokenPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	if len(tokenAddresses) == 0 {
		return nil, fmt.Errorf("no token addresses provided")
	}

	addressList := strings.Join(tokenAddresses, ",")
	url := fmt.Sprintf("%s/price/v2?ids=%s", baseURL, addressList)
	log.Printf("🔄 Fetching token prices from Jupiter: %s", url)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token prices: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	log.Printf("🔄 Raw Jupiter price response: %s", string(body))

	var result PriceResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal price response: %w", err)
	}

	prices := make(map[string]float64)
	for addr, data := range result.Data {
		price, err := strconv.ParseFloat(data.Price, 64)
		if err != nil {
			log.Printf("WARN: Failed to parse price for %s: %v", addr, err)
			continue
		}
		prices[addr] = price
		log.Printf("💰 Token price from Jupiter: %s = %f", addr, price)
	}

	return prices, nil
}

// GetQuote fetches a swap quote from Jupiter API
func (c *Client) GetQuote(ctx context.Context, params QuoteParams) (*QuoteResponse, error) {
	queryParams := url.Values{}
	queryParams.Set("inputMint", params.InputMint)
	queryParams.Set("outputMint", params.OutputMint)
	queryParams.Set("amount", params.Amount)

	if params.SwapMode != "" {
		queryParams.Set("swapMode", params.SwapMode)
	}
	if params.SlippageBps != 0 {
		queryParams.Set("slippageBps", strconv.Itoa(params.SlippageBps))
	}
	if params.FeeBps != 0 {
		queryParams.Set("feeBps", strconv.Itoa(params.FeeBps))
	}
	if params.OnlyDirectRoutes {
		queryParams.Set("onlyDirectRoutes", "true")
	}
	if params.AsLegacyTransaction {
		queryParams.Set("asLegacyTransaction", "true")
	}

	fullURL := fmt.Sprintf("%s/swap/v1/quote?%s", baseURL, queryParams.Encode())
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quote: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var quoteResp QuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		log.Printf("🔄 RAW Jupiter Quote Response: %s", body)
		return nil, fmt.Errorf("failed to unmarshal quote response: %w", err)
	}

	return &quoteResp, nil
}

// GetAllTokens fetches all tokens from Jupiter API
func (c *Client) GetAllTokens(ctx context.Context) (*TokenListResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", tokenListURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token list: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var tokenList TokenListResponse
	if err := json.Unmarshal(body, &tokenList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token list: %w", err)
	}

	// Update cache
	c.cache.Lock()
	for i := range tokenList.Tokens {
		token := &tokenList.Tokens[i] // Get pointer to token in slice
		c.cache.data[token.Address] = token
	}
	c.cache.lastUpdated = time.Now()
	c.cache.Unlock()

	return &tokenList, nil
}
