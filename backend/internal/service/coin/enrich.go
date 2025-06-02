package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

var defaultCIDv0Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/", // Pinata is generally more reliable
	"https://ipfs.io/ipfs/",              // Promoted fallback
	"https://dweb.link/ipfs/",            // Protocol Labs' newer gateway
	// "https://cloudflare-ipfs.com/ipfs/",  // Cloudflare has DNS issues from sandbox
}

var defaultCIDv1Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/", // Usually reliable
	"https://ipfs.io/ipfs/",              // Fallback, but known to be slow/problematic sometimes
	// "https://cloudflare-ipfs.com/ipfs/", // Keep commented out or at end due to DNS issues
	// "https://dweb.link/ipfs/",           // Keep commented out or at end due to timeout issues
}

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
	slog.Info("Starting coin enrichment process", slog.String("mintAddress", mintAddress))

	// Initialize coin with basic info or defaults
	coin := model.Coin{
		MintAddress: mintAddress,
		Name:        initialName,
		IconUrl:     initialIconURL,
		Volume24h:   initialVolume,
		CreatedAt:   time.Now().Format(time.RFC3339),
		LastUpdated: time.Now().Format(time.RFC3339),
	}

	// 1. Get Jupiter data for basic info & price (overwrites initial values if found)
	slog.Debug("Fetching Jupiter token info", slog.String("mintAddress", mintAddress))
	jupiterInfo, err := s.jupiterClient.GetCoinInfo(ctx, mintAddress)
	jupiterInfoSuccess := err == nil
	if err != nil {
		slog.Warn("Failed to get Jupiter info, continuing enrichment", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		// Continue enrichment even if Jupiter info fails, maybe metadata has info.
	} else {
		slog.Debug("Received Jupiter token info", slog.String("mintAddress", mintAddress), slog.String("name", jupiterInfo.Name), slog.String("symbol", jupiterInfo.Symbol))
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
			slog.Debug("Overwriting icon URL with Jupiter logo", slog.String("oldIconUrl", coin.IconUrl), slog.String("newIconUrl", jupiterInfo.LogoURI), slog.String("mintAddress", mintAddress))
			coin.IconUrl = jupiterInfo.LogoURI // Overwrite icon
		}
		if jupiterInfo.DailyVolume > 0 {
			coin.Volume24h = jupiterInfo.DailyVolume
		}
		if len(jupiterInfo.Tags) > 0 {
			coin.Tags = jupiterInfo.Tags
		}
	}

	// 2. Get price from Jupiter (even if GetTokenInfo failed, price might work)
	slog.Debug("Fetching Jupiter price", slog.String("mintAddress", mintAddress))
	prices, err := s.jupiterClient.GetCoinPrices(ctx, []string{mintAddress})
	jupiterPriceSuccess := err == nil
	if err != nil {
		slog.Warn("Error fetching Jupiter price", slog.String("mintAddress", mintAddress), slog.Any("error", err))
	} else if price, ok := prices[mintAddress]; ok {
		coin.Price = price
		slog.Debug("Received Jupiter price", slog.String("mintAddress", mintAddress), slog.Float64("price", coin.Price))
	} else {
		slog.Warn("Price data not found in Jupiter response", slog.String("mintAddress", mintAddress))
		jupiterPriceSuccess = false
	}

	// 3. Get Solana on-chain metadata account
	slog.Debug("Fetching on-chain metadata account", slog.String("mintAddress", mintAddress))
	metadataAccount, err := s.solanaClient.GetMetadataAccount(ctx, mintAddress)
	if err != nil {
		slog.Warn("Error fetching on-chain metadata account, cannot fetch off-chain data", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		// If we can't get the metadata account, we can't get the URI for off-chain metadata.
		// Check if we have any successful data before returning
		if !jupiterInfoSuccess && !jupiterPriceSuccess {
			slog.Error("Failed to enrich coin: no data available from any source", slog.String("mintAddress", mintAddress))
			return nil, fmt.Errorf("failed to enrich coin %s: no data available from any source", mintAddress)
		}
		enrichFromMetadata(&coin, nil) // Ensure default description is set and fallbacks for icon
		slog.Info("Returning partially enriched coin (Jupiter data only)", slog.String("mintAddress", mintAddress))
		return &coin, nil // Return partially enriched coin since we have some Jupiter data
	}

	// 4. Fetch off-chain metadata using the URI from the on-chain account
	uri := strings.TrimSpace(metadataAccount.Data.Uri)
	slog.Debug("Fetching off-chain metadata", slog.String("mintAddress", mintAddress), slog.String("uri", uri))
	if uri == "" {
		slog.Warn("No URI found in on-chain metadata", slog.String("mintAddress", mintAddress), slog.Any("metadataData", metadataAccount.Data))
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

	slog.Debug("Starting icon validation process", slog.String("mintAddress", mintAddress), slog.String("initialIconUrl", coin.IconUrl))

	if coin.IconUrl == "" {
		slog.Debug("Icon URL is empty, skipping validation.", slog.String("mintAddress", mintAddress))
		coin.ResolvedIconUrl = ""
	} else {
		candidateResolvedUrl := s.standardizeIpfsUrl(coin.IconUrl)

		if candidateResolvedUrl == "" {
			slog.Warn("Standardizing IconUrl resulted in an empty string.", slog.String("mintAddress", mintAddress), slog.String("originalIconUrl", coin.IconUrl))
			coin.IconUrl = "" // Clear original as well if standardization fails
			coin.ResolvedIconUrl = ""
		} else {
			slog.Debug("Standardized IconUrl for validation", slog.String("mintAddress", mintAddress), slog.String("original", coin.IconUrl), slog.String("standardized", candidateResolvedUrl))

			isValid, reasonOrURL, validationErr := s.offchainClient.VerifyDirectImageAccess(ctx, candidateResolvedUrl)

			// Define isIPFS based on the candidateResolvedUrl (which is standardized) or original coin.IconUrl
			isIPFS := strings.HasPrefix(candidateResolvedUrl, "https://gateway.pinata.cloud/ipfs/") ||
				strings.HasPrefix(candidateResolvedUrl, "https://ipfs.io/ipfs/") ||
				strings.HasPrefix(candidateResolvedUrl, "https://cloudflare-ipfs.com/ipfs/") || // Keep for completeness even if not primary
				strings.HasPrefix(candidateResolvedUrl, "https://dweb.link/ipfs/") || // Keep for completeness
				strings.HasPrefix(coin.IconUrl, "ipfs://") // Check original scheme as well

			if isValid {
				slog.Info("Icon successfully validated", slog.String("mintAddress", mintAddress), slog.String("resolvedIconUrl", reasonOrURL))
				coin.ResolvedIconUrl = reasonOrURL // reasonOrURL is the validated URL if isValid is true
			} else {
				slog.Warn("Icon validation failed",
					slog.String("mintAddress", mintAddress),
					slog.String("urlAttempted", candidateResolvedUrl),
					slog.String("reason", reasonOrURL),
					slog.Any("error", validationErr))

				// Default to discarding the icon by emptying ResolvedIconUrl
				resolvedIconUrlToSet := ""
				originalIconUrlToSet := coin.IconUrl // By default, keep original IconUrl unless specific discard logic clears it

				// Nuanced handling for IPFS URLs:
				// If it's an IPFS URL and the failure reason suggests a gateway/network issue or redirect,
				// we might still use the standardized URL. Otherwise, discard it.
				isGatewayIssue := false
				if validationErr != nil { // Ensure validationErr is not nil before trying to access its contents
					errStr := validationErr.Error()
					isGatewayIssue = reasonOrURL == "network_error" ||
						(reasonOrURL == "non_200_status" && (strings.Contains(errStr, "429") || strings.Contains(errStr, "504") || strings.Contains(errStr, "502") || strings.Contains(errStr, "timeout")))
				}
				isRedirect := reasonOrURL == "redirect_attempted"

				if isIPFS && (isGatewayIssue || isRedirect) {
					slog.Warn("IPFS icon validation failed due to gateway issue or redirect, but using standardized URL as fallback.",
						slog.String("mintAddress", mintAddress),
						slog.String("resolvedIconUrlToUse", candidateResolvedUrl),
						slog.String("reason", reasonOrURL))
					resolvedIconUrlToSet = candidateResolvedUrl // Trust the standardized URL
				} else {
					// For non-IPFS URLs, or IPFS URLs with definitive content errors (e.g. not an image, 404 for the content itself)
					slog.Warn("Discarding icon due to validation failure.", slog.String("mintAddress", mintAddress), slog.String("url", candidateResolvedUrl), slog.String("reason", reasonOrURL))
					originalIconUrlToSet = "" // Also clear the original potentially problematic URL
					// resolvedIconUrlToSet remains "" (empty)
				}
				coin.ResolvedIconUrl = resolvedIconUrlToSet
				coin.IconUrl = originalIconUrlToSet // Update IconUrl only if we decide to discard it
			}
		}
	}

	// Ensure LastUpdated is set
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	slog.Info("Coin enrichment process completed", slog.String("mintAddress", mintAddress))
	return &coin, nil
}

func (s *Service) standardizeIpfsUrl(iconUrlInput string) string {
	if iconUrlInput == "" {
		return ""
	}

	// Check if it's an IPFS gateway URL (contains "/ipfs/")
	if strings.Contains(iconUrlInput, "/ipfs/") {
		// Extract IPFS hash part (the part after "/ipfs/")
		parts := strings.SplitN(iconUrlInput, "/ipfs/", 2)
		if len(parts) < 2 || parts[1] == "" {
			return iconUrlInput // Malformed or nothing after /ipfs/, return original
		}

		ipfsPathContent := parts[1] // This is <hash_or_cid_or_cid_with_path_and_query>

		var ipfsResourceIdentifier string
		if queryIdx := strings.Index(ipfsPathContent, "?"); queryIdx != -1 {
			ipfsResourceIdentifier = ipfsPathContent[:queryIdx]
		} else {
			ipfsResourceIdentifier = ipfsPathContent
		}

		firstPathComponent := strings.SplitN(ipfsResourceIdentifier, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 {
			// It's CIDv0. Use the first default gateway.
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return defaultCIDv0Gateways[0] + ipfsResourceIdentifier // ipfsResourceIdentifier already includes path and query
		} else {
			// It's CIDv1 or other (non-CIDv0). Use the first default CIDv1 gateway.
			if len(defaultCIDv1Gateways) == 0 {
				slog.Error("No default CIDv1 gateways configured for HTTP gateway URL.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			// ipfsResourceIdentifier here is <CIDv1_or_other><optional_path_and_query>
			return defaultCIDv1Gateways[0] + ipfsResourceIdentifier
		}
	} else if strings.HasPrefix(iconUrlInput, "ipfs://") {
		// Handle raw ipfs:// URIs
		trimmedCidAndPath := strings.TrimPrefix(iconUrlInput, "ipfs://")
		if trimmedCidAndPath == "" {
			slog.Warn("Empty content after ipfs:// scheme", "url", iconUrlInput)
			return "" // Or return iconUrlInput if preferred for empty path
		}

		firstPathComponent := strings.SplitN(trimmedCidAndPath, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 {
			// It's CIDv0. Use the first default gateway.
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured for raw CIDv0 URI.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return defaultCIDv0Gateways[0] + trimmedCidAndPath // trimmedCidAndPath includes full path and query
		} else {
			// It's CIDv1 or other (non-CIDv0). Use the first default CIDv1 gateway.
			if len(defaultCIDv1Gateways) == 0 {
				slog.Error("No default CIDv1 gateways configured for raw CIDv1 URI.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			// trimmedCidAndPath is <CIDv1_or_other><optional_path_and_query>
			return defaultCIDv1Gateways[0] + trimmedCidAndPath
		}
	}

	// Not an IPFS gateway URL and not a raw ipfs:// URI, return as is
	return iconUrlInput
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
