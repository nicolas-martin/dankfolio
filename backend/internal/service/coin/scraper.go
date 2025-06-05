package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/chromedp"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// --- Constants moved from cmd/solana-trending-scrape ---
const (
	findGemsURL               = "https://birdeye.so/find-gems?chain=solana"
	scrapeDefaultTimeout      = 30 * time.Second
	scrapeMaxConcurrentEnrich = 5 // Limit concurrency for enrichment API calls
	maxTrendingCount          = 10
)

type scrapedTokenInfo struct {
	MintAddress string `json:"mint_address"`
	Name        string `json:"name"`
	Price       string `json:"price"`
	Change24h   string `json:"change_24h"`
	Volume24h   string `json:"volume_24h"`
	MarketCap   string `json:"market_cap"`
	IconURL     string `json:"icon_url"`
}

// ScrapeAndEnrichToFile orchestrates the scraping and enrichment process.
func (s *Service) ScrapeAndEnrichToFile(ctx context.Context) (*EnrichedFileOutput, error) {
	slog.Info("Starting Solana trending token scrape and enrichment process...")

	// Step 1: Scrape basic info using Chromedp
	scrapedTokens, err := s.scrapeBasicTokenInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed during basic token scraping: %w", err)
	}
	if len(scrapedTokens) == 0 {
		return nil, fmt.Errorf("no tokens were successfully scraped from the modal, cannot proceed")
	}
	slog.Info("Successfully scraped basic info for tokens", "count", len(scrapedTokens))

	// Step 2: Enrich the scraped tokens concurrently
	enrichedCoins, err := s.enrichScrapedTokens(ctx, scrapedTokens)
	if err != nil {
		return nil, fmt.Errorf("encountered errors during enrichment process: %v", err)
	}
	if len(enrichedCoins) == 0 {
		return nil, fmt.Errorf("enrichment process completed, but no tokens were successfully enriched (or survived errors)")
	}
	slog.Info("Enrichment process complete", "successful_tokens", len(enrichedCoins))

	// Step 3: Prepare and save the final output
	finalOutput := &EnrichedFileOutput{
		ScrapeTimestamp: time.Now(),
		Coins:           enrichedCoins,
	}

	// Log summary before saving
	slog.Info("--- Saving Enriched Solana Tokens Data ---")
	slog.Info("Preparing to save enriched data",
		"timestamp", finalOutput.ScrapeTimestamp.Format(time.RFC3339),
		"total_coins", len(finalOutput.Coins))

	// Optionally log details of first few tokens
	for i, t := range finalOutput.Coins {
		if i >= 3 {
			slog.Info("...")
			break
		}
		slog.Info("Token details",
			"index", i,
			"mint", t.MintAddress,
			"name", t.Name,
			"symbol", t.Symbol,
			"price", t.Price,
			"volume_24h", t.Volume24h)
	}

	return finalOutput, nil
}

