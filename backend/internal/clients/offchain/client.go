package offchain

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"backend/internal/util"
)

// Client handles interactions with external metadata sources
type Client struct {
	httpClient *http.Client
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// NewClient creates a new instance of Client
func NewClient(httpClient *http.Client) ClientAPI {
	return &Client{
		httpClient: httpClient,
	}
}

// FetchMetadata fetches JSON metadata from a URI with fallback support for IPFS and Arweave
func (c *Client) FetchMetadata(uri string) (map[string]any, error) {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		log.Printf("❌ FetchMetadata: Empty URI provided")
		return nil, fmt.Errorf("cannot fetch metadata from empty URI")
	}

	log.Printf("🔍 FetchMetadata: Initial URI: %s", uri)
	standardizedURI := util.StandardizeIpfsUrl(uri)
	log.Printf("ℹ️ FetchMetadata: Original URI: %s, Standardized URI: %s", uri, standardizedURI)

	// If Standardization resulted in a new HTTP URL, it's likely an IPFS gateway URL.
	if standardizedURI != uri && strings.HasPrefix(standardizedURI, "http") {
		log.Printf("🔄 FetchMetadata: URI standardized to IPFS gateway: %s. Proceeding with HTTP fetch.", standardizedURI)
		return c.fetchHTTPMetadata(standardizedURI)
	}

	// Fallback to scheme-based dispatch if not handled by standardization above
	log.Printf("🔄 FetchMetadata: Proceeding with scheme-based dispatch for URI: %s", uri)
	if strings.HasPrefix(uri, "ipfs://") {
		log.Printf("📦 FetchMetadata: Detected IPFS URI (post-standardization attempt), using fetchIPFSMetadata for: %s", uri)
		return c.fetchIPFSMetadata(uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		log.Printf("🌐 FetchMetadata: Detected HTTP(S) URI, fetching directly from: %s", uri)
		return c.fetchHTTPMetadata(uri)
	}

	if strings.HasPrefix(uri, "ar://") {
		log.Printf("📜 FetchMetadata: Detected Arweave URI, attempting Arweave gateways for: %s", uri)
		return c.fetchArweaveMetadata(uri)
	}

	log.Printf("❌ FetchMetadata: Unsupported URI scheme: %s", uri)
	return nil, fmt.Errorf("unsupported URI scheme: %s", uri)
}

// FetchRawData fetches raw bytes from a URI with fallback support for IPFS and Arweave
func (c *Client) FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error) {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		log.Printf("❌ FetchRawData: Empty URI provided")
		return nil, "", fmt.Errorf("cannot fetch raw data from empty URI")
	}

	log.Printf("🔍 FetchRawData: Initial URI: %s", uri)
	standardizedURI := util.StandardizeIpfsUrl(uri)
	log.Printf("ℹ️ FetchRawData: Original URI: %s, Standardized URI: %s", uri, standardizedURI)

	// If Standardization resulted in a new HTTP URL, it's likely an IPFS gateway URL.
	if standardizedURI != uri && strings.HasPrefix(standardizedURI, "http") {
		log.Printf("🔄 FetchRawData: URI standardized to IPFS gateway: %s. Proceeding with HTTP fetch.", standardizedURI)
		return c.fetchHTTPRaw(ctx, standardizedURI)
	}

	// Fallback to scheme-based dispatch if not handled by standardization above
	log.Printf("🔄 FetchRawData: Proceeding with scheme-based dispatch for URI: %s", uri)
	if strings.HasPrefix(uri, "ipfs://") {
		log.Printf("📦 FetchRawData: Detected IPFS URI (post-standardization attempt), using fetchIPFSRaw for: %s", uri)
		return c.fetchIPFSRaw(ctx, uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		log.Printf("🌐 FetchRawData: Detected HTTP(S) URI, fetching directly from: %s", uri)
		return c.fetchHTTPRaw(ctx, uri)
	}

	if strings.HasPrefix(uri, "ar://") {
		log.Printf("📜 FetchRawData: Detected Arweave URI, attempting Arweave gateways for: %s", uri)
		return c.fetchArweaveRaw(ctx, uri)
	}

	log.Printf("❌ FetchRawData: Unsupported URI scheme: %s", uri)
	return nil, "", fmt.Errorf("unsupported URI scheme: %s", uri)
}

