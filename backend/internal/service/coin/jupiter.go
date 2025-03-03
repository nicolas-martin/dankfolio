package coin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Jupiter API endpoints
const (
	jupiterAPIBaseURL    = "https://api.jup.ag"
	jupiterTokenInfoURL  = "https://api.jup.ag/tokens/v1/token"
	majorTokensQueryURL  = "https://token.jup.ag/strict"
	jupiterV6APIPriceURL = "https://api.jup.ag/price/v2?ids=%s"
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
