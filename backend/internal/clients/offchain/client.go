package offchain

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

// Client handles interactions with external metadata sources
type Client struct {
	httpClient *http.Client
	tracker    clients.APICallTracker
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client, tracker clients.APICallTracker) ClientAPI {
	return &Client{
		httpClient: httpClient,
		tracker:    tracker,
	}
}

// FetchMetadata fetches JSON metadata from a URI with fallback support for IPFS and Arweave
func (c *Client) FetchMetadata(uri string) (map[string]any, error) {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		slog.Error("❌ FetchMetadata: Empty URI provided")
		return nil, fmt.Errorf("cannot fetch metadata from empty URI")
	}

	slog.Debug("🔍 FetchMetadata: Processing URI", "uri", uri)
	slog.Debug("🔄 FetchMetadata: Starting metadata fetch process...")

	// Check if it's an HTTP URI containing an IPFS path
	if strings.HasPrefix(uri, "http") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			ipfsURI := "ipfs://" + parts[1]
			slog.Debug("🔄 FetchMetadata: Converting HTTP IPFS URI to native IPFS", "original", uri, "ipfs", ipfsURI)
			return c.fetchIPFSMetadata(ipfsURI)
		}
	}

	if strings.HasPrefix(uri, "ipfs://") {
		slog.Debug("📦 FetchMetadata: Detected IPFS URI, attempting IPFS gateways", "uri", uri)
		return c.fetchIPFSMetadata(uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		slog.Debug("🌐 FetchMetadata: Detected HTTP(S) URI, fetching directly", "uri", uri)
		return c.fetchHTTPMetadata(uri)
	}

	if strings.HasPrefix(uri, "ar://") {
		slog.Debug("📜 FetchMetadata: Detected Arweave URI, attempting Arweave gateways", "uri", uri)
		return c.fetchArweaveMetadata(uri)
	}

	slog.Error("❌ FetchMetadata: Unsupported URI scheme", "uri", uri)
	return nil, fmt.Errorf("unsupported URI scheme: %s", uri)
}

// FetchRawData fetches raw bytes from a URI with fallback support for IPFS and Arweave
func (c *Client) FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error) {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		slog.Error("❌ FetchRawData: Empty URI provided")
		return nil, "", fmt.Errorf("cannot fetch raw data from empty URI")
	}

	slog.Debug("🔍 FetchRawData: Processing URI", "uri", uri)
	slog.Debug("🔄 FetchRawData: Starting raw data fetch process...")

	// Check if it's an HTTP URI containing an IPFS path
	if strings.HasPrefix(uri, "http") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			ipfsURI := "ipfs://" + parts[1]
			slog.Debug("🔄 FetchRawData: Converting HTTP IPFS URI to native IPFS", "original", uri, "ipfs", ipfsURI)
			return c.fetchIPFSRaw(ctx, ipfsURI)
		}
	}

	if strings.HasPrefix(uri, "ipfs://") {
		slog.Debug("📦 FetchRawData: Detected IPFS URI, attempting IPFS gateways", "uri", uri)
		return c.fetchIPFSRaw(ctx, uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		slog.Debug("🌐 FetchRawData: Detected HTTP(S) URI, fetching directly", "uri", uri)
		return c.fetchHTTPRaw(ctx, uri)
	}

	if strings.HasPrefix(uri, "ar://") {
		slog.Debug("📜 FetchRawData: Detected Arweave URI, attempting Arweave gateways", "uri", uri)
		return c.fetchArweaveRaw(ctx, uri)
	}

	slog.Error("❌ FetchRawData: Unsupported URI scheme", "uri", uri)
	return nil, "", fmt.Errorf("unsupported URI scheme: %s", uri)
}

