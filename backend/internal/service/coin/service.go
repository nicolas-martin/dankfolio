package coin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles coin-related operations
type Service struct {
	config         *Config
	jupiterClient  jupiter.ClientAPI
	solanaClient   solana.ClientAPI
	offchainClient offchain.ClientAPI
	store          db.Store
}

// NewService creates a new CoinService instance
func NewService(config *Config, httpClient *http.Client, jupiterClient jupiter.ClientAPI, store db.Store) *Service {
	if config.TrendingTokenPath == "" {
		log.Fatal("TrendingTokenPath is required")
	}

	// Create Solana client
	solanaClient := solana.NewClient(config.SolanaRPCEndpoint)

	// Create offchain client
	offchainClient := offchain.NewClient(httpClient)

	service := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
		store:          store,
	}

	// Perform initial data load or refresh, with a timeout
	ctx, cancel := context.WithTimeout(context.Background(), initialLoadTimeout)
	defer cancel()
	if err := service.loadOrRefreshData(ctx); err != nil {
		// Log as warning, not fatal. Service might still work partially with cached/dynamic data.
		log.Printf("Warning: Initial data load/refresh failed: %v", err)
	}

	// TODO: Consider periodic refresh in a background goroutine

	return service
}

// GetCoins returns a list of all available coins
func (s *Service) GetCoins(ctx context.Context) ([]model.Coin, error) {
	coins, err := s.store.Coins().List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list coins: %w", err)
	}

	// Sort by volume descending
	sort.Slice(coins, func(i, j int) bool {
		return coins[i].DailyVolume > coins[j].DailyVolume
	})

	return coins, nil
}

// GetTrendingCoins returns only the coins loaded from the trending file
func (s *Service) GetTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	trendingCoins, err := s.store.ListTrendingCoins(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list trending coins: %w", err)
	}

	// Sort trending coins by volume descending
	sort.Slice(trendingCoins, func(i, j int) bool {
		return trendingCoins[i].DailyVolume > trendingCoins[j].DailyVolume
	})

	return trendingCoins, nil
}

// GetCoinByID returns a coin by its ID
func (s *Service) GetCoinByID(ctx context.Context, id string) (*model.Coin, error) {
	// Try to get from store
	coin, err := s.store.Coins().Get(ctx, id)
	if err == nil {
		return coin, nil
	}

	// If not found, attempt dynamic enrichment
	log.Printf("GetCoinByID: %s not found in store, attempting dynamic enrichment...", id)
	enrichedCoin, err := s.fetchAndCacheCoin(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("coin %s not found and dynamic enrichment failed: %w", id, err)
	}

	// Store the newly enriched coin
	if err := s.store.Coins().Upsert(ctx, enrichedCoin); err != nil {
		log.Printf("Warning: Failed to store enriched coin %s: %v", id, err)
	}

	return enrichedCoin, nil
}

// fetchAndCacheCoin handles caching and calls the core EnrichCoinData function.
// This is used for dynamically enriching tokens not found in the initial file load.
// Renamed from enrichCoin
func (s *Service) fetchAndCacheCoin(ctx context.Context, mintAddress string) (*model.Coin, error) {
	log.Printf("fetchAndCacheCoin: Enriching coin %s...", mintAddress)
	enrichedCoin, err := s.EnrichCoinData(
		ctx,
		mintAddress,
		"", // No initial name
		"", // No initial icon
		0,  // No initial volume
	)
	if err != nil {
		log.Printf("ERROR: fetchAndCacheCoin: Failed to enrich %s: %v", mintAddress, err)
		return nil, fmt.Errorf("failed to enrich coin %s: %w", mintAddress, err)
	}

	return enrichedCoin, nil
}

// loadOrRefreshData checks if the trending data file is fresh. If not, it triggers
// a scrape and enrichment process before loading the data into the service.
func (s *Service) loadOrRefreshData(ctx context.Context) error {
	filePath := s.config.TrendingTokenPath
	info, err := os.Stat(filePath)
	needsRefresh := true

	if err == nil {
		age := time.Since(info.ModTime())
		needsRefresh = age > TrendingDataTTL
		log.Printf("Trending data file age: %v (needs refresh: %v)", age, needsRefresh)
	}

	// Load the enriched coins from file using the service method
	enrichedCoins, timestamp, loadErr := s.loadEnrichedCoinsFromFile()
	if loadErr != nil {
		// If scraping was needed but failed, and loading also fails, return the load error.
		// If the file just doesn't exist after a failed scrape, this loadErr will reflect that.
		log.Printf("ERROR: Failed to load enriched coins from file %s: %v", filePath, loadErr)
		if needsRefresh && err != nil { // If refresh was needed and stat failed initially
			return fmt.Errorf("initial file stat error: %v, and subsequent load failed: %w", err, loadErr)
		}
		return fmt.Errorf("failed to load enriched coins from file: %w", loadErr)
	}

	// Store all coins
	for _, coin := range enrichedCoins {
		if err := s.store.Coins().Upsert(ctx, &coin); err != nil {
			log.Printf("Warning: Failed to store coin %s: %v", coin.ID, err)
		}
	}

	log.Printf("Coin store refresh complete from file (Timestamp: %s). Total coins loaded: %d",
		timestamp.Format(time.RFC3339), len(enrichedCoins))

	return nil
}

// loadEnrichedCoinsFromFile reads and parses the JSON file containing pre-enriched Coin data.
func (s *Service) loadEnrichedCoinsFromFile() ([]model.Coin, time.Time, error) {
	filePath := s.config.TrendingTokenPath
	log.Printf("Attempting to load enriched coins from: %s", filePath)

	fileData, err := os.ReadFile(filePath)
	if err != nil {
		// Return specific error for not found, caller handles it
		if os.IsNotExist(err) {
			return nil, time.Time{}, fmt.Errorf("enriched coin file not found at %s: %w", filePath, err)
		}
		return nil, time.Time{}, fmt.Errorf("error reading enriched coin file %s: %w", filePath, err)
	}

	if len(fileData) == 0 {
		log.Printf("WARN: Enriched coin file %s is empty.", filePath)
		return []model.Coin{}, time.Time{}, nil // Return empty list, not error
	}

	var fileOutput EnrichedFileOutput // Use the struct defined in this file
	err = json.Unmarshal(fileData, &fileOutput)
	if err != nil {
		log.Printf("ERROR: Error unmarshalling enriched coin data from %s: %v", filePath, err)
		// Attempt to log the problematic data snippet if possible (be careful with large files)
		// preview := string(fileData)
		// if len(preview) > 200 { preview = preview[:200] + "..." }
		// log.Printf("Data preview: %s", preview)
		return nil, time.Time{}, fmt.Errorf("failed to decode enriched JSON from %s: %w", filePath, err)
	}

	// Set IsTrending flag for all coins loaded from the file
	for i := range fileOutput.Tokens {
		fileOutput.Tokens[i].IsTrending = true
	}

	// Log timestamp from file
	if fileOutput.ScrapeTimestamp.IsZero() {
		log.Printf("WARN: Enriched coin file %s has zero timestamp in JSON.", filePath)
	} else {
		log.Printf("Successfully decoded enriched coin data from %s (JSON Timestamp: %s)",
			filePath, fileOutput.ScrapeTimestamp.Format(time.RFC3339))
	}

	if len(fileOutput.Tokens) == 0 {
		log.Printf("WARN: Enriched coin file %s contained zero tokens in the 'tokens' list.", filePath)
		// Return empty slice, not an error
	}

	return fileOutput.Tokens, fileOutput.ScrapeTimestamp, nil
}
