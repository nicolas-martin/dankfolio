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
	log.Println("--- Starting Solana Token Fetching and Enrichment ---")

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
		// BirdEyeBaseURL and BirdEyeAPIKey would be needed if birdeyeClient is used by NewService for setup
		// For now, assuming they are not critical for NewService itself, but for operations.
	}

	// Create APICallTracker and OffchainClient
	apiTracker := clients.NewAPICallTracker() // Assuming clients.NewAPICallTracker exists
	offchainClient := offchain.NewClient(httpClient, apiTracker)
	// Create a placeholder birdeyeClient and solanaClient (chainClient) as NewService expects them
	// These might need actual configuration if the functions called by FetchAndEnrichTrendingTokens depend on them being fully set up.
	// For now, using nil or basic init if allowed by their NewClient signatures.
	// This main.go is a test scraper, so its client setup might not be as complete as api/main.go
	birdeyeClient := birdeye.NewClient(httpClient, "", "", apiTracker) // Placeholder, pass httpClient
	solanaClient := solana.NewClient(nil, apiTracker)      // Placeholder for chainClient

	s := coin.NewService(config, httpClient, jupiterClient, store, solanaClient, birdeyeClient, apiTracker, offchainClient)

	log.Printf("HTTP Client timeout: %v", httpClient.Timeout)
	log.Printf("Test timeout: %v", testTimeout)

	// Call the full pipeline to test fetching and enrichment
	enrichedCoins, err := s.FetchAndEnrichTrendingTokens(ctx)
	if err != nil {
		log.Fatalf("Fetching and enrichment failed: %v", err)
	}

	log.Println("--- Fetching and Enrichment Complete ---")
	fmt.Printf("Enriched coins: %v\n", enrichedCoins)
}
