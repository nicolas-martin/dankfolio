package coin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
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
	scrapeBaseURL                = "https://www.birdeye.so/?chain=solana"
	scrapeViewMoreButtonSelector = `section.border-b div[type="button"][data-state="closed"]`
	scrapeModalSelector          = "div[role='dialog']"
	scrapeModalRowSelector       = "div[role='dialog'] table tbody tr"
	scrapeModalLinkSelector      = "td a"
	scrapeModalIconSelector      = "img:not([src*='network/solana.png'])"
	scrapeModalNameSelector      = "div[class*='text-subtitle']"
	scrapeModalVolumeSelector    = "td:nth-child(4) span"
	scrapeUserAgent              = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
	scrapeMaxConcurrentEnrich    = 5                 // Limit concurrency for enrichment API calls
	scrapeDefaultTimeout         = 120 * time.Second // Overall timeout for scrape + enrich
	scrapeMaxRowsToProcess       = 10                // Limit how many rows to process from modal
)

// Basic info scraped directly from Birdeye modal
type scrapedTokenInfo struct {
	MintAddress string
	Name        string
	VolumeStr   string // Keep volume as string initially
	IconURL     string
}

// ScrapeAndEnrichToFile orchestrates the scraping and enrichment process.
func (s *Service) ScrapeAndEnrichToFile(ctx context.Context) error {
	log.Println("Starting Solana trending token scrape and enrichment process...")
	startTime := time.Now()

	outputFile := s.config.TrendingTokenPath
	if outputFile == "" {
		return fmt.Errorf("ScrapeAndEnrichToFile: output file path (TrendingTokenPath) is not configured")
	}

	// Step 1: Scrape basic info using Chromedp
	scrapedTokens, err := s.scrapeBasicTokenInfo(ctx)
	if err != nil {
		return fmt.Errorf("failed during basic token scraping: %w", err)
	}
	if len(scrapedTokens) == 0 {
		return fmt.Errorf("no tokens were successfully scraped from the modal, cannot proceed")
	}
	log.Printf("Successfully scraped basic info for %d tokens.", len(scrapedTokens))

	// Step 2: Enrich the scraped tokens concurrently
	enrichedCoins, err := s.enrichScrapedTokens(ctx, scrapedTokens)
	if err != nil {
		// Log enrichment errors but proceed if we got *any* results
		log.Printf("WARN: Encountered errors during enrichment process: %v", err)
		// We might still have partial results in enrichedCoins, so don't return error yet
	}
	if len(enrichedCoins) == 0 {
		return fmt.Errorf("enrichment process completed, but no tokens were successfully enriched (or survived errors)")
	}
	log.Printf("Enrichment process complete. Successfully processed (fully or partially): %d tokens.", len(enrichedCoins))

	// Step 3: Prepare and save the final output
	finalOutput := EnrichedFileOutput{
		ScrapeTimestamp: time.Now().UTC(), // Use UTC time
		Tokens:          enrichedCoins,
	}

	// Log summary before saving
	log.Printf("--- Saving Enriched Solana Tokens Data ---")
	log.Printf("Timestamp: %s", finalOutput.ScrapeTimestamp.Format(time.RFC3339))
	log.Printf("Total Tokens to Save: %d", len(finalOutput.Tokens))
	// Optionally log details of first few tokens
	for i, t := range finalOutput.Tokens {
		if i >= 3 {
			log.Println("...")
			break
		}
		log.Printf("  Mint: %s, Name: %s, Symbol: %s, Price: %.6f, Volume: %.2f",
			t.ID, t.Name, t.Symbol, t.Price, t.DailyVolume)
	}
	log.Println("-------------------------------------")

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(finalOutput); err != nil {
		return fmt.Errorf("failed to encode final enriched output to JSON buffer: %w", err)
	}

	if err := os.WriteFile(outputFile, buf.Bytes(), 0o644); err != nil {
		return fmt.Errorf("failed to write final enriched JSON to file %s: %w", outputFile, err)
	}

	log.Printf("Successfully saved enriched data for %d tokens to %s (Total time: %v)",
		len(finalOutput.Tokens), outputFile, time.Since(startTime))

	return nil // Success
}