// fetchIPFSMetadata fetches metadata from IPFS using a standardized gateway URL
func (c *Client) fetchIPFSMetadata(uri string) (map[string]any, error) {
	log.Printf("📦 IPFS: Standardizing IPFS URI: %s", uri)
	standardizedURL := util.StandardizeIpfsUrl(uri)

	if standardizedURL == "" || strings.HasPrefix(standardizedURL, "ipfs://") {
		log.Printf("❌ IPFS: Failed to standardize IPFS URI to a fetchable gateway URL: %s", uri)
		return nil, fmt.Errorf("failed to standardize IPFS URI to a fetchable gateway URL: %s", uri)
	}

	log.Printf("📦 IPFS: Attempting to fetch metadata from standardized IPFS URL: %s", standardizedURL)
	metadata, err := c.fetchHTTPMetadata(standardizedURL)
	if err != nil {
		log.Printf("❌ IPFS: Failed to fetch metadata from %s: %v", standardizedURL, err)
		return nil, fmt.Errorf("failed to fetch IPFS metadata from %s after standardization: %w", standardizedURL, err)
	}

	log.Printf("✅ IPFS: Successfully fetched metadata from standardized URL: %s", standardizedURL)
	return metadata, nil
}

// fetchArweaveMetadata fetches metadata from Arweave with gateway fallback
func (c *Client) fetchArweaveMetadata(uri string) (map[string]any, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		log.Printf("❌ Arweave: Invalid Arweave URI - empty TxID")
		return nil, fmt.Errorf("invalid arweave URI: empty TxID")
	}

	log.Printf("📜 Arweave: Extracted TxID: %s", txID)
	log.Printf("🔄 Arweave: Starting gateway fallback sequence...")

	gateways := []string{
		"https://arweave.net/",
	}

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + txID
		log.Printf("📜 Arweave: Attempting gateway %d/%d: %s", i+1, len(gateways), fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			log.Printf("✅ Arweave: Successfully fetched metadata from gateway %d/%d: %s", i+1, len(gateways), gw)
			return metadata, nil
		}
		lastErr = err
		log.Printf("❌ Arweave: Gateway %d/%d failed (%s): %v", i+1, len(gateways), gw, err)
	}

	log.Printf("❌ Arweave: All gateways failed for TxID: %s", txID)
	return nil, fmt.Errorf("all Arweave gateways failed for %s: %w", uri, lastErr)
}

// fetchHTTPMetadata fetches JSON metadata from an HTTP(S) URL
func (c *Client) fetchHTTPMetadata(url string) (map[string]any, error) {
	log.Printf("🌐 HTTP: Creating request for URL: %s", url)
	log.Printf("🔄 HTTP: Setting up request headers...")

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("❌ HTTP: Failed to create request for %s: %v", url, err)
		return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
	}

	req.Header.Set("User-Agent", "DankfolioEnrichmentBot/1.0")

	log.Printf("🌐 HTTP: Sending GET request to: %s", url)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("❌ HTTP: Request failed for %s: %v", url, err)
		return nil, fmt.Errorf("http get failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	log.Printf("📥 HTTP: Received response with status code: %d", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ HTTP: Failed with status code %d for %s", resp.StatusCode, url)
		return nil, fmt.Errorf("http status %d for %s", resp.StatusCode, url)
	}

	log.Printf("🔄 HTTP: Decoding JSON response from: %s", url)
	var metadata map[string]any
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&metadata); err != nil {
		log.Printf("❌ HTTP: Failed to decode JSON from %s: %v", url, err)
		return nil, fmt.Errorf("failed to decode JSON from %s: %w", url, err)
	}

	if len(metadata) == 0 {
		log.Printf("❌ HTTP: Empty metadata received from %s", url)
		return nil, fmt.Errorf("empty metadata received from %s", url)
	}

	log.Printf("✅ HTTP: Successfully decoded JSON metadata (%d fields) from: %s", len(metadata), url)
	return metadata, nil
}

