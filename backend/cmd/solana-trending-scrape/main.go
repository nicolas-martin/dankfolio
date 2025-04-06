package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/service/coin"
)

const testTimeout = 120 * time.Second // Timeout for just the scraping test

func main() {
	log.Println("--- Starting isolated scrapeBasicTokenInfo Test ---")

	// Create a context with a timeout for the test
	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	s := &coin.Service{} // Pointer receiver method, so we need an instance

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