// fetchIPFSMetadata fetches metadata from IPFS with multiple gateway fallbacks
func (c *Client) fetchIPFSMetadata(uri string) (map[string]any, error) {
	cid := strings.TrimPrefix(uri, "ipfs://")
	if cid == "" {
		slog.Error("❌ IPFS: Invalid IPFS URI - empty CID")
		return nil, fmt.Errorf("invalid ipfs URI: empty CID")
	}

	slog.Debug("📦 IPFS: Extracted CID", "cid", cid)
	slog.Debug("🔄 IPFS: Starting gateway fallback sequence...")

	gateways := util.DefaultCIDv0Gateways

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + cid
		slog.Debug("📦 IPFS: Attempting gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "url", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			slog.Debug("✅ IPFS: Successfully fetched metadata from gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw)
			return metadata, nil
		}
		lastErr = err
		slog.Debug("❌ IPFS: Gateway failed", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "error", err)
	}

	slog.Error("❌ IPFS: All gateways failed", "cid", cid)
	return nil, fmt.Errorf("all IPFS gateways failed for %s: %w", uri, lastErr)
}

// fetchArweaveMetadata fetches metadata from Arweave with gateway fallback
func (c *Client) fetchArweaveMetadata(uri string) (map[string]any, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		slog.Error("❌ Arweave: Invalid Arweave URI - empty TxID")
		return nil, fmt.Errorf("invalid arweave URI: empty TxID")
	}

	slog.Debug("📜 Arweave: Extracted TxID", "txID", txID)
	slog.Debug("🔄 Arweave: Starting gateway fallback sequence...")

	gateways := []string{
		"https://arweave.net/",
	}

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + txID
		slog.Debug("📜 Arweave: Attempting gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "url", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			slog.Debug("✅ Arweave: Successfully fetched metadata from gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw)
			return metadata, nil
		}
		lastErr = err
		slog.Debug("❌ Arweave: Gateway failed", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "error", err)
	}

	slog.Error("❌ Arweave: All gateways failed", "txID", txID)
	return nil, fmt.Errorf("all Arweave gateways failed for %s: %w", uri, lastErr)
}

// fetchHTTPMetadata fetches JSON metadata from an HTTP(S) URL
func (c *Client) fetchHTTPMetadata(requestURL string) (map[string]any, error) {
	c.tracker.Increment("offchain", "fetchHTTPMetadata")
	slog.Debug("🌐 HTTP: Creating request", "url", requestURL)
	slog.Debug("🔄 HTTP: Setting up request headers...")

	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		slog.Error("❌ HTTP: Failed to create request", "url", requestURL, "error", err)
		return nil, fmt.Errorf("failed to create request for %s: %w", requestURL, err)
	}

	slog.Debug("🌐 HTTP: Sending GET request", "url", requestURL)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("❌ HTTP: Request failed", "url", requestURL, "error", err)
		return nil, fmt.Errorf("http get failed for %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	slog.Debug("📥 HTTP: Received response", "status_code", resp.StatusCode, "url", requestURL)
	if resp.StatusCode != http.StatusOK {
		slog.Error("❌ HTTP: Failed with status code", "status_code", resp.StatusCode, "url", requestURL)
		return nil, fmt.Errorf("http status %d for %s", resp.StatusCode, requestURL)
	}

	slog.Debug("🔄 HTTP: Decoding JSON response", "url", requestURL)
	var metadata map[string]any
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&metadata); err != nil {
		slog.Error("❌ HTTP: Failed to decode JSON", "url", requestURL, "error", err)
		return nil, fmt.Errorf("failed to decode JSON from %s: %w", requestURL, err)
	}

	if len(metadata) == 0 {
		slog.Error("❌ HTTP: Empty metadata received", "url", requestURL)
		return nil, fmt.Errorf("empty metadata received from %s", requestURL)
	}

	slog.Debug("✅ HTTP: Successfully decoded JSON metadata", "field_count", len(metadata), "url", requestURL)
	return metadata, nil
}

