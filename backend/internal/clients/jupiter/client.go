package jupiter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	solanago "github.com/gagliardetto/solana-go"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
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
	tracker    clients.APICallTracker
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client, url, key string, tracker clients.APICallTracker) ClientAPI {
	return &Client{
		httpClient: httpClient,
		baseURL:    url,
		apiKey:     key,
		tracker:    tracker,
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

	slog.Debug("Fetching token prices from Jupiter", "url", url)

	var result PriceResponse
	if err := c.GetRequest(ctx, url, &result); err != nil { // Use GetRequest
		return nil, fmt.Errorf("failed to fetch token prices: %w", err)
	}

	prices := make(map[string]float64)
	for addr, data := range result.Data {
		price, err := strconv.ParseFloat(data.Price, 64)
		if err != nil {
			slog.Warn("Failed to parse price", "address", addr, "error", err)
			continue
		}
		prices[addr] = price
		slog.Debug("Coin price from Jupiter", "address", addr, "price", price)
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
		slog.Error("Failed to unmarshal quote response", "raw_response", string(rawResponse))
		return nil, fmt.Errorf("failed to unmarshal quote response: %w", err)
	}

	// Store the raw JSON payload in the struct for later use
	quoteResp.RawPayload = rawResponse

	slog.Debug("Raw Jupiter quote payload", "payload", string(quoteResp.RawPayload))

	return &quoteResp, nil
}

// GetAllCoins fetches all tokens from Jupiter API
func (c *Client) GetAllCoins(ctx context.Context) (*CoinListResponse, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, tokenListEndpoint) // Inline URL formatting
	slog.Debug("Fetching all tokens from Jupiter", "url", url)

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

// GetSPLTokenPrice fetches the price for a single SPL token using the existing GetCoinPrices method.
func (c *Client) GetSPLTokenPrice(ctx context.Context, tokenAddress string) (float64, error) {
	if tokenAddress == "" {
		return 0, fmt.Errorf("token address cannot be empty")
	}

	prices, err := c.GetCoinPrices(ctx, []string{tokenAddress})
	if err != nil {
		return 0, fmt.Errorf("failed to get price for token %s: %w", tokenAddress, err)
	}

	price, ok := prices[tokenAddress]
	if !ok {
		// This case might indicate the token address is valid but has no price data,
		// or the address itself is not recognized by the API.
		return 0, fmt.Errorf("price not found for token %s", tokenAddress)
	}

	return price, nil
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

	slog.Debug("Fetching new tokens from Jupiter", "url", fullURL)

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
				slog.Warn("Failed to parse Jupiter CreatedAt timestamp",
					"mint", newToken.Mint,
					"error", err,
					"fallback", "using current time")
				createdAtTime = time.Now() // Use current time as fallback since field is now mandatory
			} else {
				createdAtTime = time.Unix(unixTimestamp, 0)
			}
		} else {
			slog.Warn("No CreatedAt timestamp provided by Jupiter",
				"mint", newToken.Mint,
				"fallback", "using current time")
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
	// Log the raw quoteResp for debugging
	slog.Debug("Jupiter quote response (raw)", "payload", string(quoteResp))

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

	// Log the full outgoing payload for debugging
	slog.Debug("Outgoing swap payload", "url", url, "payload", fmt.Sprintf("%+v", swapReqBody))

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
func (c *Client) GetRequest(ctx context.Context, requestURL string, target any) error {
	// Extract endpointName from URL
	parsedURL, err := url.Parse(requestURL)
	if err != nil {
		slog.Error("Failed to parse URL for tracking", "url", requestURL, "error", err)
		// Fallback or decide how to handle error
	} else {
		endpointName := parsedURL.Path
		if endpointName == "" {
			endpointName = "/" // Default if path is empty
		}
		if c.tracker != nil {
			c.tracker.TrackCall("jupiter", endpointName)
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil) // Method is hardcoded to GET
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
		return fmt.Errorf("failed to perform GET request to %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GET request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	if target != nil { // Only attempt unmarshalling if target is provided
		if err := json.Unmarshal(respBody, target); err != nil {
			slog.Error("Failed to unmarshal response",
				"url", requestURL,
				"error", err,
				"raw_body", string(respBody)) // Log raw body on unmarshal error
			return fmt.Errorf("failed to unmarshal response from %s: %w", requestURL, err)
		}
	}

	return nil
}

// PostRequest is a helper function to perform an HTTP POST request with a JSON body, check status, and unmarshal response
func (c *Client) PostRequest(ctx context.Context, requestURL string, requestBody any, target any) error {
	// Extract endpointName from URL
	parsedURL, err := url.Parse(requestURL)
	if err != nil {
		slog.Error("Failed to parse URL for tracking", "url", requestURL, "error", err)
		// Fallback or decide how to handle error
	} else {
		endpointName := parsedURL.Path
		if endpointName == "" {
			endpointName = "/" // Default if path is empty
		}
		if c.tracker != nil {
			c.tracker.TrackCall("jupiter", endpointName)
		}
	}

	// Marshal the request body to JSON
	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", requestURL, bytes.NewReader(bodyBytes)) // Method is hardcoded to POST
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
		return fmt.Errorf("failed to perform POST request to %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("POST request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	if target != nil { // Only attempt unmarshalling if target is provided
		if err := json.Unmarshal(respBody, target); err != nil {
			slog.Error("Failed to unmarshal response",
				"url", requestURL,
				"error", err,
				"raw_body", string(respBody)) // Log raw body on unmarshal error
			return fmt.Errorf("failed to unmarshal response from %s: %w", requestURL, err)
		}
	}

	return nil
}
