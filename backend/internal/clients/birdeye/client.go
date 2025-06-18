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
	priceHistoryEndpoint   = "defi/history_price"
	trendingTokensEndpoint = "defi/token_trending"
	tokenOverviewEndpoint  = "defi/token_overview"
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