// fetchHTTPRaw fetches raw data and content type from an HTTP(S) URL
func (c *Client) fetchHTTPRaw(ctx context.Context, url string) (data []byte, contentType string, err error) {
	log.Printf("🌐 HTTP Raw: Requesting: %s", url)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	req.Header.Set("User-Agent", "DankfolioImageProxy/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("http get failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("http status %d for %s", resp.StatusCode, url)
	}

	contentType = resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
		log.Printf("⚠️ HTTP Raw: Content-Type missing for %s, using fallback %s", url, contentType)
	}

	data, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response body from %s: %w", url, err)
	}
	if len(data) == 0 {
		return nil, "", fmt.Errorf("empty response body received from %s", url)
	}
	log.Printf("✅ HTTP Raw: Success fetching %d bytes (%s) from: %s", len(data), contentType, url)
	return data, contentType, nil
}

// fetchIPFSRaw fetches raw data from IPFS using a standardized gateway URL
func (c *Client) fetchIPFSRaw(ctx context.Context, uri string) ([]byte, string, error) {
	log.Printf("📦 IPFS Raw: Standardizing IPFS URI: %s", uri)
	standardizedURL := util.StandardizeIpfsUrl(uri)

	if standardizedURL == "" || strings.HasPrefix(standardizedURL, "ipfs://") {
		log.Printf("❌ IPFS Raw: Failed to standardize IPFS URI to a fetchable gateway URL: %s", uri)
		return nil, "", fmt.Errorf("failed to standardize IPFS URI to a fetchable gateway URL: %s", uri)
	}

	log.Printf("📦 IPFS Raw: Attempting to fetch raw data from standardized IPFS URL: %s", standardizedURL)
	data, contentType, err := c.fetchHTTPRaw(ctx, standardizedURL)
	if err != nil {
		log.Printf("❌ IPFS Raw: Failed to fetch raw data from %s: %v", standardizedURL, err)
		return nil, "", fmt.Errorf("failed to fetch IPFS raw data from %s after standardization: %w", standardizedURL, err)
	}

	log.Printf("✅ IPFS Raw: Successfully fetched raw data from standardized URL: %s", standardizedURL)
	return data, contentType, nil
}

// fetchArweaveRaw fetches raw data from Arweave
func (c *Client) fetchArweaveRaw(ctx context.Context, uri string) ([]byte, string, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		return nil, "", fmt.Errorf("invalid arweave URI: empty TxID")
	}
	gateways := getArweaveGateways()
	log.Printf("📜 Arweave Raw: Extracted TxID: %s. Trying %d gateways...", txID, len(gateways))

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + txID
		log.Printf("📜 Arweave Raw: Attempt %d/%d: %s", i+1, len(gateways), fullURL)
		data, contentType, err := c.fetchHTTPRaw(ctx, fullURL)
		if err == nil {
			log.Printf("✅ Arweave Raw: Success from gateway %d/%d: %s", i+1, len(gateways), gw)
			return data, contentType, nil
		}
		lastErr = err
		log.Printf("❌ Arweave Raw: Gateway %d/%d failed (%s): %v", i+1, len(gateways), gw, err)
	}
	return nil, "", fmt.Errorf("all Arweave gateways failed for raw data %s: %w", uri, lastErr)
}

// --- Helpers ---

func getArweaveGateways() []string {
	// Can be made configurable later
	return []string{
		"https://arweave.net/",
	}
}
