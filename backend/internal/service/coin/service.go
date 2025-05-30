package coin

import (
	"context"
	"fmt"
	"log/slog" // Import slog
	"net/http"
	"os" // Import os for Exit
	"sort"
	"strconv" // Added for GetCoinByID
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

// GetCoinByID returns a coin by its ID (which can be a numeric PK or a mint address string)
func (s *Service) GetCoinByID(ctx context.Context, idStr string) (*model.Coin, error) {
	var coin *model.Coin
	var err error

	// Try parsing idStr as uint64 (numeric PK)
	if _, parseErr := strconv.ParseUint(idStr, 10, 64); parseErr == nil {
		// If parsing is successful, try fetching by numeric ID.
		// The repository's Get method expects a string, GORM handles it.
		coin, err = s.store.Coins().Get(ctx, idStr)
		if err == nil {
			return coin, nil
		}
		// If not found by numeric ID, it might be an old mint address that happens to be numeric,
		// or the numeric ID truly doesn't exist. We can proceed to try GetByField if appropriate,
		// or decide that numeric IDs must be exact. For now, if Get by numeric ID fails,
		// we fall through to enrichment logic if 'idStr' is also a valid mint address.
		slog.Debug("Coin not found by numeric ID, or ID is ambiguous", slog.String("numericID", idStr), slog.Any("error", err))
		// If not found by ID, we still might want to try dynamic enrichment if idStr could be a mint address.
	}

	// If not found by numeric PK (or if idStr wasn't numeric), try by mint_address field.
	// This also covers the case where a numeric idStr might have been a mint address.
	if coin == nil { // coin is nil if not found by numeric ID or if idStr wasn't numeric
		coin, err = s.store.Coins().GetByField(ctx, "mint_address", idStr)
		if err == nil {
			return coin, nil
		}
	}

	// If not found by either PK or mint_address, attempt dynamic enrichment using idStr as mintAddress.
	// This assumes idStr is a mintAddress if it wasn't a successfully found numeric PK.
	slog.Info("Coin not found in store by ID or mint_address, attempting dynamic enrichment", slog.String("identifier", idStr))
	enrichedCoin, enrichErr := s.fetchAndCacheCoin(ctx, idStr) // idStr here is assumed to be mintAddress for enrichment
	if enrichErr != nil {
		return nil, fmt.Errorf("coin %s not found and dynamic enrichment failed: %w", idStr, enrichErr)
	}

	// fetchAndCacheCoin now handles its own storage (Create or Update)
	return enrichedCoin, nil
}

// fetchAndCacheCoin handles caching and calls the core EnrichCoinData function.
// It now also handles storing the coin (Create or Update).
func (s *Service) fetchAndCacheCoin(ctx context.Context, mintAddress string) (*model.Coin, error) {
	slog.Debug("Starting dynamic coin enrichment", slog.String("mintAddress", mintAddress))
	enrichedCoin, err := s.EnrichCoinData( // This is model.Coin
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

	// Store the newly enriched coin using Create or Update logic
	existingCoin, getErr := s.store.Coins().GetByField(ctx, "mint_address", enrichedCoin.MintAddress)
	if getErr == nil && existingCoin != nil { // Found existing
		enrichedCoin.ID = existingCoin.ID // Preserve existing PK ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.Warn("Failed to update enriched coin in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
			// Continue, but log the error. The enriched coin is still returned.
		}
	} else { // Not found or other error getting it, so create new
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.Warn("Failed to create enriched coin in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
			// Continue, but log the error. The enriched coin is still returned.
		}
	}

	slog.Debug("Dynamic coin enrichment and storage attempt complete", slog.String("mintAddress", mintAddress))
	return enrichedCoin, nil // Return the enriched coin regardless of storage success (as per original logic)
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

	// Update all previous coins to not trending
	existingCoins, err := s.store.Coins().List(ctx)
	if err != nil {
		return fmt.Errorf("failed to list coins for updating trending status: %w", err)
	}

	if len(existingCoins) > 0 {
		slog.Debug("Updating trending status for existing coins", slog.Int("count", len(existingCoins)))
		// BulkUpsert expects *[]model.Coin, so we prepare a slice of model.Coin values
		coinsToUpdate := make([]model.Coin, 0, len(existingCoins))
		currentTime := time.Now().Format(time.RFC3339)
		for _, coin := range existingCoins { // Iterate by value to get copies
			if coin.IsTrending { // Only update if it's currently trending
				coin.IsTrending = false
				coin.LastUpdated = currentTime
				coinsToUpdate = append(coinsToUpdate, coin)
			}
		}

		if len(coinsToUpdate) > 0 {
			slog.Debug("Bulk updating existing coins to set IsTrending to false", slog.Int("count", len(coinsToUpdate)))
			if _, err := s.store.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil { // Pass address of the slice
				slog.Error("Failed to bulk update trending status for coins", slog.Any("error", err))
				// Depending on desired error handling, you might want to return here
				// return fmt.Errorf("failed to bulk update trending status: %w", err)
			}
		}
	}

	// Store all newly enriched coins
	// enrichedCoins.Coins is already []model.Coin, so we just need to pass its address if it's not empty.
	// Store all newly enriched coins using Create or Update logic per coin
	if len(enrichedCoins.Coins) > 0 {
		slog.Debug("Storing/updating enriched coins one by one", slog.Int("count", len(enrichedCoins.Coins)))
		for _, coin := range enrichedCoins.Coins {
			// Need to pass a pointer to coin for Create/Update methods
			currentCoin := coin
			existingCoin, getErr := s.store.Coins().GetByField(ctx, "mint_address", currentCoin.MintAddress)
			if getErr == nil && existingCoin != nil { // Found
				currentCoin.ID = existingCoin.ID // Preserve existing PK ID
				if errUpdate := s.store.Coins().Update(ctx, &currentCoin); errUpdate != nil {
					slog.Warn("Failed to update coin during refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errUpdate))
				}
			} else { // Not found or other error
				if errCreate := s.store.Coins().Create(ctx, &currentCoin); errCreate != nil {
					slog.Warn("Failed to create coin during refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errCreate))
				}
			}
		}
	}

	slog.Info("Coin store refresh complete",
		slog.Time("scrapeTimestamp", enrichedCoins.ScrapeTimestamp),
		slog.Int("enrichedCoinsProcessed", len(enrichedCoins.Coins)))

	return nil
}

func (s *Service) GetAllTokens(ctx context.Context) (*jupiter.CoinListResponse, error) {
	slog.Info("Starting to fetch all tokens from Jupiter")
	resp, err := s.jupiterClient.GetAllCoins(ctx)
	if err != nil {
		slog.Error("Failed to get all coins from Jupiter", slog.Any("error", err))
		return nil, fmt.Errorf("failed to get all coins from Jupiter: %w", err)
	}

	if resp == nil || len(resp.Coins) == 0 {
		slog.Info("No coins found from Jupiter.")
		return resp, nil // Return original response even if empty, plus no error
	}

	slog.Info("Successfully fetched all coins from Jupiter", slog.Int("fetched_count", len(resp.Coins)))

	rawCoinsToUpsert := make([]model.RawCoin, 0, len(resp.Coins))
	for _, jupiterCoin := range resp.Coins {
		rawCoinModelPtr := jupiterCoin.ToRawCoin() // This returns *model.RawCoin
		if rawCoinModelPtr != nil {
			rawCoinsToUpsert = append(rawCoinsToUpsert, *rawCoinModelPtr)
		}
	}

	if len(rawCoinsToUpsert) > 0 {
		slog.Debug("Storing/updating raw coins one by one for GetAllTokens", slog.Int("count", len(rawCoinsToUpsert)))
		var successfulDbOps int
		for _, rawCoin := range rawCoinsToUpsert {
			currentRawCoin := rawCoin // Create a new variable for the loop to take its address
			existingRawCoin, getErr := s.store.RawCoins().GetByField(ctx, "mint_address", currentRawCoin.MintAddress)
			var opErr error
			if getErr == nil && existingRawCoin != nil { // Found
				currentRawCoin.ID = existingRawCoin.ID // Preserve existing PK ID
				opErr = s.store.RawCoins().Update(ctx, &currentRawCoin)
				if opErr != nil {
					slog.Warn("Failed to update raw_coin in GetAllTokens", slog.String("mintAddress", currentRawCoin.MintAddress), slog.Any("error", opErr))
				}
			} else { // Not found or other error
				opErr = s.store.RawCoins().Create(ctx, &currentRawCoin)
				if opErr != nil {
					slog.Warn("Failed to create raw_coin in GetAllTokens", slog.String("mintAddress", currentRawCoin.MintAddress), slog.Any("error", opErr))
				}
			}
			if opErr == nil {
				successfulDbOps++
			}
		}
		slog.Info("Finished processing raw coins in GetAllTokens",
			slog.Int("total_fetched_from_jupiter", len(resp.Coins)),
			slog.Int("coins_prepared_for_upsert", len(rawCoinsToUpsert)),
			slog.Int("successful_database_operations", successfulDbOps))
		// Note: This does not return an error to the caller if individual DB ops fail, consistent with some interpretations of original BulkUpsert behavior (logging and continuing)
	} else {
		slog.Info("No valid raw coins were prepared for upserting after fetching from Jupiter in GetAllTokens.")
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
		slog.Debug("Storing/updating raw coins one by one for FetchAndStoreNewTokens", slog.Int("count", len(rawCoinsToUpsert)))
		var dbErrors []string
		var successfulDbOps int
		for _, rawCoin := range rawCoinsToUpsert {
			currentRawCoin := rawCoin // Create a new variable for the loop to take its address
			existingRawCoin, getErr := s.store.RawCoins().GetByField(ctx, "mint_address", currentRawCoin.MintAddress)
			var opErr error
			if getErr == nil && existingRawCoin != nil { // Found
				currentRawCoin.ID = existingRawCoin.ID // Preserve existing PK ID
				opErr = s.store.RawCoins().Update(ctx, &currentRawCoin)
				if opErr != nil {
					slog.Warn("Failed to update raw_coin in FetchAndStoreNewTokens", slog.String("mintAddress", currentRawCoin.MintAddress), slog.Any("error", opErr))
					dbErrors = append(dbErrors, opErr.Error())
				}
			} else { // Not found or other error
				opErr = s.store.RawCoins().Create(ctx, &currentRawCoin)
				if opErr != nil {
					slog.Warn("Failed to create raw_coin in FetchAndStoreNewTokens", slog.String("mintAddress", currentRawCoin.MintAddress), slog.Any("error", opErr))
					dbErrors = append(dbErrors, opErr.Error())
				}
			}
			if opErr == nil {
				successfulDbOps++
			}
		}
		slog.Info("Finished processing new tokens from Jupiter in FetchAndStoreNewTokens",
			slog.Int("total_fetched_from_jupiter", len(resp.Coins)),
			slog.Int("coins_prepared_for_upsert", len(rawCoinsToUpsert)),
			slog.Int("successful_database_operations", successfulDbOps))
		if len(dbErrors) > 0 {
			// Return an error if any DB operation failed, to inform the caller.
			return fmt.Errorf("encountered %d errors during raw coin db operations: %s", len(dbErrors), dbErrors[0])
		}
	} else {
		slog.Info("No valid raw coins were prepared for upserting after fetching from Jupiter in FetchAndStoreNewTokens.")
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
