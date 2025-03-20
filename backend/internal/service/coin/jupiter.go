package coin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
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

// GetTokenInfo fetches detailed information about a token from Jupiter API
func (c *JupiterClient) GetTokenInfo(tokenAddress string) (*JupiterTokenInfoResponse, error) {
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

// GetTokenPrice fetches the current price of a token from Jupiter API
func (c *JupiterClient) GetTokenPrice(tokenAddress string) (string, error) {
	url := fmt.Sprintf(jupiterV6APIPriceURL, tokenAddress)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to fetch token price: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch token price, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	var priceResp struct {
		Data map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(body, &priceResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal price response: %w", err)
	}

	if len(priceResp.Data) == 0 {
		return "", fmt.Errorf("no price data found for token: %s", tokenAddress)
	}

	// Get the price for the requested token
	if tokenData, ok := priceResp.Data[tokenAddress]; ok {
		// Handle null case
		if tokenData == nil {
			return "", fmt.Errorf("price data is null for token: %s", tokenAddress)
		}

		// Handle non-null case by type assertion to map
		if priceData, ok := tokenData.(map[string]interface{}); ok {
			if price, ok := priceData["price"].(string); ok {
				return price, nil
			}
		}
	}

	return "", fmt.Errorf("no price data found for token: %s", tokenAddress)
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