// ScrapeBasicTokenInfo handles the browser automation part to get initial token details.
// Exported for testing.
func (s *Service) scrapeBasicTokenInfo(ctx context.Context) ([]scrapedTokenInfo, error) {
	log.Println("Executing ScrapeBasicTokenInfo...")
	// --- Chromedp Setup ---
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.UserAgent(scrapeUserAgent),
	)
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, opts...)
	defer cancelAlloc()
	taskCtx, cancelTask := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancelTask()
	timeoutCtx, cancelTimeout := context.WithTimeout(taskCtx, scrapeDefaultTimeout) // Use overall timeout
	defer cancelTimeout()

	// --- Scrape Logic (Navigate, Click, Extract) ---
	scrapedTokens := []scrapedTokenInfo{}
	var modalNodes []*cdp.Node

	log.Println("Navigating to", scrapeBaseURL, "clicking 'View more', and waiting for modal...")
	err := chromedp.Run(timeoutCtx,
		chromedp.Navigate(scrapeBaseURL),
		chromedp.WaitVisible(`tbody`, chromedp.ByQuery),
		chromedp.Sleep(2*time.Second),
		chromedp.Click(scrapeViewMoreButtonSelector, chromedp.ByQuery, chromedp.NodeVisible),
		chromedp.WaitVisible(scrapeModalSelector, chromedp.ByQuery),
		chromedp.Sleep(1*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("birdeye navigation/modal interaction failed: %w", err)
	}

	log.Println("Modal appeared. Extracting data from modal rows...")
	extractCtx, cancelExtract := context.WithTimeout(timeoutCtx, 60*time.Second)
	defer cancelExtract()

	err = chromedp.Run(extractCtx,
		chromedp.Nodes(scrapeModalRowSelector, &modalNodes, chromedp.ByQueryAll),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get rows from modal: %w", err)
	}

	log.Printf("Found %d rows in modal. Processing up to first %d...", len(modalNodes), scrapeMaxRowsToProcess)
	if len(modalNodes) > scrapeMaxRowsToProcess {
		modalNodes = modalNodes[:scrapeMaxRowsToProcess]
	}

	rowProcessingCtx, cancelRowProcessing := context.WithCancel(extractCtx)
	defer cancelRowProcessing()

	for i, node := range modalNodes {
		var name, iconURL, addressHref, volumeStr string
		var linkNodes []*cdp.Node
		rowCtx, rowCancel := context.WithTimeout(rowProcessingCtx, 10*time.Second)

		err = chromedp.Run(rowCtx,
			chromedp.Nodes(scrapeModalLinkSelector, &linkNodes, chromedp.ByQuery, chromedp.FromNode(node)),
		)
		if err != nil || len(linkNodes) == 0 {
			log.Printf("WARN: ScrapeBasicTokenInfo: Could not find link node in row %d. Skipping. Err: %v", i+1, err)
			rowCancel()
			continue
		}
		linkNode := linkNodes[0]

		err = chromedp.Run(rowCtx,
			chromedp.AttributeValue(scrapeModalLinkSelector, "href", &addressHref, nil, chromedp.ByQuery, chromedp.FromNode(node)),
			chromedp.TextContent(scrapeModalNameSelector, &name, chromedp.ByQuery, chromedp.FromNode(linkNode)),
			chromedp.AttributeValue(scrapeModalIconSelector, "src", &iconURL, nil, chromedp.ByQuery, chromedp.FromNode(linkNode)),
			chromedp.TextContent(scrapeModalVolumeSelector, &volumeStr, chromedp.ByQuery, chromedp.FromNode(node)),
		)
		rowCancel()

		if err != nil {
			log.Printf("WARN: ScrapeBasicTokenInfo: Failed to extract details from row %d: %v. Skipping.", i+1, err)
			continue
		}

		mintAddress := ""
		if strings.Contains(addressHref, "/token/") {
			parts := strings.Split(addressHref, "/token/")
			if len(parts) > 1 {
				addressParts := strings.Split(parts[1], "?")
				mintAddress = addressParts[0]
			}
		}

		trimmedName := strings.TrimSpace(name)
		if trimmedName != "" && mintAddress != "" {
			scrapedTokens = append(scrapedTokens, scrapedTokenInfo{
				MintAddress: mintAddress,
				Name:        trimmedName,
				VolumeStr:   strings.TrimSpace(volumeStr),
				IconURL:     strings.TrimSpace(iconURL),
			})
		} else {
			log.Printf("WARN: ScrapeBasicTokenInfo: Skipping row %d due to missing Name ('%s') or MintAddress ('%s')", i+1, trimmedName, mintAddress)
		}
	}

	return scrapedTokens, nil
}

// enrichScrapedTokens takes basic scraped info and enriches it using external APIs concurrently.
func (s *Service) enrichScrapedTokens(ctx context.Context, tokensToEnrich []scrapedTokenInfo) ([]model.Coin, error) {
	log.Printf("Executing enrichScrapedTokens for %d tokens (Concurrency: %d)...", len(tokensToEnrich), scrapeMaxConcurrentEnrich)

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

			log.Printf("Enriching: %s (%s)", token.Name, token.MintAddress)

			initialVolume, err := parseVolume(token.VolumeStr)
			if err != nil {
				log.Printf("WARN: enrichScrapedTokens: Failed to parse volume '%s' for %s (%s): %v. Using 0.", token.VolumeStr, token.Name, token.MintAddress, err)
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
				errMessage := fmt.Sprintf("ERROR: enrichScrapedTokens: Failed EnrichCoinData for %s (%s): %v", token.Name, token.MintAddress, err)
				log.Println(errMessage)
				// Record the error
				errMu.Lock()
				encounteredErrors = append(encounteredErrors, fmt.Errorf("%s", errMessage)) // Append formatted error
				errMu.Unlock()
				// Decide whether to add partial data if available
				if enriched == nil {
					return // Skip if enrichment critically failed
				}
				log.Printf("WARN: enrichScrapedTokens: Adding partially enriched data for %s despite error.", token.Name)
			}

			if enriched == nil {
				log.Printf("ERROR: enrichScrapedTokens: EnrichCoinData returned nil for %s (%s) without explicit error. Skipping.", token.Name, token.MintAddress)
				return
			}

			// Add successfully (or partially) enriched coin
			mu.Lock()
			enriched.IsTrending = true
			enrichedCoins = append(enrichedCoins, *enriched)
			mu.Unlock()
			log.Printf("Successfully processed enrichment for: %s (%s)", enriched.Name, enriched.ID)
		}(scrapedToken)
	}

	wg.Wait()
	close(sem)

	// Check if any errors occurred during enrichment
	if len(encounteredErrors) > 0 {
		// Combine errors into a single error to return (optional)
		// For simplicity, we just return the first error for now, but log all.
		log.Printf("Enrichment finished with %d errors.", len(encounteredErrors))
		return enrichedCoins, fmt.Errorf("enrichment failed for one or more tokens (first error: %w)", encounteredErrors[0])
	}

	return enrichedCoins, nil // Success, no errors encountered
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
