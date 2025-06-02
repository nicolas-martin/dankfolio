package offchain

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url" // Added for url.Error type checking
	"strings"
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

	log.Printf("🔍 FetchMetadata: Processing URI: %s", uri)
	log.Printf("🔄 FetchMetadata: Starting metadata fetch process...")

	// Check if it's an HTTP URI containing an IPFS path
	if strings.HasPrefix(uri, "http") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			ipfsURI := "ipfs://" + parts[1]
			log.Printf("🔄 FetchMetadata: Converting HTTP IPFS URI to native IPFS: %s -> %s", uri, ipfsURI)
			return c.fetchIPFSMetadata(ipfsURI)
		}
	}

	if strings.HasPrefix(uri, "ipfs://") {
		log.Printf("📦 FetchMetadata: Detected IPFS URI, attempting IPFS gateways for: %s", uri)
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

	log.Printf("🔍 FetchRawData: Processing URI: %s", uri)
	log.Printf("🔄 FetchRawData: Starting raw data fetch process...")

	// Check if it's an HTTP URI containing an IPFS path
	if strings.HasPrefix(uri, "http") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			ipfsURI := "ipfs://" + parts[1]
			log.Printf("🔄 FetchRawData: Converting HTTP IPFS URI to native IPFS: %s -> %s", uri, ipfsURI)
			return c.fetchIPFSRaw(ctx, ipfsURI)
		}
	}

	if strings.HasPrefix(uri, "ipfs://") {
		log.Printf("📦 FetchRawData: Detected IPFS URI, attempting IPFS gateways for: %s", uri)
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

// fetchIPFSMetadata fetches metadata from IPFS with multiple gateway fallbacks
func (c *Client) fetchIPFSMetadata(uri string) (map[string]any, error) {
	cid := strings.TrimPrefix(uri, "ipfs://")
	if cid == "" {
		log.Printf("❌ IPFS: Invalid IPFS URI - empty CID")
		return nil, fmt.Errorf("invalid ipfs URI: empty CID")
	}

	log.Printf("📦 IPFS: Extracted CID: %s", cid)
	log.Printf("🔄 IPFS: Starting gateway fallback sequence...")

	gateways := []string{
		"https://ipfs.io/ipfs/",
		"https://dweb.link/ipfs/",
		"https://cloudflare-ipfs.com/ipfs/",
		"https://gateway.pinata.cloud/ipfs/",
		"https://storry.tv/ipfs/",
	}

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + cid
		log.Printf("📦 IPFS: Attempting gateway %d/%d: %s", i+1, len(gateways), fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			log.Printf("✅ IPFS: Successfully fetched metadata from gateway %d/%d: %s", i+1, len(gateways), gw)
			return metadata, nil
		}
		lastErr = err
		log.Printf("❌ IPFS: Gateway %d/%d failed (%s): %v", i+1, len(gateways), gw, err)
	}

	log.Printf("❌ IPFS: All gateways failed for CID: %s", cid)
	return nil, fmt.Errorf("all IPFS gateways failed for %s: %w", uri, lastErr)
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

// fetchIPFSRaw fetches raw data from IPFS
func (c *Client) fetchIPFSRaw(ctx context.Context, uri string) ([]byte, string, error) {
	cid := strings.TrimPrefix(uri, "ipfs://")
	if cid == "" {
		return nil, "", fmt.Errorf("invalid ipfs URI: empty CID")
	}

	gateways := getIPFSGateways()
	log.Printf("📦 IPFS Raw: Extracted CID: %s. Trying %d gateways...", cid, len(gateways))

	var lastErr error
	for i, gw := range gateways {
		fullURL := gw + cid
		log.Printf("📦 IPFS Raw: Attempt %d/%d: %s", i+1, len(gateways), fullURL)
		data, contentType, err := c.fetchHTTPRaw(ctx, fullURL)
		if err == nil {
			log.Printf("✅ IPFS Raw: Success from gateway %d/%d: %s", i+1, len(gateways), gw)
			return data, contentType, nil
		}
		lastErr = err
		log.Printf("❌ IPFS Raw: Gateway %d/%d failed (%s): %v", i+1, len(gateways), gw, err)
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

func getIPFSGateways() []string {
	// Can be made configurable later
	return []string{
		"https://gateway.pinata.cloud/ipfs/", // Prioritize Pinata based on previous success
		"https://ipfs.io/ipfs/",
		"https://dweb.link/ipfs/",
		"https://cloudflare-ipfs.com/ipfs/",
		"https://storry.tv/ipfs/",
	}
}

func getArweaveGateways() []string {
	// Can be made configurable later
	return []string{
		"https://arweave.net/",
	}
}

// VerifyDirectImageAccess checks if a URL points directly to an image without redirects
// and has a common image content type.
func (c *Client) VerifyDirectImageAccess(ctx context.Context, urlStr string) (bool, string, error) {
	log.Printf("🛡️ VerifyDirectImageAccess: Validating URL for direct image access: %s", urlStr)

	// Create a new HTTP client configured to not follow redirects
	noRedirectClient := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Important: Prevents following redirects
		},
		Timeout: c.httpClient.Timeout, // Use the same timeout as the main client
	}

	req, err := http.NewRequestWithContext(ctx, "HEAD", urlStr, nil)
	if err != nil {
		log.Printf("❌ VerifyDirectImageAccess: Failed to create request for %s: %v", urlStr, err)
		return false, "request_creation_failed", fmt.Errorf("failed to create request for %s: %w", urlStr, err)
	}
	// Set a generic User-Agent. Consider making this configurable or more specific.
	req.Header.Set("User-Agent", "DankfolioImageValidator/1.0")

	resp, err := noRedirectClient.Do(req)
	// This error handling block needs to be before resp.Body.Close()
	if err != nil {
		// Check if the error is due to the redirect policy
		// url.Error is part of "net/url"
		if urlErr, ok := err.(*url.Error); ok && urlErr.Err == http.ErrUseLastResponse {
			log.Printf("⚠️ VerifyDirectImageAccess: Redirect attempted for %s", urlStr)
			location := ""
			// Ensure resp and resp.Header are not nil before trying to access Location.
			// This is important because the error might occur before a response is fully received.
			if resp != nil && resp.Header != nil {
				location = resp.Header.Get("Location")
				// It's good practice to close the body if a response was received, even in error cases.
				// However, in the case of ErrUseLastResponse, the body might not be fully formed or relevant.
				// For safety and consistency, ensure it's closed if resp is not nil.
				if resp.Body != nil {
					resp.Body.Close()
				}
			}
			if location != "" {
				log.Printf("Redirect location: %s", location)
			}
			return false, "redirect_attempted", fmt.Errorf("redirect attempted for %s (Location: %s)", urlStr, location)
		}
		log.Printf("❌ VerifyDirectImageAccess: HTTP request failed for %s: %v", urlStr, err)
		return false, "network_error", fmt.Errorf("http request failed for %s: %w", urlStr, err)
	}
	defer resp.Body.Close()

	// Check for explicit redirect status codes first.
	// With CheckRedirect: ErrUseLastResponse, any redirect attempt should ideally result in an error caught above.
	// However, this explicit check handles cases where a server might send a 3xx status
	// without the Go http client necessarily wrapping the error as http.ErrUseLastResponse
	// (e.g. if the redirect is malformed or server closes connection weirdly after 3xx).
	if resp.StatusCode >= 300 && resp.StatusCode <= 399 {
		location := resp.Header.Get("Location")
		log.Printf("⚠️ VerifyDirectImageAccess: Redirect status code %d received for %s (Location: %s)", resp.StatusCode, urlStr, location)
		// Using "redirect_attempted" for consistency with the error path.
		return false, "redirect_attempted", fmt.Errorf("redirect status code %d for %s (Location: %s)", resp.StatusCode, urlStr, location)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ VerifyDirectImageAccess: Non-200 status for %s: %d", urlStr, resp.StatusCode)
		return false, "non_200_status", fmt.Errorf("non-200 status for %s: %d", urlStr, resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	// Normalize content type by taking the part before any semicolon (e.g., charset) and converting to lower case.
	normalizedContentType := strings.ToLower(strings.Split(contentType, ";")[0])

	allowedContentTypes := map[string]bool{
		"image/png":     true,
		"image/jpeg":    true,
		"image/gif":     true,
		"image/webp":    true,
		"image/svg+xml": true,
	}

	if !allowedContentTypes[normalizedContentType] {
		log.Printf("❌ VerifyDirectImageAccess: Non-image content type for %s: %s (Normalized: %s)", urlStr, contentType, normalizedContentType)
		return false, "non_image_content_type", fmt.Errorf("non-image content type for %s: %s", urlStr, contentType)
	}

	log.Printf("✅ VerifyDirectImageAccess: Successfully validated direct image access for %s (Content-Type: %s)", urlStr, contentType)
	return true, urlStr, nil
}
