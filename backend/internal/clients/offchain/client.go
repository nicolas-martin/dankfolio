package offchain

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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
func (c *Client) FetchMetadata(uri string) (map[string]interface{}, error) {
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

// fetchIPFSMetadata fetches metadata from IPFS with multiple gateway fallbacks
func (c *Client) fetchIPFSMetadata(uri string) (map[string]interface{}, error) {
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
func (c *Client) fetchArweaveMetadata(uri string) (map[string]interface{}, error) {
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
func (c *Client) fetchHTTPMetadata(url string) (map[string]interface{}, error) {
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
	var metadata map[string]interface{}
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
