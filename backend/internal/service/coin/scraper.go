package coin

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/input"
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
	// New selectors for the BIRDEYE INSIGHTS modal
	scrapeInsightsSkipSelector = `button:contains("SKIP"), button:contains("Skip"), button:contains("skip"), button[class*="skip"], button[class*="Skip"]`
)

// Basic info scraped directly from Birdeye modal
type scrapedTokenInfo struct {
	MintAddress string
	Name        string
	VolumeStr   string // Keep volume as string initially
	IconURL     string
}

// ScrapeAndEnrichToFile orchestrates the scraping and enrichment process.
func (s *Service) ScrapeAndEnrichToFile(ctx context.Context) (*EnrichedFileOutput, error) {
	log.Println("Starting Solana trending token scrape and enrichment process...")

	// Step 1: Scrape basic info using Chromedp
	scrapedTokens, err := s.scrapeBasicTokenInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed during basic token scraping: %w", err)
	}
	if len(scrapedTokens) == 0 {
		return nil, fmt.Errorf("no tokens were successfully scraped from the modal, cannot proceed")
	}
	log.Printf("Successfully scraped basic info for %d tokens.", len(scrapedTokens))

	// Step 2: Enrich the scraped tokens concurrently
	enrichedCoins, err := s.enrichScrapedTokens(ctx, scrapedTokens)
	if err != nil {
		return nil, fmt.Errorf("encountered errors during enrichment process: %v", err)
	}
	if len(enrichedCoins) == 0 {
		return nil, fmt.Errorf("enrichment process completed, but no tokens were successfully enriched (or survived errors)")
	}
	log.Printf("Enrichment process complete. Successfully processed (fully or partially): %d tokens.", len(enrichedCoins))

	// Step 3: Prepare and save the final output
	finalOutput := &EnrichedFileOutput{
		ScrapeTimestamp: time.Now(),
		Coins:           enrichedCoins,
	}

	// Log summary before saving
	log.Printf("--- Saving Enriched Solana Tokens Data ---")
	log.Printf("Timestamp: %s", finalOutput.ScrapeTimestamp.Format(time.RFC3339))
	log.Printf("Total Coins to Save: %d", len(finalOutput.Coins))
	// Optionally log details of first few tokens
	for i, t := range finalOutput.Coins {
		if i >= 3 {
			log.Println("...")
			break
		}
		log.Printf("  Mint: %s, Name: %s, Symbol: %s, Price: %.6f, Volume: %.2f",
			t.MintAddress, t.Name, t.Symbol, t.Price, t.Volume24h)
	}

	return finalOutput, nil
}

