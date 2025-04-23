package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
)

const testTimeout = 120 * time.Second // Timeout for just the scraping test

func main() {
	log.Println("--- Starting Solana Token Scraping and Enrichment ---")

	// Create a context with a timeout for the test
	ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
	defer cancel()

	// Create required clients
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}
	jupiterClient := jupiter.NewClient(httpClient)
	store := memory.NewWithConfig(memory.Config{
		DefaultCacheExpiry: 5 * time.Minute,
	})

	// Create service with config for output file
	config := &coin.Config{
		TrendingTokenPath: "../../data/trending_solana_tokens_enriched.json",
	}
	s := coin.NewService(config, httpClient, jupiterClient, store)

	// Call the full pipeline
	if err := s.ScrapeAndEnrichToFile(ctx); err != nil {
		log.Fatalf("Scraping and enrichment failed: %v", err)
	}

	log.Println("--- Scraping and Enrichment Complete ---")
	log.Printf("Enriched data saved to: %s", config.TrendingTokenPath)
}
