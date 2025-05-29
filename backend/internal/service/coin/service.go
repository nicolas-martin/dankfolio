package coin

import (
	"context"
	"fmt"
	"log/slog" // Import slog
	"net/http"
	"os" // Import os for Exit
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
	fetcherCtx     context.Context    // Context for the new token fetcher goroutine
	fetcherCancel  context.CancelFunc // Cancel function for the fetcher goroutine
}

// NewService creates a new CoinService instance
func NewService(config *Config, httpClient *http.Client, jupiterClient jupiter.ClientAPI, store db.Store) *Service {
	if config.SolanaRPCEndpoint == "" {
		slog.Error("SolanaRPCEndpoint is required")
		os.Exit(1)
	}

	solanaClient := solana.NewClient(config.SolanaRPCEndpoint)

	offchainClient := offchain.NewClient(httpClient)

	service := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
		store:          store,
	}
	service.fetcherCtx, service.fetcherCancel = context.WithCancel(context.Background())

	ctx, cancel := context.WithTimeout(context.Background(), initialLoadTimeout)
	defer cancel()

	if err := service.loadOrRefreshData(ctx); err != nil {
		slog.Warn("Initial data load/refresh failed", slog.Any("error", err))
	}

	if service.config.NewCoinsFetchInterval > 0 {
		go service.runNewTokenFetcher(service.fetcherCtx)
	} else {
		slog.Info("New token fetcher is disabled as NewCoinsFetchInterval is not configured or is zero.")
	}

	return service
}

// runNewTokenFetcher periodically fetches new tokens from Jupiter.
// It takes a context for managing its lifecycle.
func (s *Service) runNewTokenFetcher(ctx context.Context) {
	slog.Info("Starting new token fetcher", slog.Duration("interval", s.config.NewCoinsFetchInterval))

	// start the ticker for periodic fetching
	ticker := time.NewTicker(s.config.NewCoinsFetchInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.Info("Periodically fetching new tokens...")
			// Use the passed-in context (s.fetcherCtx) for the actual operation
			// to allow cancellation of FetchAndStoreNewTokens if the service is shutting down.
			if err := s.FetchAndStoreNewTokens(ctx); err != nil {
				slog.Error("Failed to fetch and store new tokens periodically", slog.Any("error", err))
			} else {
				slog.Info("Successfully fetched and stored new tokens periodically.")
			}
		case <-ctx.Done(): // Listen for context cancellation
			slog.Info("New token fetcher stopping due to context cancellation.")
			return
		}
	}
}

// Shutdown gracefully stops the service, including the new token fetcher.
// This method is not part of the current subtask but shows how fetcherCancel would be used.
func (s *Service) Shutdown() {
	slog.Info("Shutting down coin service...")
	if s.fetcherCancel != nil {
		slog.Info("Cancelling new token fetcher...")
		s.fetcherCancel()
	}
	// Add any other cleanup logic here
	slog.Info("Coin service shutdown complete.")
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
	slog.Info("Coin not found in store, attempting dynamic enrichment", slog.String("coinID", id))
	enrichedCoin, err := s.fetchAndCacheCoin(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("coin %s not found and dynamic enrichment failed: %w", id, err)
	}

	// Store the newly enriched coin
	if _, err := s.store.Coins().Upsert(ctx, enrichedCoin); err != nil {
		slog.Warn("Failed to store enriched coin", slog.String("coinID", id), slog.Any("error", err))
	}

	return enrichedCoin, nil
}