// ScrapeBasicTokenInfo handles the browser automation part to get initial token details.
// Exported for testing.
func (s *Service) scrapeBasicTokenInfo(ctx context.Context) ([]scrapedTokenInfo, error) {
	path := chromePath()
	if path == "" {
		panic("unsupported OS")
	}

	log.Println("=== Starting ScrapeBasicTokenInfo ===")
	// --- Chromedp Setup ---
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.Headless,
		chromedp.NoSandbox,
		chromedp.ExecPath(path),
	)

	log.Printf("Browser options: %+v", opts)

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(ctx, opts...)
	defer cancelAlloc()
	taskCtx, cancelTask := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancelTask()
	timeoutCtx, cancelTimeout := context.WithTimeout(taskCtx, scrapeDefaultTimeout)
	defer cancelTimeout()

	// --- Scrape Logic (Navigate, Click, Extract) ---
	scrapedTokens := []scrapedTokenInfo{}
	var modalNodes []*cdp.Node

	// Step 1: Initial Navigation
	log.Println("Step 1: Navigating to", scrapeBaseURL)
	err := chromedp.Run(timeoutCtx,
		chromedp.Navigate(scrapeBaseURL),
		// Wait for page to be ready
		chromedp.WaitReady("body", chromedp.ByQuery),
	)
	if err != nil {
		return nil, fmt.Errorf("initial navigation failed: %w", err)
	}

	// Handle BIRDEYE INSIGHTS modal
	log.Println("Attempting to dismiss modal with ESC key...")

	// First verify if modal is present
	var modalVisible bool
	err = chromedp.Run(timeoutCtx,
		chromedp.EvaluateAsDevTools(`!!document.querySelector('div[role="dialog"]')`, &modalVisible),
	)
	if err != nil {
		log.Printf("Warning: Error checking modal presence: %v", err)
	}

	if modalVisible {
		// Try to dismiss with ESC key
		err = chromedp.Run(timeoutCtx,
			input.DispatchKeyEvent(input.KeyDown).
				WithKey("Escape").
				WithCode("Escape").
				WithWindowsVirtualKeyCode(27), // ESC key code
		)
		if err != nil {
			log.Printf("Warning: Could not send ESC key: %v", err)
		}

		// Also send the key up event
		err = chromedp.Run(timeoutCtx,
			input.DispatchKeyEvent(input.KeyUp).
				WithKey("Escape").
				WithCode("Escape").
				WithWindowsVirtualKeyCode(27),
		)
		if err != nil {
			log.Printf("Warning: Could not send ESC key up: %v", err)
		}

		// Wait a moment for any transitions
		time.Sleep(1 * time.Second)

		// Verify modal is gone
		var modalStillVisible bool
		err = chromedp.Run(timeoutCtx,
			chromedp.EvaluateAsDevTools(`!!document.querySelector('div[role="dialog"]')`, &modalStillVisible),
		)
		if err != nil {
			log.Printf("Warning: Error checking if modal was dismissed: %v", err)
		}

		if modalStillVisible {
			return nil, fmt.Errorf("failed to dismiss modal, cannot proceed with scraping")
		}

		log.Println("Modal successfully dismissed")
	} else {
		log.Println("No modal detected, proceeding with scraping")
	}

	// Step 2: Wait for table to be visible
	log.Println("Waiting for trending tokens table to load...")
	var tablePresent bool
	err = chromedp.Run(timeoutCtx,
		// Wait for any table cell that contains a $ symbol (likely price/volume data)
		chromedp.WaitReady("tbody", chromedp.ByQuery),
		chromedp.Evaluate(`!!document.querySelector('tbody td:contains("$")')`, &tablePresent),
	)
	if err != nil {
		log.Printf("Warning: Error waiting for table content: %v", err)
	} else if !tablePresent {
		log.Println("Warning: Table is present but may not contain expected data")
	} else {
		log.Println("Table with data is now visible")
	}

	// Log the current state of the table
	var currentTableHTML string
	err = chromedp.Run(timeoutCtx,
		chromedp.OuterHTML("tbody", &currentTableHTML, chromedp.ByQuery),
	)
	if err != nil {
		log.Printf("Warning: Could not get table HTML: %v", err)
	}

	// Step 3: Check for View More button
	log.Printf("Step 3: Looking for View More button with selector: %s", scrapeViewMoreButtonSelector)
	var viewMoreHTML string
	err = chromedp.Run(timeoutCtx,
		chromedp.OuterHTML(scrapeViewMoreButtonSelector, &viewMoreHTML, chromedp.ByQuery),
	)
	if err != nil {
		log.Printf("Warning: Could not find View More button: %v", err)
	} else {
		log.Printf("Found View More button HTML: %s", viewMoreHTML)
	}

	// Step 4: Click View More
	log.Printf("Step 4: Attempting to click View More button...")
	err = chromedp.Run(timeoutCtx,
		chromedp.Click(scrapeViewMoreButtonSelector, chromedp.ByQuery, chromedp.NodeVisible),
	)
	if err != nil {
		log.Printf("Warning: Failed to click View More button: %v", err)
	} else {
		log.Println("Successfully clicked View More button")
	}

	// Step 5: Wait for and check modal
	log.Printf("Step 5: Waiting for modal with selector: %s", scrapeModalSelector)
	err = chromedp.Run(timeoutCtx,
		chromedp.WaitVisible(scrapeModalSelector, chromedp.ByQuery),
	)
	if err != nil {
		log.Printf("Warning: Modal did not appear: %v", err)
		// Check what dialogs are visible
		var dialogsHTML string
		if dialogErr := chromedp.Run(timeoutCtx,
			chromedp.OuterHTML(scrapeModalSelector, &dialogsHTML, chromedp.ByQuery),
		); dialogErr == nil {
			log.Printf("Found dialogs: %s", dialogsHTML)
		}
	} else {
		log.Println("Modal is now visible")
	}

	// Capture screenshot and page state before step 6
	log.Println("Capturing page state before attempting to extract data...")
	var pageHTML string
	err = chromedp.Run(timeoutCtx,
		chromedp.OuterHTML("html", &pageHTML, chromedp.ByQuery),
	)
	if err != nil {
		log.Printf("Warning: Failed to capture page state: %v", err)
	}

	// Step 6: Extract data from modal
	log.Printf("Step 6: Looking for rows with selector: %s", scrapeModalRowSelector)
	err = chromedp.Run(timeoutCtx,
		chromedp.Nodes(scrapeModalRowSelector, &modalNodes, chromedp.ByQueryAll),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get rows from modal: %w", err)
	}

	log.Printf("Found %d rows in modal. Processing up to first %d...", len(modalNodes), scrapeMaxRowsToProcess)
	if len(modalNodes) > scrapeMaxRowsToProcess {
		modalNodes = modalNodes[:scrapeMaxRowsToProcess]
	}

	// Process each row
	rowProcessingCtx, cancelRowProcessing := context.WithCancel(timeoutCtx)
	defer cancelRowProcessing()

	for i, node := range modalNodes {
		var name, iconURL, addressHref, volumeStr string
		var linkNodes []*cdp.Node
		rowCtx, rowCancel := context.WithTimeout(rowProcessingCtx, 10*time.Second)

		log.Printf("Processing row %d...", i+1)
		err = chromedp.Run(rowCtx,
			chromedp.Nodes(scrapeModalLinkSelector, &linkNodes, chromedp.ByQuery, chromedp.FromNode(node)),
		)
		if err != nil || len(linkNodes) == 0 {
			log.Printf("WARN: Could not find link node in row %d. Skipping. Err: %v", i+1, err)
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
			log.Printf("WARN: Failed to extract details from row %d: %v. Skipping.", i+1, err)
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
			log.Printf("MintAddress: %s, Name: %s, Volume: %s, IconURL: %s", mintAddress, trimmedName, volumeStr, iconURL)
			log.Printf("Successfully extracted token from row %d: %s (%s)", i+1, trimmedName, mintAddress)
		} else {
			log.Printf("WARN: Skipping row %d due to missing Name ('%s') or MintAddress ('%s')", i+1, trimmedName, mintAddress)
		}
	}

	if len(scrapedTokens) == 0 {
		return nil, fmt.Errorf("no tokens were successfully scraped")
	}

	log.Printf("Successfully scraped %d tokens", len(scrapedTokens))
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
			log.Printf("Successfully processed enrichment for: %s (%s)", enriched.Name, enriched.MintAddress)
		}(scrapedToken)
	}

	wg.Wait()
	close(sem)

	// Check if any errors occurred during enrichment
	if len(encounteredErrors) > 0 {
		// Log that errors occurred, but don't return an error here.
		// We want to proceed to save the partially enriched data.
		log.Printf("Enrichment finished with %d errors. Proceeding with successfully enriched tokens.", len(encounteredErrors))
		// return enrichedCoins, fmt.Errorf("enrichment failed for one or more tokens (first error: %w)", encounteredErrors[0])
	}

	// This logging might be redundant now, consider removing or adjusting
	log.Printf("Successfully enriched %d tokens. Encountered %d errors.", len(enrichedCoins), len(encounteredErrors))

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
