package jupiter

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

const (
	// API endpoints
	priceURL     = "https://api.jup.ag/price/v2"
	swapBaseURL  = "https://api.jup.ag/swap/v1"
	tokenInfoURL = "https://api.jup.ag/tokens/v1/token"
	quoteURL     = swapBaseURL + "/quote"
)

// Client handles interactions with the Jupiter API
type Client struct {
	httpClient *http.Client
	cache      *cache
}

type cache struct {
	sync.RWMutex
	data        map[string]*TokenInfoResponse
	lastUpdated time.Time
}

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client) *Client {
	return &Client{
		httpClient: httpClient,
		cache: &cache{
			data: make(map[string]*TokenInfoResponse),
		},
	}
}

// GetTokenInfo fetches detailed information about a token from Jupiter API
func (c *Client) GetTokenInfo(tokenAddress string) (*TokenInfoResponse, error) {
	// Check cache first
	c.cache.RLock()
	if info, exists := c.cache.data[tokenAddress]; exists {
		if time.Since(c.cache.lastUpdated) < 1*time.Hour {
			c.cache.RUnlock()
			return info, nil
		}
	}
	c.cache.RUnlock()

	url := fmt.Sprintf("%s/%s", tokenInfoURL, tokenAddress)
	resp, err := c.httpClient.Get(url)
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

	var tokenInfo TokenInfoResponse
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
func (c *Client) GetTokenPrices(tokenAddresses []string) (map[string]float64, error) {
	if len(tokenAddresses) == 0 {
		return nil, fmt.Errorf("no token addresses provided")
	}

	addressList := strings.Join(tokenAddresses, ",")
	url := fmt.Sprintf("%s?ids=%s", priceURL, addressList)
	log.Printf("🔄 Fetching token prices from Jupiter: %s", url)

	resp, err := c.httpClient.Get(url)
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
func (c *Client) GetQuote(params QuoteParams) (*QuoteResponse, error) {
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

	fullURL := fmt.Sprintf("%s?%s", quoteURL, queryParams.Encode())
	resp, err := c.httpClient.Get(fullURL)
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
