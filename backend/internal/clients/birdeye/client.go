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
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
)

// Client handles interactions with the BirdEye API
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	tracker    clients.APICallTracker
}

// ClientAPI defines the interface for the BirdEye client.
type ClientAPI interface {
	GetPriceHistory(ctx context.Context, params PriceHistoryParams) (*PriceHistory, error)
	GetTrendingTokens(ctx context.Context) (*TokenTrendingResponse, error)
}

// NewClient creates a new instance of the BirdEye client
func NewClient(baseURL string, apiKey string, tracker clients.APICallTracker) ClientAPI {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
		tracker: tracker,
	}
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// PriceHistory represents the response from the price history API
type PriceHistory struct {
	Data    PriceHistoryData `json:"data"`
	Success bool             `json:"success"`
}

// PriceHistoryData contains the price history items
type PriceHistoryData struct {
	Items []PriceHistoryItem `json:"items"`
}

// PriceHistoryItem represents a single price point
type PriceHistoryItem struct {
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

// GetPriceHistory retrieves price history for a given token
func (c *Client) GetPriceHistory(ctx context.Context, params PriceHistoryParams) (*PriceHistory, error) {
	queryParams := url.Values{}
	queryParams.Add("address", params.Address)
	queryParams.Add("address_type", params.AddressType)
	queryParams.Add("type", params.HistoryType)
	queryParams.Add("time_from", strconv.FormatInt(params.TimeFrom.Unix(), 10))
	queryParams.Add("time_to", strconv.FormatInt(params.TimeTo.Unix(), 10))

	fullURL := fmt.Sprintf("%s/history_price?%s", c.baseURL, queryParams.Encode())

	// No specific slog.Debug here, rely on getRequest's logging
	priceHistory, err := c.getRequest[PriceHistory](ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get price history: %w", err)
	}

	return priceHistory, nil
}

// GetTrendingTokens retrieves the list of trending tokens from the BirdEye API.
func (c *Client) GetTrendingTokens(ctx context.Context) (*TokenTrendingResponse, error) {
	fullURL := fmt.Sprintf("%s/defi/token_trending", c.baseURL)
	slog.Debug("Fetching trending tokens from BirdEye", "url", fullURL) // Keep this specific log for the public method

	trendingTokensResponse, err := c.getRequest[TokenTrendingResponse](ctx, fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get trending tokens: %w", err)
	}

	return trendingTokensResponse, nil
}

// getRequest is a helper function to perform an HTTP GET request, check status, and unmarshal response
func (c *Client) getRequest[T any](ctx context.Context, requestURL string) (*T, error) {
	// Extract endpointName from URL
	parsedURL, err := url.Parse(requestURL)
	if err != nil {
		slog.Error("Failed to parse URL for tracking", "url", requestURL, "error", err)
		// Fallback or decide how to handle error, for now, we'll proceed without specific endpoint tracking if parse fails
	} else {
		endpointName := parsedURL.Path
		if endpointName == "" {
			endpointName = "/" // Default if path is empty
		}
		// Ensure c.tracker is not nil before calling TrackCall
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

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body) // Read body for error context
		slog.Error("BirdEye GET request failed",
			"url", requestURL,
			"status_code", resp.StatusCode,
			"body", string(respBody))
		return nil, fmt.Errorf("GET request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	var responseObject T
	if err := json.Unmarshal(respBody, &responseObject); err != nil {
		slog.Error("Failed to unmarshal response from BirdEye GET request",
			"url", requestURL,
			"error", err,
			"raw_body", string(respBody)) // Log raw body on unmarshal error
		return nil, fmt.Errorf("failed to unmarshal response from %s: %w. Body: %s", requestURL, err, string(respBody))
	}

	return &responseObject, nil
}

// postRequest is a helper function to perform an HTTP POST request with a JSON body, check status, and unmarshal response
func (c *Client) postRequest[T any](ctx context.Context, requestURL string, requestBody any) (*T, error) {
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

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body) // Read body for error context
		slog.Error("BirdEye POST request failed",
			"url", requestURL,
			"status_code", resp.StatusCode,
			"body", string(respBody))
		return nil, fmt.Errorf("POST request to %s failed with status code: %d, body: %s", requestURL, resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}

	var responseObject T
	if err := json.Unmarshal(respBody, &responseObject); err != nil {
		slog.Error("Failed to unmarshal response from BirdEye POST request",
			"url", requestURL,
			"error", err,
			"raw_body", string(respBody)) // Log raw body on unmarshal error
		return nil, fmt.Errorf("failed to unmarshal response from %s: %w. Body: %s", requestURL, err, string(respBody))
	}

	return &responseObject, nil
}

// PriceHistoryParams contains parameters for the GetPriceHistory request
type PriceHistoryParams struct {
	Address     string    // Token address
	AddressType string    // Address type
	HistoryType string    // History type (e.g., "1H", "1D", etc.)
	TimeFrom    time.Time // Start time
	TimeTo      time.Time // End time
}

// TokenTrendingResponse corresponds to the top-level JSON object from /defi/token_trending
type TokenTrendingResponse struct {
	Data    []TokenDetails `json:"data"`
	Success bool           `json:"success"`
}

// TokenDetails corresponds to each object in the "data" array
type TokenDetails struct {
	Address    string   `json:"address"`
	Name       string   `json:"name"`
	Symbol     string   `json:"symbol"`
	Price      float64  `json:"price"`
	Volume24h  float64  `json:"volume_24h"`
	MarketCap  float64  `json:"market_cap"`
	LogoURI    string   `json:"logoURI"`
	Tags       []string `json:"tags"`
	CreatedAt  string   `json:"created_at"`
}
