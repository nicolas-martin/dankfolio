package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
)

const testTimeout = 300 * time.Second // Increased timeout to 5 minutes for debugging

func main() {
	// Configure logging with timestamps and file/line numbers
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Llongfile)
	log.Println("--- Starting Solana Token Scraping and Enrichment ---")

	// Create a context with a timeout for the test
	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	// Create required clients with increased timeout
	httpClient := &http.Client{
		Timeout: 60 * time.Second, // Increased HTTP timeout
	}
	jupiterClient := jupiter.NewClient(httpClient, "https://api.jup.ag", "")
	store := memory.NewWithConfig(memory.Config{
		DefaultCacheExpiry: 5 * time.Minute,
	})

	// Create service with config
	config := &coin.Config{
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
	}
	s := coin.NewService(config, httpClient, jupiterClient, store)

	log.Printf("HTTP Client timeout: %v", httpClient.Timeout)
	log.Printf("Test timeout: %v", testTimeout)

	// Call the full pipeline to test scraping and enrichment
	enrichedCoins, err := s.ScrapeAndEnrichToFile(ctx)
	if err != nil {
		log.Fatalf("Scraping and enrichment failed: %v", err)
	}

	log.Println("--- Scraping and Enrichment Complete ---")
	fmt.Printf("Enriched coins: %v\n", enrichedCoins)
}
