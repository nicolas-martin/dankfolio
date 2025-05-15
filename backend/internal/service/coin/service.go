package coin

import (
	"context"
	"fmt"
	"log"
	"net/http"
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
	if config.SolanaRPCEndpoint == "" {
		log.Fatal("SolanaRPCEndpoint is required")
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
		return coins[i].Volume24h > coins[j].Volume24h
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
		return trendingCoins[i].Volume24h > trendingCoins[j].Volume24h
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
	// get the trending by asc order
	c, err := s.store.ListTrendingCoins(ctx)
	if err != nil {
		return fmt.Errorf("failed to get latest trending coin: %w", err)
	}

	// 2025-05-14 20:35:42.431158+00
	updatedTime, err := time.Parse(c[0].LastUpdated, time.RFC3339)
	if err != nil {
		return fmt.Errorf("failed to parse last updated time: %w", err)
	}

	age := time.Since(updatedTime)
	needsRefresh := age > TrendingDataTTL
	log.Printf("Trending data file age: %v (needs refresh: %v)", age, needsRefresh)

	// if we don't need to refresh, we can just use what's in the DB
	if !needsRefresh {
		return nil
	}

	log.Printf("Trending data is too old, triggering scrape and enrichment...")
	enrichedCoins, err := s.ScrapeAndEnrichToFile(ctx)
	if err != nil {
		return fmt.Errorf("failed to scrape and enrich coins: %w", err)
	}

	// Store all coins
	for _, coin := range enrichedCoins.Coins {
		// update all previous coins to not trending
		coins, err := s.store.Coins().List(ctx)
		if err != nil {
			return fmt.Errorf("failed to list coins for updating trending status: %w", err)
		}
		// update the coins to not trending
		for _, c := range coins {
			c.IsTrending = false
			c.LastUpdated = time.Now().Format(time.RFC3339)
			err := s.store.Coins().Update(ctx, &c)
			if err != nil {
				return fmt.Errorf("failed to update trending coin %s: %w", c.MintAddress, err)
			}
		}

		if err := s.store.Coins().Upsert(ctx, &coin); err != nil {
			log.Printf("Failed to store coin %s: %v", coin.MintAddress, err)
		}
	}

	log.Printf("Coin store refresh complete from file (Timestamp: %s). Total coins loaded: %d",
		enrichedCoins.ScrapeTimestamp.Format(time.RFC3339), len(enrichedCoins.Coins))

	return nil
}

func (s *Service) GetAllTokens(ctx context.Context) (*jupiter.CoinListResponse, error) {
	resp, err := s.jupiterClient.GetAllCoins(ctx)
	if err != nil {
		return nil, err
	}
	for _, v := range resp.Coins {
		// Store in raw_coins table
		rawCoin := v.ToRawCoin()
		err = s.store.RawCoins().Upsert(ctx, rawCoin)
		if err != nil {
			return nil, err
		}
	}

	return resp, nil
}

// SearchCoins searches for coins using the DB's SearchCoins
func (s *Service) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	coins, err := s.store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, fmt.Errorf("failed to search coins: %w", err)
	}
	return coins, nil
}
