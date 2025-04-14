package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// EnrichCoinData fetches detailed information for a given mint address using Jupiter,
// Solana metadata, and off-chain sources. It populates and returns a model.Coin.
// It takes initial basic info (name, icon, volume) which might come from a preliminary scrape,
// and overwrites/enriches it.
func EnrichCoinData(
	ctx context.Context,
	mintAddress string,
	initialName string,
	initialIconURL string,
	initialVolume float64,
	jupiterClient *JupiterClient, // Assuming JupiterClient is accessible or passed
	httpClient *http.Client, // Pass shared HTTP client
	solanaClient *client.Client, // Pass shared Solana client
) (*model.Coin, error) {

	log.Printf("EnrichCoinData: Starting enrichment for %s", mintAddress)

	// Initialize coin with basic info or defaults
	coin := model.Coin{
		ID:          mintAddress,
		Name:        initialName,
		IconUrl:     initialIconURL,
		DailyVolume: initialVolume,
	}

	// 1. Get Jupiter data for basic info & price (overwrites initial values if found)
	log.Printf("EnrichCoinData: Fetching Jupiter token info for %s", mintAddress)
	jupiterInfo, err := jupiterClient.GetTokenInfo(mintAddress)
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Failed to get Jupiter info for %s: %v. Continuing enrichment.", mintAddress, err)
		// Continue enrichment even if Jupiter info fails, maybe metadata has info.
	} else {
		log.Printf("EnrichCoinData: Got Jupiter token info for %s: %s (%s)", mintAddress, jupiterInfo.Name, jupiterInfo.Symbol)
		coin.Name = jupiterInfo.Name // Overwrite name
		coin.Symbol = jupiterInfo.Symbol
		coin.Decimals = jupiterInfo.Decimals
		coin.DailyVolume = jupiterInfo.DailyVolume // Overwrite volume
		coin.Tags = jupiterInfo.Tags
		coin.IconUrl = jupiterInfo.LogoURI // Overwrite icon
		coin.CreatedAt = jupiterInfo.CreatedAt
	}

	// 2. Get price from Jupiter (even if GetTokenInfo failed, price might work)
	log.Printf("EnrichCoinData: Fetching Jupiter price for %s", mintAddress)
	prices, err := jupiterClient.GetTokenPrices([]string{mintAddress})
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Error fetching price for %s: %v", mintAddress, err)
	} else if priceData, ok := prices[mintAddress]; ok {
		// The response structure might be nested, adjust access accordingly
		// Assuming priceData is the direct price or contains it.
		// If priceData is a struct like { price: 1.23 }, access priceData.Price
		// For now, assuming priceData IS the price float. Adjust if needed based on actual JupiterClient response.
		coin.Price = priceData // Assign the price
		log.Printf("EnrichCoinData: Got Jupiter price for %s: %f", mintAddress, coin.Price)
	} else {
		log.Printf("WARN: EnrichCoinData: Price data not found for %s in Jupiter response", mintAddress)
	}

	// 3. Get Solana on-chain metadata account
	log.Printf("EnrichCoinData: Fetching on-chain metadata account for %s", mintAddress)
	metadataAccount, err := getMetadataAccount(ctx, mintAddress, solanaClient)
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Error fetching on-chain metadata account for %s: %v. Cannot fetch off-chain data.", mintAddress, err)
		// If we can't get the metadata account, we can't get the URI for off-chain metadata.
		// We might still have Jupiter data, so return the partially enriched coin.
		enrichFromMetadata(&coin, nil) // Ensure default description is set
		return &coin, nil              // Return potentially partially enriched coin, not a fatal error for enrichment itself
	}

	// 4. Fetch off-chain metadata using the URI from the on-chain account
	uri := resolveIPFSGateway(metadataAccount.Data.Uri)
	log.Printf("EnrichCoinData: Fetching off-chain metadata for %s from resolved URI: %s", mintAddress, uri)
	offchainMeta, err := fetchOffChainMetadataWithFallback(uri, httpClient)
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Error fetching off-chain metadata for %s (URI: %s): %v", mintAddress, uri, err)
		// Proceed without off-chain data, enrich with what we have
		enrichFromMetadata(&coin, nil) // Ensure default description is set
	} else {
		log.Printf("EnrichCoinData: Successfully fetched off-chain metadata for %s", mintAddress)
		// 5. Enrich with off-chain metadata (description, website, socials, etc.)
		enrichFromMetadata(&coin, offchainMeta)
	}

	log.Printf("EnrichCoinData: Enrichment complete for %s", mintAddress)
	return &coin, nil
}

// --- Helper Functions (moved from service.go, now unexported) ---