// fetchHTTPRaw fetches raw data and content type from an HTTP(S) URL
func (c *Client) fetchHTTPRaw(ctx context.Context, requestURL string) (data []byte, contentType string, err error) {
	c.tracker.Increment("offchain", "fetchHTTPRaw")
	slog.Debug("🌐 HTTP Raw: Requesting", "url", requestURL)
	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		slog.Error("❌ HTTP Raw: Failed to create request", "url", requestURL, "error", err)
		return nil, "", fmt.Errorf("failed to create request for %s: %w", requestURL, err)
	}
	req.Header.Set("User-Agent", "DankfolioImageProxy/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("❌ HTTP Raw: Request failed", "url", requestURL, "error", err)
		return nil, "", fmt.Errorf("http get failed for %s: %w", requestURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("❌ HTTP Raw: Failed with status code", "status_code", resp.StatusCode, "url", requestURL)
		return nil, "", fmt.Errorf("http status %d for %s", resp.StatusCode, requestURL)
	}

	contentType = resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
		slog.Warn("⚠️ HTTP Raw: Content-Type missing, using fallback", "url", requestURL, "fallback_type", contentType)
	}

	data, err = io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("❌ HTTP Raw: Failed to read response body", "url", requestURL, "error", err)
		return nil, "", fmt.Errorf("failed to read response body from %s: %w", requestURL, err)
	}
	if len(data) == 0 {
		slog.Error("❌ HTTP Raw: Empty response body received", "url", requestURL)
		return nil, "", fmt.Errorf("empty response body received from %s", requestURL)
	}
	slog.Debug("✅ HTTP Raw: Success fetching", "bytes", len(data), "content_type", contentType, "url", requestURL)
	return data, contentType, nil
}

// fetchIPFSRaw fetches raw data from IPFS
func (c *Client) fetchIPFSRaw(ctx context.Context, uri string) ([]byte, string, error) {
	cid := strings.TrimPrefix(uri, "ipfs://")
	if cid == "" {
		return nil, "", fmt.Errorf("invalid ipfs URI: empty CID")
	}

	gateways := getIPFSGateways()
	slog.Debug("📦 IPFS Raw: Extracted CID", "cid", cid, "gateways", gateways)

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + cid
		slog.Debug("📦 IPFS Raw: Attempt", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "url", fullURL)
		data, contentType, err := c.fetchHTTPRaw(ctx, fullURL)
		if err == nil {
			slog.Debug("✅ IPFS Raw: Success from gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw)
			return data, contentType, nil
		}
		lastErr = err
		slog.Debug("❌ IPFS Raw: Gateway failed", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "error", err)
	}
	return nil, "", fmt.Errorf("all IPFS gateways failed for raw data %s: %w", uri, lastErr)
}

// fetchArweaveRaw fetches raw data from Arweave
func (c *Client) fetchArweaveRaw(ctx context.Context, uri string) ([]byte, string, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		return nil, "", fmt.Errorf("invalid arweave URI: empty TxID")
	}
	gateways := getArweaveGateways()
	slog.Debug("📜 Arweave Raw: Extracted TxID", "txID", txID, "gateways", gateways)

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + txID
		slog.Debug("📜 Arweave Raw: Attempt", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "url", fullURL)
		data, contentType, err := c.fetchHTTPRaw(ctx, fullURL)
		if err == nil {
			slog.Debug("✅ Arweave Raw: Success from gateway", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw)
			return data, contentType, nil
		}
		lastErr = err
		slog.Debug("❌ Arweave Raw: Gateway failed", "index", fmt.Sprintf("%d/%d", i+1, len(gateways)), "gateway", gw, "error", err)
	}
	return nil, "", fmt.Errorf("all Arweave gateways failed for raw data %s: %w", uri, lastErr)
}

// --- Helpers ---

func getIPFSGateways() []string {
	// Can be made configurable later

	return util.DefaultCIDv0Gateways
}

func getArweaveGateways() []string {
	// Can be made configurable later
	return []string{
		"https://arweave.net/",
	}
}
