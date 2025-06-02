package jupiter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

const (

	// API endpoints - Keeping these constants for clarity
	priceEndpoint     = "/price/v2"
	swapQuoteEndpoint = "/swap/v1/quote"
	tokenInfoEndpoint = "/tokens/v1/token"
	tokenListEndpoint = "/tokens/v1/all"
	swapEndpoint      = "/swap/v1/swap"
	newTokensEndpoint = "/tokens/v1/new"
)

// Client handles interactions with the Jupiter API
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client, url, key string) ClientAPI {
	return &Client{
		httpClient: httpClient,
		baseURL:    url,
		apiKey:     key,
	}
}

// GetCoinInfo fetches detailed information about a token from Jupiter API
func (c *Client) GetCoinInfo(ctx context.Context, tokenAddress string) (*CoinListInfo, error) {
	url := fmt.Sprintf("%s%s/%s", c.baseURL, tokenInfoEndpoint, tokenAddress) // Inline URL formatting

	var tokenInfo CoinListInfo
	if err := c.GetRequest(ctx, url, &tokenInfo); err != nil { // Use GetRequest
		return nil, fmt.Errorf("failed to get coin info for %s: %w", tokenAddress, err)
	}

	return &tokenInfo, nil
}

// GetCoinPrices fetches prices for one or more tokens from Jupiter API
func (c *Client) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	if len(tokenAddresses) == 0 {
		return nil, fmt.Errorf("no token addresses provided")
	}
	addressList := strings.Join(tokenAddresses, ",")
	url := fmt.Sprintf("%s%s?ids=%s", c.baseURL, priceEndpoint, url.QueryEscape(addressList)) // Inline URL formatting

	log.Printf("🔄 Fetching token prices from Jupiter: %s", url)

	var result PriceResponse
	if err := c.GetRequest(ctx, url, &result); err != nil { // Use GetRequest
		return nil, fmt.Errorf("failed to fetch token prices: %w", err)
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

	fullURL := fmt.Sprintf("%s/swap/v1/quote?%s", c.baseURL, queryParams.Encode())

	// Get raw response first to preserve it
	var rawResponse json.RawMessage
	if err := c.GetRequest(ctx, fullURL, &rawResponse); err != nil {
		return nil, fmt.Errorf("failed to fetch quote: %w", err)
	}

	// Unmarshal to the proper struct
	var quoteResp QuoteResponse
	if err := json.Unmarshal(rawResponse, &quoteResp); err != nil {
		log.Printf("🔄 RAW Jupiter Quote Response: %s", rawResponse)
		return nil, fmt.Errorf("failed to unmarshal quote response: %w", err)
	}

	// Store the raw JSON payload in the struct for later use
	quoteResp.RawPayload = rawResponse

	log.Printf("***************🔄 Raw Jupiter quote payload: %s", string(quoteResp.RawPayload))

	return &quoteResp, nil
}

// GetAllCoins fetches all tokens from Jupiter API
func (c *Client) GetAllCoins(ctx context.Context) (*CoinListResponse, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, tokenListEndpoint) // Inline URL formatting
	log.Printf("🔄 Fetching all tokens from Jupiter: %s", url)

	// Store original timeout and set a longer one for this request
	originalTimeout := c.httpClient.Timeout
	c.httpClient.Timeout = 5 * time.Minute
	defer func() {
		c.httpClient.Timeout = originalTimeout // Restore original timeout
	}()

	var tokens []CoinListInfo
	if err := c.GetRequest(ctx, url, &tokens); err != nil {
		return nil, fmt.Errorf("failed to fetch token list: %w", err)
	}

	return &CoinListResponse{Coins: tokens}, nil
}

// GetNewCoins fetches all new tokens from Jupiter API with optional pagination
func (c *Client) GetNewCoins(ctx context.Context, params *NewCoinsParams) ([]*NewTokenInfo, error) {
	baseURL := fmt.Sprintf("%s%s", c.baseURL, newTokensEndpoint)

	// Add query parameters if provided
	queryParams := url.Values{}
	if params != nil {
		if params.Limit != nil {
			queryParams.Set("limit", strconv.Itoa(*params.Limit))
		}
		if params.Offset != nil {
			queryParams.Set("offset", strconv.Itoa(*params.Offset))
		}
	}

	fullURL := baseURL
	if len(queryParams) > 0 {
		fullURL = baseURL + "?" + queryParams.Encode()
	}

	log.Printf("🔄 Fetching new tokens from Jupiter: %s", fullURL)

	// Use NewTokenInfo struct for the /tokens/v1/new endpoint
	var newTokenResp []NewTokenInfo
	if err := c.GetRequest(ctx, fullURL, &newTokenResp); err != nil {
		return nil, fmt.Errorf("failed to fetch new token list: %w", err)
	}

	// Convert NewTokenInfo to CoinListInfo for compatibility, preserving the CreatedAt timestamp
	coins := make([]*NewTokenInfo, len(newTokenResp))
	for i, newToken := range newTokenResp {
		// Skip empty logo URIs to avoid unnecessary entries
		if len(newToken.LogoURI) == 0 {
			continue
		}
		stdLogoURI := util.StandardizeIpfsUrl(newToken.LogoURI)

		// Parse the CreatedAt timestamp from the Jupiter API response
		var createdAtTime time.Time
		if newToken.CreatedAt != "" {
			unixTimestamp, err := strconv.ParseInt(newToken.CreatedAt, 10, 64)
			if err != nil {
				log.Printf("⚠️ Failed to parse Jupiter CreatedAt timestamp for %s: %v, using current time as fallback", newToken.Mint, err)
				createdAtTime = time.Now() // Use current time as fallback since field is now mandatory
			} else {
				createdAtTime = time.Unix(unixTimestamp, 0)
			}
		} else {
			log.Printf("⚠️ No CreatedAt timestamp provided by Jupiter for %s, using current time as fallback", newToken.Mint)
			createdAtTime = time.Now() // Use current time as fallback since field is now mandatory
		}
		coins[i] = &NewTokenInfo{
			Mint:              newToken.Mint,
			Name:              newToken.Name,
			Symbol:            newToken.Symbol,
			Decimals:          newToken.Decimals,
			LogoURI:           stdLogoURI,
			KnownMarkets:      newToken.KnownMarkets,
			MintAuthority:     newToken.MintAuthority,
			FreezeAuthority:   newToken.FreezeAuthority,
			CreatedAt:         createdAtTime.Format(time.RFC3339),
			MetadataUpdatedAt: newToken.MetadataUpdatedAt,
		}
	}

	return coins, nil
}

