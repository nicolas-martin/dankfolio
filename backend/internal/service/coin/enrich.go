package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

// EnrichCoinData fetches detailed information for a given mint address using Jupiter,
// Solana metadata, and off-chain sources. It populates and returns a model.Coin.
// It takes initial basic info (name, icon, volume) which might come from a preliminary scrape,
// and overwrites/enriches it.
// It now accepts pre-fetched data from Birdeye/scraping passed as individual fields.
func (s *Service) EnrichCoinData(
	ctx context.Context,
	mintAddress string,
	initialName string,
	initialSymbol string,
	initialIconURL string,
	initialPrice float64,
	initialVolume float64,
	initialMarketCap float64, // Will be used when model.Coin supports it
	initialTags []string,
) (*model.Coin, error) {
	slog.Info("Starting coin enrichment process", slog.String("mintAddress", mintAddress), slog.String("source", "Birdeye+Jupiter+Chain"))

	// Initialize coin with basic info from parameters
	coin := model.Coin{
		MintAddress: mintAddress,
		Name:        initialName,
		Symbol:      initialSymbol,
		IconUrl:     initialIconURL,
		Price:       initialPrice,
		Volume24h:   initialVolume,
		Tags:        initialTags,
		MarketCap:   initialMarketCap,
		CreatedAt:   time.Now().Format(time.RFC3339),
		LastUpdated: time.Now().Format(time.RFC3339),
	}
	slog.Debug("Initialized coin with pre-fetched data", "mintAddress", mintAddress, "name", coin.Name, "symbol", coin.Symbol, "price", coin.Price, "volume", coin.Volume24h)

	// 1. Conditionally Get Jupiter data for basic info (Symbol, Decimals, Name if missing)
	jupiterInfoSuccess := false
	if coin.Symbol == "" || coin.Decimals == 0 || coin.Name == "" {
		slog.Debug("Fetching Jupiter token info for potentially missing fields", slog.String("mintAddress", mintAddress))
		jupiterInfo, err := s.jupiterClient.GetCoinInfo(ctx, mintAddress)
		if err != nil {
			slog.Warn("Failed to get Jupiter info, continuing with Birdeye/scraped data", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		} else {
			jupiterInfoSuccess = true
			slog.Debug("Received Jupiter token info", slog.String("mintAddress", mintAddress), slog.String("name", jupiterInfo.Name), slog.String("symbol", jupiterInfo.Symbol))
			if coin.Name == "" && jupiterInfo.Name != "" {
				coin.Name = jupiterInfo.Name
			}
			if coin.Symbol == "" && jupiterInfo.Symbol != "" {
				coin.Symbol = jupiterInfo.Symbol
			}
			if coin.Decimals == 0 && jupiterInfo.Decimals > 0 {
				coin.Decimals = jupiterInfo.Decimals
			}
			// IconUrl from Birdeye is preferred. Only use Jupiter if Birdeye's was empty and Jupiter's is not.
			if coin.IconUrl == "" && jupiterInfo.LogoURI != "" {
				slog.Debug("Using Jupiter logo as Birdeye logo was empty", slog.String("jupiterIconUrl", jupiterInfo.LogoURI), slog.String("mintAddress", mintAddress))
				coin.IconUrl = jupiterInfo.LogoURI
			}
			// Volume from Birdeye is preferred. Only use Jupiter if Birdeye's was zero/unparsed and Jupiter's is not.
			if coin.Volume24h == 0 && jupiterInfo.DailyVolume > 0 {
				coin.Volume24h = jupiterInfo.DailyVolume
			}
			// Tags from Birdeye are preferred. Merge or overwrite as per desired logic. Here, append if Birdeye's was empty.
			if len(coin.Tags) == 0 && len(jupiterInfo.Tags) > 0 {
				coin.Tags = jupiterInfo.Tags
			}
		}
	} else {
		slog.Debug("Skipping Jupiter GetCoinInfo as essential fields are present from Birdeye", slog.String("mintAddress", mintAddress))
	}

	// 2. Conditionally Get price from Jupiter if not available or invalid from Birdeye
	jupiterPriceSuccess := false
	if coin.Price == 0 { // Assuming 0 means price wasn't valid or available from Birdeye
		slog.Debug("Fetching Jupiter price as Birdeye price was zero/invalid", slog.String("mintAddress", mintAddress))
		prices, err := s.jupiterClient.GetCoinPrices(ctx, []string{mintAddress})
		if err != nil {
			slog.Warn("Error fetching Jupiter price", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		} else if price, ok := prices[mintAddress]; ok && price > 0 {
			coin.Price = price
			jupiterPriceSuccess = true
			slog.Debug("Received Jupiter price", slog.String("mintAddress", mintAddress), slog.Float64("price", coin.Price))
		} else {
			slog.Warn("Price data not found or invalid in Jupiter response", slog.String("mintAddress", mintAddress))
		}
	} else {
		slog.Debug("Skipping Jupiter GetCoinPrices as price is present from Birdeye", slog.String("mintAddress", mintAddress), slog.Float64("price", coin.Price))
		jupiterPriceSuccess = true // Consider Birdeye price as a "success" for pricing
	}

	// 3. Get Generic Token Metadata (which includes on-chain and SPL token info like decimals)
	slog.Debug("Fetching generic token metadata", slog.String("mintAddress", mintAddress))
	genericMetadata, err := s.chainClient.GetTokenMetadata(ctx, bmodel.Address(mintAddress))
	if err != nil {
		slog.Warn("Error fetching generic token metadata", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		// If we can't get any metadata, proceed with what we have (e.g. from Jupiter)
		// Check if we have any successful data before returning
		if !jupiterInfoSuccess && !jupiterPriceSuccess {
			slog.Error("Failed to enrich coin: no data available from any source", slog.String("mintAddress", mintAddress))
			return nil, fmt.Errorf("failed to enrich coin %s: no data available from any source", mintAddress)
		}
		enrichFromMetadata(&coin, nil) // Ensure default description is set and fallbacks for icon
		slog.Info("Returning partially enriched coin (Jupiter data, no on-chain token metadata)", slog.String("mintAddress", mintAddress))
		return &coin, nil // Return partially enriched coin
	}

	// Use decimals and supply from genericMetadata if available and not already set by Jupiter
	if coin.Decimals == 0 && genericMetadata.Decimals > 0 {
		// convert uint8 to int for model.Coin
		coin.Decimals = int(genericMetadata.Decimals)
	}
	// coin.Supply = genericMetadata.Supply // model.Coin doesn't have Supply currently, but could be added

	// Override name/symbol from genericMetadata if they were empty after Jupiter
	if coin.Name == "" && genericMetadata.Name != "" {
		coin.Name = genericMetadata.Name
	}
	if coin.Symbol == "" && genericMetadata.Symbol != "" {
		coin.Symbol = genericMetadata.Symbol
	}

	// 4. Fetch off-chain metadata using the URI from the generic token metadata
	uri := strings.TrimSpace(genericMetadata.URI)
	slog.Info("Fetching off-chain metadata", slog.String("mintAddress", mintAddress), slog.String("uri", uri))
	if uri == "" {
		slog.Warn("No URI found in generic token metadata", slog.String("mintAddress", mintAddress))
		enrichFromMetadata(&coin, nil) // Still call to set default description and icon fallbacks if needed
		return &coin, nil
	}

	offchainMeta, err := s.offchainClient.FetchMetadata(uri)
	if err != nil {
		slog.Error("Failed to fetch off-chain metadata", slog.String("mintAddress", mintAddress), slog.String("uri", uri), slog.Any("error", err))
		// If off-chain fetch fails, still try to apply defaults/fallbacks to Jupiter data.
		enrichFromMetadata(&coin, nil) // Pass nil metadata
		return nil, fmt.Errorf("failed to fetch off-chain metadata for %s from %s: %w", mintAddress, uri, err)
	}

	// IPFS resolution logic has been removed.
	// coin.ResolvedIconUrl will not be populated by this backend service.

	enrichFromMetadata(&coin, offchainMeta) // Pass original offchainMeta
	slog.Info("Coin metadata enriched from off-chain data", slog.Any("coin", coin))

	// NOTE: Try without resolving IPFS URLs in this service.
	// We removed cloudflare
	coin.ResolvedIconUrl = coin.IconUrl
	// coin.ResolvedIconUrl = util.StandardizeIpfsUrl(coin.IconUrl)
	// if coin.ResolvedIconUrl != coin.IconUrl && coin.ResolvedIconUrl != "" {
	// 	slog.Debug("Standardized IPFS URL", slog.String("original", coin.IconUrl), slog.String("resolved", coin.ResolvedIconUrl), slog.String("mintAddress", mintAddress))
	// }

	// Ensure LastUpdated is set
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	slog.Info("Coin enrichment process completed", slog.String("mintAddress", mintAddress))
	return &coin, nil
}

// enrichFromMetadata updates coin fields from off-chain metadata (map).
// Handles missing fields gracefully and provides defaults.
func enrichFromMetadata(coin *model.Coin, metadata map[string]any) {
	if metadata == nil {
		// Ensure description has a default if metadata is nil or fetch failed
		populateDescriptionFromMetadata(coin, nil)
		return
	}

	populateDescriptionFromMetadata(coin, metadata)
	populateWebsiteFromMetadata(coin, metadata)
	populateIconFromMetadata(coin, metadata)        // Populates coin.IconUrl from non-IPFS sources
	populateSocialLinksFromMetadata(coin, metadata) // Handles all social links
}

func populateDescriptionFromMetadata(coin *model.Coin, metadata map[string]any) {
	if metadata != nil {
		if description, ok := metadata["description"].(string); ok && description != "" {
			coin.Description = strings.TrimSpace(description)
			return // Description found in metadata
		}
	}
	// Set default only if not already set (e.g., by Jupiter) and metadata missing/empty or description not found
	if coin.Description == "" {
		defaultDesc := "A Solana token."
		if coin.Name != "" && coin.Symbol != "" {
			defaultDesc = fmt.Sprintf("%s (%s) is a Solana token.", coin.Name, coin.Symbol)
		} else if coin.Name != "" {
			defaultDesc = fmt.Sprintf("%s is a Solana token.", coin.Name)
		} else if coin.Symbol != "" {
			defaultDesc = fmt.Sprintf("%s is a Solana token.", coin.Symbol)
		}
		coin.Description = defaultDesc
	}
}

func populateWebsiteFromMetadata(coin *model.Coin, metadata map[string]any) {
	if metadata == nil {
		return
	}
	if website, ok := metadata["website"].(string); ok && website != "" {
		coin.Website = ensureHttpHttps(website)
	} else if externalURL, ok := metadata["external_url"].(string); ok && externalURL != "" {
		coin.Website = ensureHttpHttps(externalURL)
	}
}

func populateIconFromMetadata(coin *model.Coin, metadata map[string]any) {
	if metadata == nil {
		return
	}
	// Let Jupiter logo take precedence. Only use metadata image if Jupiter didn't provide one (coin.IconUrl is empty).
	if coin.IconUrl == "" {
		if image, ok := metadata["image"].(string); ok && image != "" {
			coin.IconUrl = image
		} else if logoURI, ok := metadata["logoURI"].(string); ok && logoURI != "" { // Check another common key
			coin.IconUrl = logoURI
		}
	}
}

func populateSocialLinksFromMetadata(coin *model.Coin, metadata map[string]any) {
	if metadata == nil {
		return
	}

	// Direct keys
	if twitter, ok := metadata["twitter"].(string); ok && twitter != "" {
		coin.Twitter = twitter
	}
	if telegram, ok := metadata["telegram"].(string); ok && telegram != "" {
		coin.Telegram = telegram
	}

	// Extensions
	if extensions, ok := metadata["extensions"].(map[string]any); ok {
		if coin.Twitter == "" {
			if tw, ok := extensions["twitter"].(string); ok && tw != "" {
				coin.Twitter = tw
			}
		}
		if coin.Telegram == "" {
			if tg, ok := extensions["telegram"].(string); ok && tg != "" {
				coin.Telegram = tg
			}
		}
	}

	// Attributes array
	if attributes, ok := metadata["attributes"].([]any); ok {
		for _, attr := range attributes {
			if attrMap, ok := attr.(map[string]any); ok {
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
					case "website", "url", "external_url": // Also populate website from attributes if not already set
						if coin.Website == "" {
							coin.Website = value
						}
					}
				}
			}
		}
	}

	// Clean up social links
	coin.Twitter = cleanSocialLink(coin.Twitter, "twitter.com")
	coin.Telegram = cleanSocialLink(coin.Telegram, "t.me")
	// Website is cleaned directly where it's populated or via attributes.
	// If populated via attributes, ensureHttpHttps is called here.
	if val, ok := metadata["attributes"]; ok { // Check if attributes were processed for website
		if _, ok := val.([]any); ok {
			coin.Website = ensureHttpHttps(coin.Website)
		}
	}
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
	slog.Warn("Link does not seem to belong to expected domain", slog.String("link", link), slog.String("expectedDomain", expectedDomain))
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