// getMetadataAccount retrieves the metadata account for a token
func getMetadataAccount(ctx context.Context, mint string, solanaClient *client.Client) (*token_metadata.Metadata, error) {
	mintPubkey := common.PublicKeyFromString(mint)
	metadataAccountPDA, err := token_metadata.GetTokenMetaPubkey(mintPubkey)
	if err != nil {
		return nil, fmt.Errorf("failed to derive metadata account PDA for %s: %w", mint, err)
	}

	accountInfo, err := solanaClient.GetAccountInfo(ctx, metadataAccountPDA.ToBase58())
	if err != nil {
		// Consider checking for specific errors, like account not found
		return nil, fmt.Errorf("failed to get account info for metadata PDA %s (mint: %s): %w", metadataAccountPDA.ToBase58(), mint, err)
	}
	if len(accountInfo.Data) == 0 {
		return nil, fmt.Errorf("metadata account %s for mint %s has no data", metadataAccountPDA.ToBase58(), mint)
	}

	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse metadata for %s: %w", mint, err)
	}

	return &metadata, nil
}

// resolveIPFSGateway rewrites the URI if it uses a known gateway that might be unreliable,
// preferring the ipfs:// scheme for fallback logic.
func resolveIPFSGateway(uri string) string {
	uri = strings.Trim(uri, "\x00") // Trim null characters sometimes present
	if strings.HasPrefix(uri, "https://") && strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			cid := parts[1]
			log.Printf("resolveIPFSGateway: Rewriting %s to ipfs://%s", uri, cid)
			return "ipfs://" + cid
		}
	}
	return uri // Return original if not a recognized HTTP IPFS gateway URL
}

// fetchOffChainMetadataWithFallback attempts to fetch off-chain metadata
// using a list of HTTP gateways as fallback for IPFS content.
func fetchOffChainMetadataWithFallback(uri string, httpClient *http.Client) (map[string]interface{}, error) {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		return nil, fmt.Errorf("cannot fetch metadata from empty URI")
	}

	if strings.HasPrefix(uri, "ipfs://") {
		cid := strings.TrimPrefix(uri, "ipfs://")
		if cid == "" {
			return nil, fmt.Errorf("invalid ipfs URI: empty CID")
		}
		// Consider making gateways configurable
		gateways := []string{
			"https://ipfs.io/ipfs/",
			"https://dweb.link/ipfs/",
			"https://cloudflare-ipfs.com/ipfs/",
			"https://gateway.pinata.cloud/ipfs/", // Add more gateways
			"https://storry.tv/ipfs/",
		}
		var lastErr error
		for _, gw := range gateways {
			fullURL := gw + cid
			log.Printf("fetchOffChainMetadataWithFallback: Attempting IPFS gateway: %s", fullURL)
			metadata, err := fetchOffChainMetadataHTTP(fullURL, httpClient)
			if err == nil {
				return metadata, nil // Success!
			}
			log.Printf("fetchOffChainMetadataWithFallback: Gateway %s failed for CID %s: %v", gw, cid, err)
			lastErr = err // Keep track of the last error
		}
		log.Printf("ERROR: fetchOffChainMetadataWithFallback: All IPFS gateways failed for CID %s.", cid)
		return nil, fmt.Errorf("all IPFS gateways failed for %s: %w", uri, lastErr)
	}

	if strings.HasPrefix(uri, "http://") || strings.HasPrefix(uri, "https://") {
		log.Printf("fetchOffChainMetadataWithFallback: Fetching metadata directly from HTTP(S) URI: %s", uri)
		return fetchOffChainMetadataHTTP(uri, httpClient)
	}

	if strings.HasPrefix(uri, "ar://") {
		// Arweave gateway logic (similar to IPFS)
		arweaveTxId := strings.TrimPrefix(uri, "ar://")
		if arweaveTxId == "" {
			return nil, fmt.Errorf("invalid arweave URI: empty TxID")
		}
		gateways := []string{
			"https://arweave.net/",
		}
		var lastErr error
		for _, gw := range gateways {
			fullURL := gw + arweaveTxId
			log.Printf("fetchOffChainMetadataWithFallback: Attempting Arweave gateway: %s", fullURL)
			metadata, err := fetchOffChainMetadataHTTP(fullURL, httpClient)
			if err == nil {
				return metadata, nil // Success!
			}
			log.Printf("fetchOffChainMetadataWithFallback: Arweave Gateway %s failed for TxID %s: %v", gw, arweaveTxId, err)
			lastErr = err
		}
		log.Printf("ERROR: fetchOffChainMetadataWithFallback: All Arweave gateways failed for TxID %s.", arweaveTxId)
		return nil, fmt.Errorf("all Arweave gateways failed for %s: %w", uri, lastErr)
	}

	log.Printf("WARN: fetchOffChainMetadataWithFallback: Unsupported URI scheme or non-fetchable URI: %s", uri)
	return nil, fmt.Errorf("unsupported URI scheme or non-fetchable URI: %s", uri)
}

