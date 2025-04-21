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

	if strings.HasPrefix(uri, "ipfs://") {
		return c.fetchIPFSMetadata(uri)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		return c.fetchHTTPMetadata(uri)
	}

	if strings.HasPrefix(uri, "ar://") {
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
		log.Printf("Attempting IPFS gateway: %s", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			return metadata, nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("all IPFS gateways failed for %s: %w", uri, lastErr)
}

// fetchArweaveMetadata fetches metadata from Arweave with gateway fallback
func (c *Client) fetchArweaveMetadata(uri string) (map[string]interface{}, error) {
	txID := strings.TrimPrefix(uri, "ar://")
	if txID == "" {
		return nil, fmt.Errorf("invalid arweave URI: empty TxID")
	}

	gateways := []string{
		"https://arweave.net/",
	}

	var lastErr error
	for _, gw := range gateways {
		fullURL := gw + txID
		log.Printf("Attempting Arweave gateway: %s", fullURL)
		metadata, err := c.fetchHTTPMetadata(fullURL)
		if err == nil {
			return metadata, nil
		}
		lastErr = err
	}

	return nil, fmt.Errorf("all Arweave gateways failed for %s: %w", uri, lastErr)
}

// fetchHTTPMetadata fetches JSON metadata from an HTTP(S) URL
func (c *Client) fetchHTTPMetadata(url string) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	req.Header.Set("User-Agent", "DankfolioEnrichmentBot/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http status %d for %s", resp.StatusCode, url)
	}

	var metadata map[string]interface{}
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&metadata); err != nil {
		return nil, fmt.Errorf("failed to decode JSON from %s: %w", url, err)
	}

	return metadata, nil
}
