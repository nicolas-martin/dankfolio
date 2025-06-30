package birdeye

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

	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

const (
	priceHistoryEndpoint            = "defi/history_price"
	trendingTokensEndpoint          = "defi/token_trending"
	tokenOverviewEndpoint           = "defi/token_overview"
	tokenMetadataMultipleEndpoint   = "defi/v3/token/meta-data/multiple"
	tokenMarketDataMultipleEndpoint = "defi/v3/token/market-data/multiple"
	newListingTokensEndpoint        = "defi/v2/tokens/new_listing"
)

// Client handles interactions with the BirdEye API
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	tracker    telemetry.TelemetryAPI
}

// NewClient creates a new instance of the BirdEye client
func NewClient(httpClient *http.Client, baseURL string, apiKey string, tracker telemetry.TelemetryAPI) ClientAPI {
	return &Client{
		httpClient: httpClient, // Use passed-in httpClient
		baseURL:    baseURL,
		apiKey:     apiKey,
		tracker:    tracker,
	}
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// GetPriceHistory retrieves price history for a given token
func (c *Client) GetPriceHistory(ctx context.Context, params PriceHistoryParams) (*PriceHistory, error) {
	queryParams := url.Values{}
	queryParams.Add("address", params.Address)
	queryParams.Add("address_type", params.AddressType)
	queryParams.Add("type", params.HistoryType)
	queryParams.Add("time_from", strconv.FormatInt(params.TimeFrom.Unix(), 10))
	queryParams.Add("time_to", strconv.FormatInt(params.TimeTo.Unix(), 10))

	fullURL := fmt.Sprintf("%s/%s?%s", c.baseURL, priceHistoryEndpoint, queryParams.Encode())

	priceHistory, err := getRequest[PriceHistory](c, ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get price history: %w", err)
	}

	return priceHistory, nil
}

// GetTrendingTokens retrieves the list of trending tokens from the BirdEye API.
func (c *Client) GetTrendingTokens(ctx context.Context, params TrendingTokensParams) (*TokenTrendingResponse, error) {
	queryParams := url.Values{}

	// Add query parameters if provided
	if params.SortBy != "" {
		queryParams.Add("sort_by", params.SortBy.String())
	}
	if params.SortType != "" {
		queryParams.Add("sort_type", params.SortType.String())
	}
	if params.Offset > 0 {
		queryParams.Add("offset", strconv.Itoa(params.Offset))
	}
	if params.Limit > 0 {
		queryParams.Add("limit", strconv.Itoa(params.Limit))
	}

	var fullURL string
	if len(queryParams) > 0 {
		fullURL = fmt.Sprintf("%s/%s?%s", c.baseURL, trendingTokensEndpoint, queryParams.Encode())
	} else {
		fullURL = fmt.Sprintf("%s/%s", c.baseURL, trendingTokensEndpoint)
	}

	slog.Debug("Fetching trending tokens from BirdEye", "url", fullURL)

	trendingTokensResponse, err := getRequest[TokenTrendingResponse](c, ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get trending tokens: %w", err)
	}

	return trendingTokensResponse, nil
}

// GetTokenOverview retrieves detailed overview information for a specific token from the BirdEye API.
func (c *Client) GetTokenOverview(ctx context.Context, address string) (*TokenOverview, error) {
	queryParams := url.Values{}
	queryParams.Add("address", address)

	// hardcoded to 24h for now
	queryParams.Add("frames", "24h")

	fullURL := fmt.Sprintf("%s/%s?%s", c.baseURL, tokenOverviewEndpoint, queryParams.Encode())

	slog.Debug("Fetching token overview from BirdEye", "url", fullURL, "address", address)

	tokenOverviewResponse, err := getRequest[TokenOverview](c, ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get token overview for %s: %w", address, err)
	}

	return tokenOverviewResponse, nil
}

// GetTokensOverviewBatch retrieves overview information for multiple tokens by combining metadata and market data endpoints
func (c *Client) GetTokensOverviewBatch(ctx context.Context, addresses []string) ([]TokenOverviewData, error) {
	if len(addresses) == 0 {
		return []TokenOverviewData{}, nil
	}

	// Limit batch size to 20 (market data endpoint limit)
	const maxBatchSize = 20
	if len(addresses) > maxBatchSize {
		return nil, fmt.Errorf("batch size %d exceeds maximum allowed %d", len(addresses), maxBatchSize)
	}

	// Build query parameters for both endpoints
	queryParams := url.Values{}
	for _, address := range addresses {
		queryParams.Add("list_address", address)
	}

	// Call both endpoints in parallel
	type metadataResult struct {
		data *TokenMetadataMultiple
		err  error
	}
	type tradeDataResult struct {
		data *TokenTradeDataMultiple
		err  error
	}

	metadataChan := make(chan metadataResult, 1)
	tradeDataChan := make(chan tradeDataResult, 1)

	// Fetch metadata
	go func() {
		metadataURL := fmt.Sprintf("%s/%s?%s", c.baseURL, tokenMetadataMultipleEndpoint, queryParams.Encode())
		slog.Debug("Fetching token metadata from BirdEye", "url", metadataURL, "addresses", addresses)

		metadata, err := getRequest[TokenMetadataMultiple](c, ctx, metadataURL)
		metadataChan <- metadataResult{data: metadata, err: err}
	}()

	// Fetch trade data with 24h timeframe
	go func() {
		tradeDataParams := url.Values{}
		for _, address := range addresses {
			tradeDataParams.Add("list_address", address)
		}
		tradeDataParams.Add("time_from", "24h") // 24 hour window

		tradeDataURL := fmt.Sprintf("%s/%s?%s", c.baseURL, tokenMarketDataMultipleEndpoint, tradeDataParams.Encode())
		slog.Debug("Fetching token trade data from BirdEye", "url", tradeDataURL, "addresses", addresses)

		tradeData, err := getRequest[TokenTradeDataMultiple](c, ctx, tradeDataURL)
		tradeDataChan <- tradeDataResult{data: tradeData, err: err}
	}()

	// Wait for both results
	metadataRes := <-metadataChan
	tradeDataRes := <-tradeDataChan

	if metadataRes.err != nil {
		return nil, fmt.Errorf("failed to get token metadata: %w", metadataRes.err)
	}
	if tradeDataRes.err != nil {
		return nil, fmt.Errorf("failed to get token trade data: %w", tradeDataRes.err)
	}

	// Combine the results
	var results []TokenOverviewData
	for _, address := range addresses {
		metadata, hasMetadata := metadataRes.data.Data[address]
		tradeData, hasTradeData := tradeDataRes.data.Data[address]

		// Skip tokens that don't exist in either response
		if !hasMetadata && !hasTradeData {
			slog.Warn("Token not found in either metadata or trade data", "address", address)
			continue
		}

		// Combine the data into TokenOverviewData format
		tokenData := TokenOverviewData{
			Address: address,
		}

		// Set metadata fields if available
		if hasMetadata {
			tokenData.Name = metadata.Name
			tokenData.Symbol = metadata.Symbol
			tokenData.Decimals = metadata.Decimals
			tokenData.LogoURI = metadata.LogoURI
			tokenData.Tags = metadata.Tags
		}

		// Set trade data fields if available
		if hasTradeData {
			tokenData.Price = tradeData.Price
			tokenData.MarketCap = tradeData.MarketCap
			tokenData.Volume24hUSD = tradeData.Volume24hUSD
			tokenData.Volume24hChangePercent = tradeData.Volume24hChangePercent
			tokenData.Price24hChangePercent = tradeData.Price24hChangePercent
			tokenData.Liquidity = tradeData.Liquidity
			tokenData.FDV = tradeData.FDV
			tokenData.Rank = tradeData.Rank
		}

		results = append(results, tokenData)
	}

	slog.Debug("Successfully combined batch token data", "requested", len(addresses), "found", len(results))
	return results, nil
}

// GetTokensTradeDataBatch retrieves trade data for multiple tokens with 24h timeframe (price, volume, market cap, etc.)
// This is optimized for price updates when we already have token metadata
func (c *Client) GetTokensTradeDataBatch(ctx context.Context, addresses []string) ([]TokenTradeData, error) {
	if len(addresses) == 0 {
		return []TokenTradeData{}, nil
	}

	// Limit batch size to 20 (trade data endpoint limit)
	const maxBatchSize = 20
	if len(addresses) > maxBatchSize {
		return nil, fmt.Errorf("batch size %d exceeds maximum allowed %d", len(addresses), maxBatchSize)
	}

	// Build query parameters with 24h timeframe
	queryParams := url.Values{}
	for _, address := range addresses {
		queryParams.Add("list_address", address)
	}
	queryParams.Add("time_from", "24h") // 24 hour window

	// Fetch trade data only
	tradeDataURL := fmt.Sprintf("%s/%s?%s", c.baseURL, tokenMarketDataMultipleEndpoint, queryParams.Encode())
	slog.Debug("Fetching token trade data from BirdEye", "url", tradeDataURL, "addresses", addresses)

	tradeDataResponse, err := getRequest[TokenTradeDataMultiple](c, ctx, tradeDataURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get token trade data: %w", err)
	}

	// Convert map response to slice, maintaining order
	var results []TokenTradeData
	for _, address := range addresses {
		if tradeData, exists := tradeDataResponse.Data[address]; exists {
			results = append(results, tradeData)
		} else {
			slog.Warn("Token trade data not found", "address", address)
		}
	}

	slog.Debug("Successfully fetched batch trade data", "requested", len(addresses), "found", len(results))
	return results, nil
}

// GetNewListingTokens retrieves newly listed tokens from the BirdEye API
func (c *Client) GetNewListingTokens(ctx context.Context, params NewListingTokensParams) (*NewListingTokensResponse, error) {
	queryParams := url.Values{}

	// Add query parameters if provided, with validation
	if params.Limit > 0 {
		// Limit the maximum to 20 as per API requirements
		if params.Limit > 20 {
			params.Limit = 20
		}
		queryParams.Add("limit", strconv.Itoa(params.Limit))
	} else {
		// Default to 10 if not specified
		queryParams.Add("limit", "10")
	}

	if params.Offset > 0 {
		queryParams.Add("offset", strconv.Itoa(params.Offset))
	}

	if params.TimeTo > 0 {
		queryParams.Add("time_to", strconv.Itoa(params.TimeTo))
	}

	// Add meme platform enabled parameter - this is key to getting new tokens!
	if params.MemePlatformEnabled {
		queryParams.Add("meme_platform_enabled", "true")
	}

	fullURL := fmt.Sprintf("%s/%s?%s", c.baseURL, newListingTokensEndpoint, queryParams.Encode())

	slog.Debug("Fetching new listing tokens from BirdEye", "url", fullURL)

	newListingResponse, err := getRequest[NewListingTokensResponse](c, ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get new listing tokens: %w", err)
	}

	return newListingResponse, nil
}

// Search searches for tokens by keyword
func (c *Client) Search(ctx context.Context, params SearchParams) (*SearchResponse, error) {
	// Build query parameters
	queryParams := url.Values{}

	// Hardcode required parameters
	queryParams.Add("chain", "solana")
	queryParams.Add("target", "token")
	queryParams.Add("verify_token", "true")
	queryParams.Add("search_mode", "fuzzy")
	queryParams.Add("sort_by", "volume_24h_usd")
	queryParams.Add("sort_type", "desc")

	if params.Keyword != "" {
		queryParams.Add("keyword", params.Keyword)
	}

	// Default to combination if not specified
	searchBy := params.SearchBy
	if searchBy == "" {
		searchBy = SearchByCombination
	}
	queryParams.Add("search_by", searchBy.String())

	// Limit defaults to 10, max is 50
	limit := params.Limit
	if limit <= 0 {
		limit = 10
	} else if limit > 50 {
		limit = 50
	}
	queryParams.Add("limit", strconv.Itoa(limit))

	// Offset for pagination
	if params.Offset > 0 {
		queryParams.Add("offset", strconv.Itoa(params.Offset))
	}

	requestURL := fmt.Sprintf("%s/defi/v3/search?%s", c.baseURL, queryParams.Encode())

	slog.DebugContext(ctx, "Searching tokens from BirdEye",
		"url", requestURL,
		"keyword", params.Keyword,
		"searchBy", searchBy.String(),
	)

	searchResponse, err := getRequest[SearchResponse](c, ctx, requestURL)
	if err != nil {
		return nil, fmt.Errorf("failed to search tokens: %w", err)
	}

	// Debug log the response
	tokenCount := 0
	for _, item := range searchResponse.Data.Items {
		if item.Type == "token" {
			tokenCount += len(item.Result)
		}
	}
	slog.DebugContext(ctx, "Birdeye search response",
		"success", searchResponse.Success,
		"itemTypes", len(searchResponse.Data.Items),
		"tokenCount", tokenCount,
	)

	return searchResponse, nil
}

// getRequest is a helper function to perform an HTTP GET request, check status, and unmarshal response
func getRequest[T any](c *Client, ctx context.Context, requestURL string) (*T, error) {
	// Extract endpointName from URL
	parsedURL, err := url.Parse(requestURL)
	if err != nil {
		slog.Error("Failed to parse URL for tracking", "url", requestURL, "error", err)
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	} else {
		endpointName := parsedURL.Path
		if endpointName == "" {
			endpointName = "/"
		}
		if c.tracker != nil {
			c.tracker.TrackCall("birdeye", endpointName)
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create GET request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-KEY", c.apiKey)
	}
	// Set x-chain header as it's used in GetPriceHistory and might be a common requirement for BirdEye
	req.Header.Set("x-chain", "solana")

	slog.Debug("BirdEye GET request details",
		"url", req.URL.String(),
		"headers", fmt.Sprintf("%v", req.Header))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform GET request to %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	if resp.StatusCode != http.StatusOK {
		// Check if response is HTML (common for error pages)
		if util.IsHTMLResponse(respBody) {
			slog.Error("BirdEye GET request failed - received HTML error page",
				"url", requestURL,
				"status_code", resp.StatusCode,
				"content_type", resp.Header.Get("Content-Type"))
			return nil, fmt.Errorf("GET request to %s failed with status code: %d (received HTML error page instead of JSON)", requestURL, resp.StatusCode)
		}

		slog.Error("BirdEye GET request failed",
			"url", requestURL,
			"status_code", resp.StatusCode,
			"body", string(respBody))
		return nil, fmt.Errorf("GET request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	// Check if we received HTML when expecting JSON
	if util.IsHTMLResponse(respBody) {
		slog.Error("BirdEye API returned HTML instead of JSON",
			"url", requestURL,
			"content_type", resp.Header.Get("Content-Type"))
		return nil, fmt.Errorf("BirdEye API returned HTML page instead of JSON data for %s - this may indicate an API endpoint issue or rate limiting", requestURL)
	}

	// Debug log successful response body
	if slog.Default().Enabled(ctx, slog.LevelDebug) {
		bodyForLog := util.TruncateForLogging(string(respBody), 1000)
		slog.DebugContext(ctx, "BirdEye API response",
			"url", requestURL,
			"body_preview", bodyForLog)
	}

	var responseObject T
	if err := json.Unmarshal(respBody, &responseObject); err != nil {
		// Truncate body for logging if it's very long
		bodyForLog := util.TruncateForLogging(string(respBody), 500)

		slog.Error("Failed to unmarshal response from BirdEye GET request",
			"url", requestURL,
			"error", err,
			"body_preview", bodyForLog)
		return nil, fmt.Errorf("failed to unmarshal JSON response from %s: %w", requestURL, err)
	}

	return &responseObject, nil
}

// postRequest is a helper function to perform an HTTP POST request with a JSON body, check status, and unmarshal response
func postRequest[T any](c *Client, ctx context.Context, requestURL string, requestBody any) (*T, error) {
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
			c.tracker.TrackCall("birdeye", endpointName)
		}
	}

	// Marshal the request body to JSON
	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", requestURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create POST request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-KEY", c.apiKey)
	}
	// Set x-chain header, assuming it might be needed for POST requests as well
	req.Header.Set("x-chain", "solana")

	slog.Debug("BirdEye POST request details",
		"url", req.URL.String(),
		"headers", fmt.Sprintf("%v", req.Header),
		"body", string(bodyBytes)) // Log request body for POST

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform POST request to %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	if resp.StatusCode != http.StatusOK {
		// Check if response is HTML (common for error pages)
		if util.IsHTMLResponse(respBody) {
			slog.Error("BirdEye POST request failed - received HTML error page",
				"url", requestURL,
				"status_code", resp.StatusCode,
				"content_type", resp.Header.Get("Content-Type"))
			return nil, fmt.Errorf("POST request to %s failed with status code: %d (received HTML error page instead of JSON)", requestURL, resp.StatusCode)
		}

		slog.Error("BirdEye POST request failed",
			"url", requestURL,
			"status_code", resp.StatusCode,
			"body", string(respBody))
		return nil, fmt.Errorf("POST request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	// Check if we received HTML when expecting JSON
	if util.IsHTMLResponse(respBody) {
		slog.Error("BirdEye API returned HTML instead of JSON",
			"url", requestURL,
			"content_type", resp.Header.Get("Content-Type"))
		return nil, fmt.Errorf("BirdEye API returned HTML page instead of JSON data for %s - this may indicate an API endpoint issue or rate limiting", requestURL)
	}

	var responseObject T
	if err := json.Unmarshal(respBody, &responseObject); err != nil {
		// Truncate body for logging if it's very long
		bodyForLog := util.TruncateForLogging(string(respBody), 500)

		slog.Error("Failed to unmarshal response from BirdEye POST request",
			"url", requestURL,
			"error", err,
			"body_preview", bodyForLog)
		return nil, fmt.Errorf("failed to unmarshal JSON response from %s: %w", requestURL, err)
	}

	return &responseObject, nil
}