// fetchOffChainMetadataHTTP fetches JSON metadata from the given HTTP URL.
func fetchOffChainMetadataHTTP(url string, httpClient *http.Client) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	// Set a reasonable User-Agent
	req.Header.Set("User-Agent", "DankfolioEnrichmentBot/1.0")

	// Use the passed-in httpClient
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read body for more details, but limit size
		// bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("http status %d for %s", resp.StatusCode, url)
	}

	var offchainMeta map[string]interface{}
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&offchainMeta); err != nil {
		return nil, fmt.Errorf("failed to decode JSON from %s: %w", url, err)
	}
	return offchainMeta, nil
}

// enrichFromMetadata updates coin fields from off-chain metadata (map).
// Handles missing fields gracefully and provides defaults.
func enrichFromMetadata(coin *model.Coin, metadata map[string]interface{}) {
	if metadata == nil {
		// Ensure description has a default if metadata is nil or fetch failed
		if coin.Description == "" {
			coin.Description = fmt.Sprintf("%s (%s) is a Solana token.", coin.Name, coin.Symbol)
		}
		return
	}

	// Description (use existing if metadata is empty)
	if description, ok := metadata["description"].(string); ok && description != "" {
		coin.Description = strings.TrimSpace(description)
	} else if coin.Description == "" { // Only set default if not already set (e.g., by Jupiter) and metadata missing/empty
		coin.Description = fmt.Sprintf("%s (%s) is a Solana token.", coin.Name, coin.Symbol)
	}

	// Website (check multiple common keys)
	if website, ok := metadata["website"].(string); ok && website != "" {
		coin.Website = website
	} else if website, ok := metadata["external_url"].(string); ok && website != "" {
		coin.Website = website
	}

	// Icon/Image URL (only override if current one is empty or clearly a default/placeholder)
	// Let Jupiter logo take precedence if available. Only use metadata image if Jupiter didn't provide one.
	if coin.IconUrl == "" {
		if image, ok := metadata["image"].(string); ok && image != "" {
			coin.IconUrl = image
		} else if image, ok := metadata["logoURI"].(string); ok && image != "" { // Check another common key
			coin.IconUrl = image
		}
	}

	// Social links (check multiple common keys)
	if twitter, ok := metadata["twitter"].(string); ok && twitter != "" {
		coin.Twitter = twitter
	} else if twitter, ok := metadata["extensions"].(map[string]interface{}); ok {
		if tw, ok := twitter["twitter"].(string); ok && tw != "" {
			coin.Twitter = tw
		}
	}

	if telegram, ok := metadata["telegram"].(string); ok && telegram != "" {
		coin.Telegram = telegram
	} else if telegram, ok := metadata["extensions"].(map[string]interface{}); ok {
		if tg, ok := telegram["telegram"].(string); ok && tg != "" {
			coin.Telegram = tg
		}
	}

	// Add more social links if needed (Discord, etc.) following the pattern above

	// Fallback for social links from attributes array (less common now but good backup)
	if attributes, ok := metadata["attributes"].([]interface{}); ok {
		for _, attr := range attributes {
			if attrMap, ok := attr.(map[string]interface{}); ok {
				trait := ""
				value := ""
				if t, ok := attrMap["trait_type"].(string); ok {
					trait = t
				}
				if v, ok := attrMap["value"].(string); ok {
					value = v
				}

				if trait != "" && value != "" {
					switch strings.ToLower(trait) {
					case "twitter":
						if coin.Twitter == "" {
							coin.Twitter = value
						}
					case "telegram":
						if coin.Telegram == "" {
							coin.Telegram = value
						}
					case "website", "url", "external_url":
						if coin.Website == "" {
							coin.Website = value
						}
						// Add other traits if needed
					}
				}
			}
		}
	}

	// Clean up social links (add https:// if missing)
	coin.Twitter = cleanSocialLink(coin.Twitter, "twitter.com")
	coin.Telegram = cleanSocialLink(coin.Telegram, "t.me")
	coin.Website = ensureHttpHttps(coin.Website)

}

// cleanSocialLink ensures a social link points to the correct domain and has https.
func cleanSocialLink(link string, expectedDomain string) string {
	link = strings.TrimSpace(link)
	if link == "" {
		return ""
	}
	// If it's just a handle, prepend the base URL
	if !strings.Contains(link, "/") && !strings.Contains(link, ".") {
		if expectedDomain == "twitter.com" {
			return "https://twitter.com/" + strings.TrimPrefix(link, "@")
		}
		if expectedDomain == "t.me" {
			return "https://t.me/" + link
		}
	}

	// If it's already a URL, ensure it's HTTPS if possible and check domain
	if strings.Contains(link, expectedDomain) {
		return ensureHttpHttps(link)
	}

	// If it's a URL but wrong domain, return empty or log warning? For now return empty.
	log.Printf("WARN: cleanSocialLink: Link '%s' does not seem to belong to domain '%s'", link, expectedDomain)
	return ""
}

// ensureHttpHttps ensures a URL starts with http:// or https://
func ensureHttpHttps(url string) string {
	url = strings.TrimSpace(url)
	if url == "" {
		return ""
	}
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		// Default to https
		return "https://" + url
	}
	return url
}