// CreateSwapTransaction requests an unsigned swap transaction from Jupiter
func (c *Client) CreateSwapTransaction(ctx context.Context, quoteResp []byte, userPublicKey solanago.PublicKey, feeAccount string) (string, error) {
	// 🪵 LOG: Print the raw quoteResp for debugging
	log.Printf("[JUPITER] quoteResp (raw): %s", string(quoteResp))

	// Unmarshal quoteResp to a map so it is sent as a JSON object, not a string
	var quoteObj map[string]any
	if err := json.Unmarshal(quoteResp, &quoteObj); err != nil {
		return "", fmt.Errorf("failed to unmarshal quoteResp: %w", err)
	}

	swapReqBody := map[string]any{ // Renamed for clarity as this is the request body
		"quoteResponse":           quoteObj, // Pass as object, not []byte
		"userPublicKey":           userPublicKey.String(),
		"wrapUnwrapSOL":           true,
		"dynamicComputeUnitLimit": true,
		"dynamicSlippage":         true,
		"prioritizationFeeLamports": map[string]any{
			"priorityLevelWithMaxLamports": map[string]any{
				"maxLamports":   1000000,
				"priorityLevel": "veryHigh",
			},
		},
	}

	if feeAccount != "" {
		swapReqBody["feeAccount"] = feeAccount
	}

	url := fmt.Sprintf("%s%s", c.baseURL, swapEndpoint) // Inline URL formatting

	// 🪵 LOG: Print the full outgoing payload for debugging
	// Note: PostRequest handles marshaling, so we log the map before marshaling
	log.Printf("[JUPITER] Outgoing swap payload (map), url %s: %+v", url, swapReqBody)

	var swapResp struct {
		SwapTransaction string `json:"swapTransaction"`
	}
	// Use PostRequest for the POST call
	if err := c.PostRequest(ctx, url, swapReqBody, &swapResp); err != nil {
		// PostRequest includes status code and body in error, no need for extra checks here
		return "", fmt.Errorf("swap request failed: %w", err)
	}

	if swapResp.SwapTransaction == "" {
		return "", fmt.Errorf("no swap transaction received from Jupiter")
	}
	return swapResp.SwapTransaction, nil
}

// GetRequest is a helper function to perform an HTTP GET request, check status, and unmarshal response
func (c *Client) GetRequest(ctx context.Context, url string, target any) error {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil) // Method is hardcoded to GET
	if err != nil {
		return fmt.Errorf("failed to create GET request: %w", err)
	}

	// Add common headers here if needed in the future
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	// On free tier, we don't need to add the API key
	if c.apiKey != "" {
		req.Header.Set("x-api-key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to perform GET request to %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GET request to %s failed with status code: %d, body: %s", url, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	if target != nil { // Only attempt unmarshalling if target is provided
		if err := json.Unmarshal(respBody, target); err != nil {
			log.Printf("Failed to unmarshal response from %s: %v, raw body: %s", url, err, string(respBody)) // Log raw body on unmarshal error
			return fmt.Errorf("failed to unmarshal response from %s: %w", url, err)
		}
	}

	return nil
}

// PostRequest is a helper function to perform an HTTP POST request with a JSON body, check status, and unmarshal response
func (c *Client) PostRequest(ctx context.Context, url string, requestBody any, target any) error {
	// Marshal the request body to JSON
	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes)) // Method is hardcoded to POST
	if err != nil {
		return fmt.Errorf("failed to create POST request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	// On free tier, we don't need to add the API key
	if c.apiKey != "" {
		req.Header.Set("x-api-key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to perform POST request to %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("POST request to %s failed with status code: %d, body: %s", url, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	if target != nil { // Only attempt unmarshalling if target is provided
		if err := json.Unmarshal(respBody, target); err != nil {
			log.Printf("Failed to unmarshal response from %s: %v, raw body: %s", url, err, string(respBody)) // Log raw body on unmarshal error
			return fmt.Errorf("failed to unmarshal response from %s: %w", url, err)
		}
	}

	return nil
}
