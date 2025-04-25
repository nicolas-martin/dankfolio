package coin

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// EnrichCoinData fetches detailed information for a given mint address using Jupiter,
// Solana metadata, and off-chain sources. It populates and returns a model.Coin.
// It takes initial basic info (name, icon, volume) which might come from a preliminary scrape,
// and overwrites/enriches it.
func (s *Service) EnrichCoinData(
	ctx context.Context,
	mintAddress string,
	initialName string,
	initialIconURL string,
	initialVolume float64,
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
	jupiterInfo, err := s.jupiterClient.GetTokenInfo(mintAddress)
	jupiterInfoSuccess := err == nil
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Failed to get Jupiter info for %s: %v. Continuing enrichment.", mintAddress, err)
		// Continue enrichment even if Jupiter info fails, maybe metadata has info.
	} else {
		log.Printf("EnrichCoinData: Got Jupiter token info for %s: %s (%s)", mintAddress, jupiterInfo.Name, jupiterInfo.Symbol)
		// Only override values if they are non-empty/non-zero from Jupiter
		if jupiterInfo.Name != "" {
			coin.Name = jupiterInfo.Name // Overwrite name
		}
		if jupiterInfo.Symbol != "" {
			coin.Symbol = jupiterInfo.Symbol
		}
		if jupiterInfo.Decimals > 0 {
			coin.Decimals = jupiterInfo.Decimals
		}
		if jupiterInfo.LogoURI != "" {
			coin.IconUrl = jupiterInfo.LogoURI // Overwrite icon
		}
		if jupiterInfo.DailyVolume > 0 {
			coin.DailyVolume = jupiterInfo.DailyVolume
		}
		if len(jupiterInfo.Tags) > 0 {
			coin.Tags = jupiterInfo.Tags
		}
		if !jupiterInfo.CreatedAt.IsZero() {
			coin.CreatedAt = jupiterInfo.CreatedAt.Format(time.RFC3339)
		}
	}

	// 2. Get price from Jupiter (even if GetTokenInfo failed, price might work)
	log.Printf("EnrichCoinData: Fetching Jupiter price for %s", mintAddress)
	prices, err := s.jupiterClient.GetTokenPrices([]string{mintAddress})
	jupiterPriceSuccess := err == nil
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Error fetching price for %s: %v", mintAddress, err)
	} else if price, ok := prices[mintAddress]; ok {
		coin.Price = price
		log.Printf("EnrichCoinData: Got Jupiter price for %s: %f", mintAddress, coin.Price)
	} else {
		log.Printf("WARN: EnrichCoinData: Price data not found for %s in Jupiter response", mintAddress)
		jupiterPriceSuccess = false
	}

	// 3. Get Solana on-chain metadata account
	log.Printf("EnrichCoinData: Fetching on-chain metadata account for %s", mintAddress)
	metadataAccount, err := s.solanaClient.GetMetadataAccount(ctx, mintAddress)
	if err != nil {
		log.Printf("WARN: EnrichCoinData: Error fetching on-chain metadata account for %s: %v. Cannot fetch off-chain data.", mintAddress, err)
		// If we can't get the metadata account, we can't get the URI for off-chain metadata.
		// Check if we have any successful data before returning
		if !jupiterInfoSuccess && !jupiterPriceSuccess {
			return nil, fmt.Errorf("failed to enrich coin %s: no data available from any source", mintAddress)
		}
		enrichFromMetadata(&coin, nil) // Ensure default description is set
		return &coin, nil              // Return partially enriched coin since we have some Jupiter data
	}

	// 4. Fetch off-chain metadata using the URI from the on-chain account
	uri := strings.TrimSpace(metadataAccount.Data.Uri)
	log.Printf("EnrichCoinData: Fetching off-chain metadata for %s from URI: %s", mintAddress, uri)
	if uri == "" {
		log.Printf("no URI found for %s, %v", mintAddress, metadataAccount.Data)
		return &coin, nil
	}

	offchainMeta, err := s.offchainClient.FetchMetadata(uri)
	if err != nil {
		log.Printf("❌ EnrichCoinData: Failed to fetch off-chain metadata for %s (URI: %s): %v", mintAddress, uri, err)
		return nil, fmt.Errorf("failed to fetch metadata for %s: %w", mintAddress, err)
	}

	enrichFromMetadata(&coin, offchainMeta)
	return &coin, nil
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
