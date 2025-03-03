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
	jupiterAPIBaseURL    = "https://price.jup.ag/v2/price"
	jupiterTokenInfoURL  = "https://token.jup.ag/token"
	majorTokensQueryURL  = "https://token.jup.ag/strict"
	jupiterV6APIPriceURL = "https://quote-api.jup.ag/v6/price?ids=%s"
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

	var priceResp JupiterPriceResponse
	if err := json.Unmarshal(body, &priceResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal price response: %w", err)
	}

	// Check if we have price data for this token
	tokenData, found := priceResp.Data[tokenAddress]
	if !found {
		return "", fmt.Errorf("price data not found for token: %s", tokenAddress)
	}

	return tokenData.Price, nil
}

// IsIconAccessible checks if an icon URL is accessible
func (c *JupiterClient) IsIconAccessible(url string) bool {
	if url == "" {
		return false
	}

	// Try a HEAD request first, which is more efficient
	resp, err := c.httpClient.Head(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// Consider 2xx and 3xx response codes as "accessible"
	return resp.StatusCode >= 200 && resp.StatusCode < 400
}

// FixIconURL attempts to correct or update a broken icon URL
func (c *JupiterClient) FixIconURL(coin map[string]interface{}) string {
	id, _ := coin["id"].(string)

	// Try Jupiter token info API first
	tokenInfo, err := c.GetTokenInfo(id)
	if err == nil && tokenInfo.LogoURI != "" && c.IsIconAccessible(tokenInfo.LogoURI) {
		return tokenInfo.LogoURI
	}

	// Try alternatives
	alternatives := []string{
		fmt.Sprintf("https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/%s/logo.png", id),
		fmt.Sprintf("https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/assets/%s/logo.png", id),
		fmt.Sprintf("https://tokens.1sol.io/icons/%s.png", id),
	}

	for _, alt := range alternatives {
		if c.IsIconAccessible(alt) {
			return alt
		}
	}

	return ""
}
