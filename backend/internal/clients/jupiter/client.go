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

	solanago "github.com/gagliardetto/solana-go"
)

const (
	// Base URL for Jupiter API
	baseURL  = "https://api.jup.ag"
	lightURL = "https://lite-api.jup.ag"

	// API endpoints
	priceURL     = baseURL + "/price/v2"
	swapBaseURL  = baseURL + "/swap/v1"
	tokenInfoURL = baseURL + "/tokens/v1/token"
	tokenListURL = lightURL + "/tokens/v1/all"
	quoteURL     = swapBaseURL + "/quote"
)

// Client handles interactions with the Jupiter API
type Client struct {
	httpClient *http.Client
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

type cache struct {
	sync.RWMutex
	data        map[string]*CoinListInfo
	lastUpdated time.Time
}

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client) ClientAPI {
	return &Client{
		httpClient: httpClient,
	}
}

// GetCoinInfo fetches detailed information about a token from Jupiter API
func (c *Client) GetCoinInfo(ctx context.Context, tokenAddress string) (*CoinListInfo, error) {
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

	var tokenInfo CoinListInfo
	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token info: %w", err)
	}

	return &tokenInfo, nil
}

// GetCoinPrices fetches prices for one or more tokens from Jupiter API
func (c *Client) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
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
		log.Printf("💰 Coin price from Jupiter: %s = %f", addr, price)
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

	// Store the raw JSON payload in the struct for later use
	quoteResp.RawPayload = json.RawMessage(body)

	return &quoteResp, nil
}

// GetAllCoins fetches all tokens from Jupiter API
func (c *Client) GetAllCoins(ctx context.Context) (*CoinListResponse, error) {
	// Use a custom http.Client with a large timeout for this long-running request
	customClient := &http.Client{
		Timeout: 5 * time.Minute,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", tokenListURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	log.Printf("🔄 Fetching all tokens from Jupiter: %s", tokenListURL)

	resp, err := customClient.Do(req)
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

	var tokens []CoinListInfo
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token list: %w", err)
	}

	return &CoinListResponse{Coins: tokens}, nil
}

// CreateSwapTransaction requests an unsigned swap transaction from Jupiter
func (c *Client) CreateSwapTransaction(ctx context.Context, quoteResp []byte, userPublicKey solanago.PublicKey) (string, error) {
	// 🪵 LOG: Print the raw quoteResp for debugging
	log.Printf("[JUPITER] quoteResp (raw): %s", string(quoteResp))

	swapReq := map[string]interface{}{
		"quoteResponse":           quoteResp,
		"userPublicKey":           userPublicKey.String(),
		"wrapUnwrapSOL":           true,
		"dynamicComputeUnitLimit": true,
		"dynamicSlippage":         true,
		"prioritizationFeeLamports": map[string]interface{}{
			"priorityLevelWithMaxLamports": map[string]interface{}{
				"maxLamports":   1000000,
				"priorityLevel": "veryHigh",
			},
		},
	}
	body, err := json.Marshal(swapReq)
	if err != nil {
		return "", fmt.Errorf("failed to marshal swap request: %w", err)
	}

	// 🪵 LOG: Print the full outgoing payload for debugging
	log.Printf("[JUPITER] Outgoing swap payload, url %s: %s", "https://lite-api.jup.ag/swap/v1/swap", string(body))

	req, err := http.NewRequestWithContext(ctx, "POST", "https://lite-api.jup.ag/swap/v1/swap", strings.NewReader(string(body)))
	if err != nil {
		return "", fmt.Errorf("failed to create swap request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send swap request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		log.Printf("[JUPITER] Non-200 response from Jupiter: %s", string(b))
		return "", fmt.Errorf("swap request failed: %s", string(b))
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read swap response body: %w", err)
	}
	log.Printf("[JUPITER] Raw swap response body: %s", string(b))

	var swapResp struct {
		SwapTransaction string `json:"swapTransaction"`
	}
	if err := json.Unmarshal(b, &swapResp); err != nil {
		return "", fmt.Errorf("failed to decode swap response: %w", err)
	}
	if swapResp.SwapTransaction == "" {
		return "", fmt.Errorf("no swap transaction received from Jupiter")
	}
	return swapResp.SwapTransaction, nil
}
