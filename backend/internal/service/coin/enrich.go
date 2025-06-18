package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye" // Added for birdeye.TokenDetails
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

// EnrichCoinData fetches detailed information for a given mint address using Jupiter,
// Solana metadata, and off-chain sources. It populates and returns a model.Coin.
// It takes initial basic info (name, icon, volume) which might come from a preliminary scrape,
// and overwrites/enriches it.
// Solana metadata, and off-chain sources. It populates and returns a model.Coin.
// It uses initial data from birdeye.TokenDetails and enriches it.
func (s *Service) EnrichCoinData(
	ctx context.Context,
	initialData *birdeye.TokenDetails, // Changed from many params to this one
) (*model.Coin, error) {
	if initialData == nil {
		return nil, fmt.Errorf("initialData cannot be nil")
	}

	slog.Info("Starting coin enrichment process", slog.String("mintAddress", initialData.Address), slog.String("source", "BirdeyeDetails+Chain+OffChain"))

	// Initialize coin with basic info from initialData
	coin := model.Coin{
		Address:                initialData.Address,
		Name:                   initialData.Name,
		Symbol:                 initialData.Symbol,
		LogoURI:                initialData.LogoURI,
		Price:                  initialData.Price,
		Volume24hUSD:           initialData.Volume24hUSD,
		Marketcap:              initialData.MarketCap,
		Tags:                   initialData.Tags,
		Liquidity:              initialData.Liquidity,
		Volume24hChangePercent: initialData.Volume24hChangePercent,
		FDV:                    initialData.FDV,
		Rank:                   initialData.Rank,
		Price24hChangePercent:  initialData.Price24hChangePercent,
		Decimals:               initialData.Decimals,
		// System timestamps
		CreatedAt:   time.Now().Format(time.RFC3339),
		LastUpdated: time.Now().Format(time.RFC3339),
	}
	slog.Debug("Initialized coin with pre-fetched data", "mintAddress", initialData.Address, "name", coin.Name, "symbol", coin.Symbol, "price", coin.Price, "volume", coin.Volume24hUSD)

	// Jupiter info fetching removed. Relying on initial data and chain metadata.
	// Jupiter price fetching removed. Relying on initial data.

	// 3. Get Generic Token Metadata (which includes on-chain and SPL token info like decimals)
	slog.Debug("Fetching generic token metadata", slog.String("mintAddress", initialData.Address))
	genericMetadata, err := s.chainClient.GetTokenMetadata(ctx, bmodel.Address(initialData.Address))
	if err != nil {
		slog.Warn("Error fetching generic token metadata", slog.String("mintAddress", initialData.Address), slog.Any("error", err))
		// If chain metadata fetch fails, check if we have essential info from initial parameters.
		// If not (e.g., no name/symbol), then it's a critical failure.
		if coin.Name == "" && coin.Symbol == "" { // Name/Symbol should be populated from initialData now
			slog.Error("Failed to enrich coin: no name/symbol from initialData and chain metadata fetch failed", slog.String("mintAddress", initialData.Address))
			return nil, fmt.Errorf("failed to enrich coin %s: essential data missing (Name/Symbol) and chain metadata unavailable", initialData.Address)
		}
		enrichFromMetadata(&coin, nil) // Ensure default description is set and fallbacks for icon based on available data.
		slog.Info("Returning partially enriched coin (initial data, no on-chain token metadata due to fetch error)", slog.String("mintAddress", initialData.Address))
		return &coin, nil // Return partially enriched coin (with initial data)
	}

	// Use decimals from genericMetadata if available and not already set by initialData (Birdeye)
	// model.Coin.Decimals is int, genericMetadata.Decimals is uint8
	if coin.Decimals == 0 && genericMetadata.Decimals > 0 {
		coin.Decimals = int(genericMetadata.Decimals)
	}
	// coin.Supply = genericMetadata.Supply // model.Coin doesn't have Supply currently, but could be added

	// Override name/symbol from genericMetadata if they were empty after using initialData
	// This is less likely now as Birdeye usually provides Name/Symbol.
	if coin.Name == "" && genericMetadata.Name != "" {
		coin.Name = genericMetadata.Name
	}
	if coin.Symbol == "" && genericMetadata.Symbol != "" {
		coin.Symbol = genericMetadata.Symbol
	}

	// 4. Fetch off-chain metadata using the URI from the generic token metadata
	uri := strings.TrimSpace(genericMetadata.URI)
	slog.Info("Fetching off-chain metadata", slog.String("mintAddress", initialData.Address), slog.String("uri", uri))
	if uri == "" {
		slog.Warn("No URI found in generic token metadata", slog.String("mintAddress", initialData.Address))
		enrichFromMetadata(&coin, nil) // Still call to set default description and icon fallbacks if needed
		return &coin, nil
	}

	offchainMeta, err := s.offchainClient.FetchMetadata(uri)
	if err != nil {
		slog.Error("Failed to fetch off-chain metadata", slog.String("mintAddress", initialData.Address), slog.String("uri", uri), slog.Any("error", err))
		// If off-chain fetch fails, still try to apply defaults/fallbacks to existing coin data.
		enrichFromMetadata(&coin, nil) // Pass nil metadata
		// It's better to return the partially enriched coin than an error here,
		// as off-chain metadata is supplementary.
		slog.Warn("Proceeding with coin data after off-chain metadata fetch failure", slog.String("mintAddress", initialData.Address))
		// Ensure LastUpdated is set before returning partially enriched coin
		coin.LastUpdated = time.Now().Format(time.RFC3339)
		return &coin, nil
		// return nil, fmt.Errorf("failed to fetch off-chain metadata for %s from %s: %w", initialData.Address, uri, err) // Previous behaviour
	}

	// IPFS resolution logic has been removed.
	// coin.ResolvedIconUrl will not be populated by this backend service.

	enrichFromMetadata(&coin, offchainMeta) // Pass original offchainMeta
	slog.Info("Coin metadata enriched from off-chain data", slog.Any("coin", coin))

	// NOTE: Try without resolving IPFS URLs in this service.
	// We removed cloudflare
	coin.ResolvedIconUrl = coin.LogoURI
	// coin.ResolvedIconUrl = util.StandardizeIpfsUrl(coin.IconUrl)
	// if coin.ResolvedIconUrl != coin.IconUrl && coin.ResolvedIconUrl != "" {
	// 	slog.Debug("Standardized IPFS URL", slog.String("original", coin.IconUrl), slog.String("resolved", coin.ResolvedIconUrl), slog.String("mintAddress", initialData.Address))
	// }

	// Ensure LastUpdated is set
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	slog.Info("Coin enrichment process completed", slog.String("mintAddress", initialData.Address))
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
	// Let initialIconURL (passed as parameter) take precedence. Only use metadata image if initialIconURL was empty (coin.LogoURI is empty).
	if coin.LogoURI == "" {
		if image, ok := metadata["image"].(string); ok && image != "" {
			coin.LogoURI = image
		} else if logoURI, ok := metadata["logoURI"].(string); ok && logoURI != "" { // Check another common key
			coin.LogoURI = logoURI
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
		if expectedDomain == "x.com" {
			return "https://x.com/" + strings.TrimPrefix(link, "@")
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
