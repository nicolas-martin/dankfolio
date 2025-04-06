package main

import (
	"context"
	"fmt"
	"log"
	"time"

	coinservice "github.com/nicolas-martin/dankfolio/internal/service/coin" // Keep coin service import
)

const testTimeout = 120 * time.Second // Timeout for just the scraping test

func main() {
	log.Println("--- Starting isolated scrapeBasicTokenInfo Test ---")

	// Create a context with a timeout for the test
	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	s := &coinservice.Service{} // Pointer receiver method, so we need an instance

	// Call the scraping function directly
	scrapedTokens, err := s.ScrapeBasicTokenInfo(ctx) // Call the exported version
	if err != nil {
		log.Fatalf("scrapeBasicTokenInfo failed: %v", err)
	}

	// Print the results
	log.Printf("Successfully scraped %d tokens. Details:", len(scrapedTokens))
	if len(scrapedTokens) == 0 {
		log.Println("No tokens scraped.")
		return
	}

	fmt.Println("--------------------------------------------------")
	for i, token := range scrapedTokens {
		fmt.Printf("Token %d:\n", i+1)
		fmt.Printf("  MintAddress: %s\n", token.MintAddress)
		fmt.Printf("  Name:        %s\n", token.Name)
		fmt.Printf("  IconURL:     %s\n", token.IconURL)
		fmt.Printf("  VolumeStr:   '%s'\n", token.VolumeStr) // Focus on this raw string - Fixed newline and quote
		fmt.Println("--------------------------------------------------")
	}

	log.Println("--- Isolated scrapeBasicTokenInfo Test Complete ---")

}

/*
// --- Original main function commented out ---

func main() {
	log.Println("Starting Solana trending token scrape and enrichment process...")

	// --- Check for Existing ENRICHED Data and Timestamp ---
	// ... (cache check logic removed) ...

	// --- Initialize Clients Needed for Enrichment ---
	// ... (client init logic removed) ...

	// --- Chromedp Setup ---
	// ... (chromedp setup moved to scrapeBasicTokenInfo) ...

	// --- Scrape Basic Info ---
	// ... (scraping logic moved to scrapeBasicTokenInfo) ...

	// --- Enrich Scraped Tokens Concurrently ---
	// ... (enrichment logic moved to enrichScrapedTokens) ...

	// --- Prepare Final Output ---
	// ... (output prep moved) ...

	// --- Log and Save Final Enriched Data ---
	// ... (saving logic moved) ...
}

// Helper function to log and print enriched token data
// ... (logAndPrintEnrichedData removed) ...

// parseVolume converts volume strings like "$1.23M", "$500.5K", "$100" to float64
// ... (parseVolume moved to scraper.go) ...
*/