// ScrapeBasicTokenInfo handles the browser automation part to get initial token details.
// Exported for testing.
func (s *Service) scrapeBasicTokenInfo(ctx context.Context) ([]scrapedTokenInfo, error) {
	path := chromePath()
	if path == "" {
		panic("unsupported OS: no Chrome binary found")
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx,
		chromedp.DisableGPU,
		chromedp.Headless,
		chromedp.NoSandbox,
		chromedp.ExecPath(path),
	)
	defer cancelAlloc()

	taskCtx, cancelTask := chromedp.NewContext(allocCtx)
	defer cancelTask()

	timeoutCtx, cancel := context.WithTimeout(taskCtx, scrapeDefaultTimeout)
	defer cancel()

	// 1) Navigate and wait for the table rows
	if err := chromedp.Run(timeoutCtx,
		chromedp.Navigate(findGemsURL),
		chromedp.WaitReady("tbody tr", chromedp.ByQuery),
	); err != nil {
		return nil, fmt.Errorf("navigation failed: %w", err)
	}

	// 2) Collect up to 10 row nodes
	var rows []*cdp.Node
	if err := chromedp.Run(timeoutCtx,
		chromedp.Nodes("tbody tr", &rows, chromedp.ByQueryAll),
	); err != nil {
		return nil, fmt.Errorf("listing rows failed: %w", err)
	}
	limit := min(len(rows), maxTrendingCount)

	var result []scrapedTokenInfo
	for _, row := range rows[:limit] {
		rowCtx, cancelRow := context.WithTimeout(timeoutCtx, 5*time.Second)
		defer cancelRow()

		// Extract variables
		var nameRaw, href, iconURL, priceRaw, changeRaw, volumeRaw, capRaw string

		// Helper for selectors scoped to each row
		sel := func(col int, sub string) string {
			if sub != "" {
				return fmt.Sprintf("td:nth-child(%d) %s", col, sub)
			}
			return fmt.Sprintf("td:nth-child(%d)", col)
		}

		// Name & href & correct token icon in column 2
		if err := chromedp.Run(rowCtx,
			chromedp.Text(sel(2, "a div.truncate:first-child"), &nameRaw, chromedp.ByQuery, chromedp.FromNode(row)),
			chromedp.AttributeValue(sel(2, "a"), "href", &href, nil, chromedp.ByQuery, chromedp.FromNode(row)),
			chromedp.AttributeValue(sel(2, "div.relative > div:nth-child(2) img"), "src", &iconURL, nil, chromedp.ByQuery, chromedp.FromNode(row)),
		); err != nil {
			slog.Error("Name/icon extraction failed", "error", err)
			continue
		}
		name := strings.TrimSpace(nameRaw)

		// Mint address from href
		mint := ""
		if parts := strings.Split(href, "/token/"); len(parts) > 1 {
			mint = strings.Split(parts[1], "?")[0]
		}

		// Price in column 4 nested divs
		if err := chromedp.Run(rowCtx,
			chromedp.Text(sel(4, "div div"), &priceRaw, chromedp.ByQuery, chromedp.FromNode(row)),
		); err != nil {
			slog.Error("Price extraction failed", "error", err)
		}
		price := strings.TrimSpace(priceRaw)

		// Change 24h in column 5 (remove %)
		if err := chromedp.Run(rowCtx,
			chromedp.Text(sel(5, "span"), &changeRaw, chromedp.ByQuery, chromedp.FromNode(row)),
		); err != nil {
			slog.Error("Change extraction failed", "error", err)
		}
		change := strings.TrimSuffix(strings.TrimSpace(changeRaw), "%")

		// Volume in column 6 (first nested div, remove $)
		if err := chromedp.Run(rowCtx,
			chromedp.Text(sel(6, "div.text-right.min-w-28 > div"), &volumeRaw, chromedp.ByQuery, chromedp.FromNode(row)),
		); err != nil {
			slog.Error("Volume extraction failed", "error", err)
		}
		volume := strings.TrimPrefix(strings.TrimSpace(volumeRaw), "$")

		// Market Cap in column 7 (first nested div, remove $)
		if err := chromedp.Run(rowCtx,
			chromedp.Text(sel(7, "div"), &capRaw, chromedp.ByQuery, chromedp.FromNode(row)),
		); err != nil {
			slog.Error("Market cap extraction failed", "error", err)
		}
		marketCap := strings.TrimPrefix(strings.TrimSpace(capRaw), "$")
		iconURL = strings.TrimSpace(iconURL)

		result = append(result, scrapedTokenInfo{
			MintAddress: mint,
			Name:        name,
			Price:       price,
			Change24h:   change,
			Volume24h:   volume,
			MarketCap:   marketCap,
			IconURL:     iconURL,
		})
		slog.Debug("Scraped token info",
			"mint", mint,
			"name", name,
			"price", price,
			"change", change,
			"volume", volume,
			"market_cap", marketCap,
			"icon_url", iconURL)
	}

	return result, nil
}

