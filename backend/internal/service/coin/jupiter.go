package coin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	jupiterPriceURL         = "https://api.jup.ag/price/v2"
	jupiterTokenMetadataURL = "https://token.jup.ag/strict"
)

// JupiterClient handles interactions with the Jupiter API
type JupiterClient struct {
	httpClient *http.Client
}

// NewJupiterClient creates a new instance of JupiterClient
func NewJupiterClient() *JupiterClient {
	return &JupiterClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// tokenMetadataCache holds the cached token metadata
var tokenMetadataCache struct {
	data        map[string]TokenMetadata
	lastUpdated time.Time
}

// GetTokenMetadata fetches token metadata from Jupiter API
func (c *JupiterClient) GetTokenMetadata(mintAddresses ...string) (map[string]TokenMetadata, error) {
	// Return cached data if it's less than 5 minutes old and we're not requesting specific tokens
	if len(mintAddresses) == 0 && time.Since(tokenMetadataCache.lastUpdated) < 5*time.Minute && len(tokenMetadataCache.data) > 0 {
		return tokenMetadataCache.data, nil
	}

	resp, err := c.httpClient.Get(jupiterTokenMetadataURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token metadata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch token metadata, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// First unmarshal into a temporary struct that matches Jupiter's response format
	var tokens []struct {
		Symbol      string `json:"symbol"`
		Name        string `json:"name"`
		Decimals    uint8  `json:"decimals"`
		LogoURI     string `json:"logoURI"`
		Address     string `json:"address"`
		CoingeckoID string `json:"coingeckoId"`
	}
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token metadata: %w", err)
	}
	fmt.Println(tokens)

	// Convert to our TokenMetadata format
	tokenMap := make(map[string]TokenMetadata)

	// If specific mint addresses are provided, only include those
	if len(mintAddresses) > 0 {
		mintSet := make(map[string]bool)
		for _, addr := range mintAddresses {
			mintSet[addr] = true
		}

		for _, token := range tokens {
			if mintSet[token.Address] {
				tokenMap[token.Address] = TokenMetadata{
					Address:     token.Address,
					Symbol:      token.Symbol,
					Name:        token.Name,
					LogoURL:     token.LogoURI,
					Decimals:    int(token.Decimals),
					CoingeckoID: token.CoingeckoID,
				}
			}
		}
	} else {
		// If no specific addresses provided, include all tokens
		for _, token := range tokens {
			tokenMap[token.Address] = TokenMetadata{
				Address:     token.Address,
				Symbol:      token.Symbol,
				Name:        token.Name,
				LogoURL:     token.LogoURI,
				Decimals:    int(token.Decimals),
				CoingeckoID: token.CoingeckoID,
			}
		}

		// Update cache only when fetching all tokens
		tokenMetadataCache.data = tokenMap
		tokenMetadataCache.lastUpdated = time.Now()
	}

	return tokenMap, nil
}

// GetTokenInfo fetches detailed information about a token from Jupiter API
func (c *JupiterClient) GetTokenInfo(tokenAddress string) (*JupiterTokenInfoResponse, error) {
	// Try to get from cached metadata first
	if time.Since(tokenMetadataCache.lastUpdated) < 5*time.Minute {
		if metadata, ok := tokenMetadataCache.data[tokenAddress]; ok {
			return &JupiterTokenInfoResponse{
				Address:  metadata.Address,
				Symbol:   metadata.Symbol,
				Name:     metadata.Name,
				LogoURI:  metadata.LogoURL,
				Decimals: 0, // We don't have decimals in TokenMetadata
			}, nil
		}
	}

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

	// Parse response
	var result struct {
		Data map[string]struct {
			ID    string `json:"id"`
			Type  string `json:"type"`
			Price string `json:"price"`
		} `json:"data"`
	}
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
		prices[addr] = price
	}

	return prices, nil
}

// GetTokenPrice is a convenience method for getting a single token's price
func (c *JupiterClient) GetTokenPrice(tokenAddress string) (float64, error) {
	prices, err := c.GetTokenPrices([]string{tokenAddress})
	if err != nil {
		return 0, err
	}

	price, ok := prices[tokenAddress]
	if !ok {
		return 0, fmt.Errorf("no price data found for token: %s", tokenAddress)
	}

	return price, nil
}

// GetQuote fetches a swap quote from Jupiter API
func (c *JupiterClient) GetQuote(params QuoteParams) (*JupiterQuoteResponse, error) {
	// Build query parameters
	queryParams := url.Values{}

	// Required parameters
	queryParams.Add("inputMint", params.InputMint)
	queryParams.Add("outputMint", params.OutputMint)
	queryParams.Add("amount", params.Amount)

	// Optional parameters with defaults
	if params.SlippageBps == 0 {
		params.SlippageBps = 50 // Default slippage of 0.5%
	}
	queryParams.Add("slippageBps", fmt.Sprintf("%d", params.SlippageBps))

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
	} else {
		queryParams.Add("maxAccounts", "64") // Jupiter Frontend default
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
		return nil, fmt.Errorf("failed to fetch quote, status: %d, body: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var quoteResp JupiterQuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal quote response: %w", err)
	}

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
