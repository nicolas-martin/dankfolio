package birdeye

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Client handles interactions with the BirdEye API
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// NewClient creates a new instance of the BirdEye client
func NewClient(baseURL string, apiKey string) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
	}
}

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

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("X-API-KEY", c.apiKey)
	req.Header.Set("x-chain", "solana")

	log.Printf("BirdEye Request URL: %s", req.URL.String())
	log.Printf("BirdEye Request Headers: %v", req.Header)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var priceHistory PriceHistory
	if err := json.NewDecoder(resp.Body).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &priceHistory, nil
}

// PriceHistoryParams contains parameters for the GetPriceHistory request
type PriceHistoryParams struct {
	Address     string    // Token address
	AddressType string    // Address type
	HistoryType string    // History type (e.g., "1H", "1D", etc.)
	TimeFrom    time.Time // Start time
	TimeTo      time.Time // End time
}
