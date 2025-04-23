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
		return nil, fmt.Errorf("cannot fetch metadata from empty URI")
	}

	log.Printf("🔍 FetchMetadata: Processing URI: %s", uri)

	// Check if it's an HTTP URI containing an IPFS path
	if strings.HasPrefix(uri, "http") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			ipfsURI := "ipfs://" + parts[1]
			log.Printf("🔄 FetchMetadata: Converting HTTP IPFS URI to native IPFS: %s", ipfsURI)
			return c.fetchIPFSMetadata(ipfsURI)
		}
	}

	if strings.HasPrefix(uri, "ipfs://") {
		log.Printf("📦 FetchMetadata: Detected IPFS URI, attempting IPFS gateways")
		return c.fetchIPFSMetadata(uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		log.Printf("🌐 FetchMetadata: Detected HTTP(S) URI, fetching directly")
		return c.fetchHTTPMetadata(uri)
	}

	if strings.HasPrefix(uri, "ar://") {
		log.Printf("📜 FetchMetadata: Detected Arweave URI, attempting Arweave gateways")
		return c.fetchArweaveMetadata(uri)
	}

	return nil, fmt.Errorf("unsupported URI scheme: %s", uri)
}

// fetchIPFSMetadata fetches metadata from IPFS with multiple gateway fallbacks
func (c *Client) fetchIPFSMetadata(uri string) (map[string]interface{}, error) {
	cid := strings.TrimPrefix(uri, "ipfs://")
	if cid == "" {
		return nil, fmt.Errorf("invalid ipfs URI: empty CID")
	}

	log.Printf("📦 IPFS: Extracted CID: %s", cid)

	gateways := []string{
		"https://ipfs.io/ipfs/",
		"https://dweb.link/ipfs/",
		"https://cloudflare-ipfs.com/ipfs/",
		"https://gateway.pinata.cloud/ipfs/",
		"https://storry.tv/ipfs/",
	}

	var lastErr error
	for _, gw := range gateways {
		fullURL := gw + cid
		log.Printf("📦 IPFS: Attempting gateway: %s", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			log.Printf("✅ IPFS: Successfully fetched metadata from gateway: %s", gw)
			return metadata, nil
		}
		lastErr = err
		log.Printf("❌ IPFS: Gateway %s failed: %v", gw, err)
	}

	return nil, fmt.Errorf("all IPFS gateways failed for %s: %w", uri, lastErr)
}

// fetchArweaveMetadata fetches metadata from Arweave with gateway fallback
func (c *Client) fetchArweaveMetadata(uri string) (map[string]interface{}, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		return nil, fmt.Errorf("invalid arweave URI: empty TxID")
	}

	log.Printf("📜 Arweave: Extracted TxID: %s", txID)

	gateways := []string{
		"https://arweave.net/",
	}

	var lastErr error
	for _, gw := range gateways {
		fullURL := gw + txID
		log.Printf("📜 Arweave: Attempting gateway: %s", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			log.Printf("✅ Arweave: Successfully fetched metadata from gateway: %s", gw)
			return metadata, nil
		}
		lastErr = err
		log.Printf("❌ Arweave: Gateway %s failed: %v", gw, err)
	}

	return nil, fmt.Errorf("all Arweave gateways failed for %s: %w", uri, lastErr)
}

// fetchHTTPMetadata fetches JSON metadata from an HTTP(S) URL
func (c *Client) fetchHTTPMetadata(url string) (map[string]interface{}, error) {
	log.Printf("🌐 HTTP: Creating request for URL: %s", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("❌ HTTP: Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	req.Header.Set("User-Agent", "DankfolioEnrichmentBot/1.0")

	log.Printf("🌐 HTTP: Sending request to: %s", url)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("❌ HTTP: Request failed: %v", err)
		return nil, fmt.Errorf("http get failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ HTTP: Received non-200 status code: %d", resp.StatusCode)
		return nil, fmt.Errorf("http status %d for %s", resp.StatusCode, url)
	}

	log.Printf("✅ HTTP: Successfully received response from: %s", url)
	var metadata map[string]interface{}
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&metadata); err != nil {
		log.Printf("❌ HTTP: Failed to decode JSON response: %v", err)
		return nil, fmt.Errorf("failed to decode JSON from %s: %w", url, err)
	}

	log.Printf("✅ HTTP: Successfully decoded JSON metadata from: %s", url)
	return metadata, nil
}