// fetchAndCacheCoin handles caching and calls the core EnrichCoinData function.
// This is used for dynamically enriching tokens not found in the initial file load.
// Renamed from enrichCoin
func (s *Service) fetchAndCacheCoin(ctx context.Context, mintAddress string) (*model.Coin, error) {
	slog.Debug("Starting dynamic coin enrichment", slog.String("mintAddress", mintAddress))
	enrichedCoin, err := s.EnrichCoinData(
		ctx,
		mintAddress,
		"", // No initial name
		"", // No initial icon
		0,  // No initial volume
	)
	if err != nil {
		slog.Error("Dynamic coin enrichment failed", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich coin %s: %w", mintAddress, err)
	}

	slog.Debug("Dynamic coin enrichment successful", slog.String("mintAddress", mintAddress))
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
	needsRefresh := true
	if len(c) != 0 {
		updatedTime, err := time.Parse(time.RFC3339, c[0].LastUpdated)
		if err != nil {
			return fmt.Errorf("failed to parse last updated time: %w", err)
		}

		age := time.Since(updatedTime)
		needsRefresh = age > TrendingDataTTL
		slog.Info("Trending data status", slog.Duration("age", age), slog.Bool("needsRefresh", needsRefresh))
	}

	// if we don't need to refresh, we can just use what's in the DB
	if !needsRefresh {
		slog.Info("Trending data is fresh, no refresh needed.")
		return nil
	}

	slog.Info("Trending data is too old or missing, triggering scrape and enrichment...")
	enrichedCoins, err := s.ScrapeAndEnrichToFile(ctx)
	if err != nil {
		return fmt.Errorf("failed to scrape and enrich coins: %w", err)
	}

	// update all previous coins to not trending
	coins, err := s.store.Coins().List(ctx)
	if err != nil {
		return fmt.Errorf("failed to list coins for updating trending status: %w", err)
	}
	// update the coins to not trending
	slog.Debug("Updating trending status for existing coins", slog.Int("count", len(coins)))
	for _, c := range coins {
		c.IsTrending = false
		c.LastUpdated = time.Now().Format(time.RFC3339)
		err := s.store.Coins().Update(ctx, &c)
		if err != nil {
			// Not returning error here to allow other coins to be updated
			slog.Error("Failed to update trending status for coin", slog.String("mintAddress", c.MintAddress), slog.Any("error", err))
		}
	}

	// Store all coins
	slog.Debug("Storing enriched coins", slog.Int("count", len(enrichedCoins.Coins)))
	for _, coin := range enrichedCoins.Coins {
		if _, err := s.store.Coins().Upsert(ctx, &coin); err != nil {
			slog.Warn("Failed to store coin during refresh", slog.String("mintAddress", coin.MintAddress), slog.Any("error", err))
		}
	}

	slog.Info("Coin store refresh complete from file",
		slog.Time("scrapeTimestamp", enrichedCoins.ScrapeTimestamp),
		slog.Int("coinsLoaded", len(enrichedCoins.Coins)))

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
		_, err = s.store.RawCoins().Upsert(ctx, rawCoin)
		if err != nil {
			return nil, err
		}
	}

	return resp, nil
}

// FetchAndStoreNewTokens fetches new tokens from Jupiter and stores them in the raw_coins table.
func (s *Service) FetchAndStoreNewTokens(ctx context.Context) error {
	slog.Info("Starting to fetch and store new tokens from Jupiter")
	// TODO: We could make this configurable or paginate
	limit := 50
	offset := 0

	params := &jupiter.NewCoinsParams{
		Limit:  &limit,
		Offset: &offset,
	}

	resp, err := s.jupiterClient.GetNewCoins(ctx, params)
	if err != nil {
		slog.Error("Failed to get new coins from Jupiter", slog.Any("error", err))
		return fmt.Errorf("failed to get new coins from Jupiter: %w", err)
	}

	if resp == nil || len(resp.Coins) == 0 {
		slog.Info("No new coins found from Jupiter.")
		return nil
	}

	slog.Info("Successfully fetched new coins from Jupiter", slog.Int("fetched_count", len(resp.Coins)))


	if len(resp.Coins) == 0 {
		slog.Info("No new coins to process from Jupiter.")
		return nil
	}

	rawCoinsToUpsert := make([]model.RawCoin, 0, len(resp.Coins))
	for _, v_jupiterCoin := range resp.Coins { // v_jupiterCoin is of type jupiter.Coin
		rawCoinModelPtr := v_jupiterCoin.ToRawCoin() // This returns *model.RawCoin
		if rawCoinModelPtr != nil {
			rawCoinsToUpsert = append(rawCoinsToUpsert, *rawCoinModelPtr)
		}
	}

	if len(rawCoinsToUpsert) > 0 {
		rowsAffected, bulkErr := s.store.RawCoins().BulkUpsert(ctx, &rawCoinsToUpsert)
		if bulkErr != nil {
			slog.Error("Failed to bulk upsert raw coins",
				slog.Int("attempted_count", len(rawCoinsToUpsert)),
				slog.Any("error", bulkErr))
			// Log the warning and return an error
			slog.Warn("Completed bulk processing new tokens, but the operation failed",
				slog.Int("total_fetched_from_jupiter", len(resp.Coins)),
				slog.Int("coins_prepared_for_upsert", len(rawCoinsToUpsert)),
				slog.Any("error", bulkErr))
			return fmt.Errorf("failed to bulk upsert raw coins: %w", bulkErr)
		}
		// Successful bulk upsert
		slog.Info("Finished bulk processing new tokens from Jupiter",
			slog.Int("total_fetched_from_jupiter", len(resp.Coins)),
			slog.Int("coins_prepared_for_upsert", len(rawCoinsToUpsert)),
			slog.Int("successful_database_operations", int(rowsAffected)))
	} else {
		// This case might occur if all v_jupiterCoin.ToRawCoin() returned nil, or if resp.Coins was empty (already handled)
		slog.Info("No valid raw coins were prepared for upserting after fetching from Jupiter.")
	}

	return nil
}

// SearchCoins searches for coins using the DB's SearchCoins
func (s *Service) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	coins, err := s.store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, fmt.Errorf("failed to search coins: %w", err)
	}
	return coins, nil
}