// enrichScrapedTokens takes basic scraped info and enriches it using external APIs concurrently.
func (s *Service) enrichScrapedTokens(ctx context.Context, tokensToEnrich []scrapedTokenInfo) ([]model.Coin, error) {
	slog.Info("Executing token enrichment",
		"token_count", len(tokensToEnrich),
		"concurrency", scrapeMaxConcurrentEnrich)

	enrichedCoins := make([]model.Coin, 0, len(tokensToEnrich))
	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, scrapeMaxConcurrentEnrich)
	var encounteredErrors []error
	var errMu sync.Mutex // Mutex to protect encounteredErrors slice

	// Derive a context for the enrichment phase from the incoming context
	// Allow roughly 20s per token enrichment as a timeout for this phase.
	enrichPhaseTimeout := time.Duration(len(tokensToEnrich)*20) * time.Second
	enrichCtx, cancelEnrich := context.WithTimeout(ctx, enrichPhaseTimeout)
	defer cancelEnrich()

	for _, scrapedToken := range tokensToEnrich {
		wg.Add(1)
		sem <- struct{}{} // Acquire semaphore slot

		go func(token scrapedTokenInfo) {
			defer wg.Done()
			defer func() { <-sem }() // Release semaphore slot

			// Create a context for this specific enrichment task
			enrichTaskCtx, enrichTaskCancel := context.WithTimeout(enrichCtx, 45*time.Second) // Timeout for one token
			defer enrichTaskCancel()

			slog.Debug("Enriching token", "name", token.Name, "mint_address", token.MintAddress)

			initialVolume, err := parseVolume(token.Volume24h)
			if err != nil {
				slog.Warn("Failed to parse volume",
					"volume_str", token.Volume24h,
					"name", token.Name,
					"mint_address", token.MintAddress,
					"error", err)
				initialVolume = 0
			}

			enriched, err := s.EnrichCoinData(
				enrichTaskCtx, // Use the task-specific context
				token.MintAddress,
				token.Name,
				token.IconURL,
				initialVolume,
			)
			if err != nil {
				errMessage := fmt.Sprintf("Failed EnrichCoinData for %s (%s): %v", token.Name, token.MintAddress, err)
				slog.Error("Enrichment failed",
					"name", token.Name,
					"mint_address", token.MintAddress,
					"error", err)
				// Record the error
				errMu.Lock()
				encounteredErrors = append(encounteredErrors, fmt.Errorf("%s", errMessage)) // Append formatted error
				errMu.Unlock()
				// Decide whether to add partial data if available
				if enriched == nil {
					return // Skip if enrichment critically failed
				}
				slog.Warn("Adding partially enriched data despite error", "name", token.Name)
			}

			if enriched == nil {
				slog.Error("EnrichCoinData returned nil without explicit error",
					"name", token.Name,
					"mint_address", token.MintAddress)
				return
			}

			// Add successfully (or partially) enriched coin
			mu.Lock()
			enriched.IsTrending = true
			enrichedCoins = append(enrichedCoins, *enriched)
			mu.Unlock()
			slog.Info("Successfully processed enrichment", "name", enriched.Name, "mint_address", enriched.MintAddress)
		}(scrapedToken)
	}

	wg.Wait()
	close(sem)

	// Check if any errors occurred during enrichment
	if len(encounteredErrors) > 0 {
		// Log that errors occurred, but don't return an error here.
		// We want to proceed to save the partially enriched data.
		slog.Warn("Enrichment finished with errors, proceeding with successful tokens",
			"error_count", len(encounteredErrors))
		// return enrichedCoins, fmt.Errorf("enrichment failed for one or more tokens (first error: %w)", encounteredErrors[0])
	}

	// This logging might be redundant now, consider removing or adjusting
	slog.Info("Enrichment summary",
		"successful_tokens", len(enrichedCoins),
		"error_count", len(encounteredErrors))

	// This block seems like a leftover from previous attempts, ensure it's fully commented or removed if the above check handles it.
	// if len(encounteredErrors) > 0 {
	// 	log.Printf("Enrichment finished with %d errors. Proceeding to save successfully enriched tokens.", len(encounteredErrors))
	// 	// Don't return the error here, allow saving partial results.
	// 	// return fmt.Errorf("encountered errors during enrichment process: %w", encounteredErrors[0])
	// }

	return enrichedCoins, nil // Return successfully enriched coins and nil error
}

// parseVolume converts volume strings like "$1.23M", "$500.5K", "$100" to float64
// Moved from cmd/solana-trending-scrape/main.go
func parseVolume(volumeStr string) (float64, error) {
	volumeStr = strings.TrimPrefix(volumeStr, "$")
	volumeStr = strings.ReplaceAll(volumeStr, ",", "") // Remove commas
	multiplier := 1.0

	if strings.HasSuffix(volumeStr, "M") {
		multiplier = 1_000_000
		volumeStr = strings.TrimSuffix(volumeStr, "M")
	} else if strings.HasSuffix(volumeStr, "K") {
		multiplier = 1_000
		volumeStr = strings.TrimSuffix(volumeStr, "K")
	} else if strings.HasSuffix(volumeStr, "B") { // Handle billions
		multiplier = 1_000_000_000
		volumeStr = strings.TrimSuffix(volumeStr, "B")
	}

	volumeStr = strings.TrimSpace(volumeStr)
	if volumeStr == "" || volumeStr == "--" || volumeStr == "-" { // Handle cases where volume isn't available
		return 0, nil // Return 0 volume, not an error
	}

	volume, err := strconv.ParseFloat(volumeStr, 64)
	if err != nil {
		// Don't log WARN here, let caller decide based on error
		return 0, fmt.Errorf("failed to parse volume value '%s': %w", volumeStr, err)
	}

	return volume * multiplier, nil
}
