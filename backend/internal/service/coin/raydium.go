package coin

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Raydium API endpoints
const (
	raydiumTokensURL    = "https://api.raydium.io/v2/sdk/token/raydium.mainnet.json"
	raydiumLiquidityURL = "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
	defaultTokenFile    = "cmd/trim-mainnet/trimmed_mainnet.json"
)

// RaydiumClient handles interactions with the Raydium API
type RaydiumClient struct {
	httpClient *http.Client
}

// NewRaydiumClient creates a new instance of RaydiumClient
func NewRaydiumClient() *RaydiumClient {
	return &RaydiumClient{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// FetchTokens fetches the list of tokens from the Raydium API
func (c *RaydiumClient) FetchTokens() (*RaydiumTokenResponse, error) {
	resp, err := c.httpClient.Get(raydiumTokensURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Raydium tokens: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch Raydium tokens, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var tokensResp RaydiumTokenResponse
	if err := json.Unmarshal(body, &tokensResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token response: %w", err)
	}

	return &tokensResp, nil
}

// FetchPools fetches the list of liquidity pools from the Raydium API
func (c *RaydiumClient) FetchPools() (*RaydiumPoolsResponse, error) {
	resp, err := c.httpClient.Get(raydiumLiquidityURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Raydium pools: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch Raydium pools, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var poolsResp RaydiumPoolsResponse
	if err := json.Unmarshal(body, &poolsResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pools response: %w", err)
	}

	return &poolsResp, nil
}

// FindPoolsForToken finds all pools associated with a token by its mint address
func (c *RaydiumClient) FindPoolsForToken(mint string, poolsResp *RaydiumPoolsResponse) []RaydiumPool {
	var matchingPools []RaydiumPool

	// Check official pools
	for _, pool := range poolsResp.Official {
		if pool.BaseMint == mint || pool.QuoteMint == mint {
			matchingPools = append(matchingPools, pool)
		}
	}

	// Check unofficial pools
	for _, pool := range poolsResp.Unofficial {
		if pool.BaseMint == mint || pool.QuoteMint == mint {
			matchingPools = append(matchingPools, pool)
		}
	}

	return matchingPools
}

// LoadTokensFromFile loads token data from the local file cache
func (c *RaydiumClient) LoadTokensFromFile(filePath string) (*TokenPoolInfoList, error) {
	if filePath == "" {
		filePath = defaultTokenFile
	}

	file, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read token file: %w", err)
	}

	var tokenList TokenPoolInfoList
	if err := json.Unmarshal(file, &tokenList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token data: %w", err)
	}

	return &tokenList, nil
}
