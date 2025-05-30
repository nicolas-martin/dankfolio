package coin

import (
	"context"
	"errors" // Added for errors.Is
	"fmt"
	"log/slog" // Import slog
	"net/http"
	"os" // Import os for Exit
	// "sort" // sort.Slice in GetCoins is removed, GetTrendingCoins still uses it.
	"sort"    // Keep for GetTrendingCoins
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

// GetCoinByID returns a coin strictly by its numeric primary key (ID).
func (s *Service) GetCoinByID(ctx context.Context, idStr string) (*model.Coin, error) {
	// Attempt to parse idStr as a uint64.
	if _, parseErr := strconv.ParseUint(idStr, 10, 64); parseErr != nil {
		// If parsing fails, idStr is not a valid numeric ID format.
		slog.Info("GetCoinByID received non-numeric ID", slog.String("idStr", idStr), slog.Any("error", parseErr))
		return nil, fmt.Errorf("invalid coin ID format: %s is not a valid numeric ID", idStr)
	}

	// If parsing is successful, call s.store.Coins().Get(ctx, idStr)
	// The repository's Get method takes a string; GORM handles conversion for uint64 PK.
	coin, err := s.store.Coins().Get(ctx, idStr)
	if err != nil {
		// If the coin is not found or any other DB error occurs, return the error.
		if errors.Is(err, db.ErrNotFound) { // Make sure to import "errors"
			slog.Info("Coin not found by numeric ID", slog.String("idStr", idStr))
			// Return db.ErrNotFound directly or a wrapped error, depending on desired API contract.
			// For consistency with other Get methods, returning a wrapped error might be better.
			return nil, fmt.Errorf("coin with ID %s not found: %w", idStr, db.ErrNotFound)
		}
		slog.Error("Failed to get coin by numeric ID", slog.String("idStr", idStr), slog.Any("error", err))
		return nil, fmt.Errorf("failed to get coin by ID %s: %w", idStr, err)
	}

	return coin, nil
}

// GetCoinByMintAddress returns a coin by its mint address.
// If not found in the store, it attempts to fetch, enrich, and cache it.
func (s *Service) GetCoinByMintAddress(ctx context.Context, mintAddress string) (*model.Coin, error) {
	// Try fetching from the store first
	coin, err := s.store.Coins().GetByField(ctx, "mint_address", mintAddress)
	if err == nil {
		// Found in store
		return coin, nil
	}

	// If not found, proceed to dynamic enrichment
	if errors.Is(err, db.ErrNotFound) {
		slog.Info("Coin not found by mint_address, attempting dynamic enrichment", slog.String("mintAddress", mintAddress))
		// fetchAndCacheCoin handles enrichment and storing the coin.
		// It returns the enriched coin and any error encountered during that process.
		return s.fetchAndCacheCoin(ctx, mintAddress)
	}

	// For other types of errors (not db.ErrNotFound), return the error
	slog.Error("Error fetching coin by mint_address from store", slog.String("mintAddress", mintAddress), slog.Any("error", err))
	return nil, fmt.Errorf("error fetching coin by mint address %s from store: %w", mintAddress, err)
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
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		// get the trending by asc order
		c, err := txStore.ListTrendingCoins(ctx)
		if err != nil {
			return fmt.Errorf("failed to get latest trending coin: %w", err)
		}

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

		if !needsRefresh {
			slog.Info("Trending data is fresh, no refresh needed.")
			return nil
		}

		slog.Info("Trending data is too old or missing, triggering scrape and enrichment...")
		// ScrapeAndEnrichToFile might make external API calls, which ideally shouldn't be part of the DB transaction.
		// However, its result (enrichedCoins) is used in subsequent DB operations.
		// For this refactor, we'll keep it inside for simplicity, but in a more advanced setup,
		// data fetching could be done outside the transaction, and only DB writes inside.
		enrichedCoins, err := s.ScrapeAndEnrichToFile(ctx) // s.ScrapeAndEnrichToFile still uses s.jupiterClient etc.
		if err != nil {
			return fmt.Errorf("failed to scrape and enrich coins: %w", err)
		}

		existingCoins, err := txStore.Coins().List(ctx)
		if err != nil {
			return fmt.Errorf("failed to list coins for updating trending status: %w", err)
		}

		if len(existingCoins) > 0 {
			slog.Debug("Updating trending status for existing coins", slog.Int("count", len(existingCoins)))
			coinsToUpdate := make([]model.Coin, 0, len(existingCoins))
			currentTime := time.Now().Format(time.RFC3339)
			for _, coin := range existingCoins {
				if coin.IsTrending {
					coin.IsTrending = false
					coin.LastUpdated = currentTime
					coinsToUpdate = append(coinsToUpdate, coin)
				}
			}
			if len(coinsToUpdate) > 0 {
				slog.Debug("Bulk updating existing coins to set IsTrending to false", slog.Int("count", len(coinsToUpdate)))
				if _, err := txStore.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil {
					// Log error but don't necessarily fail the whole transaction for this non-critical part.
					// Depending on requirements, could return err here.
					slog.Error("Failed to bulk update trending status for coins", slog.Any("error", err))
				}
			}
		}

		if len(enrichedCoins.Coins) > 0 {
			slog.Debug("Storing/updating enriched coins from file", slog.Int("count", len(enrichedCoins.Coins)))
			var storeErrors []string
			for _, coinFromFile := range enrichedCoins.Coins {
				currentCoin := coinFromFile
				existingCoin, getErr := txStore.Coins().GetByField(ctx, "mint_address", currentCoin.MintAddress)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.Warn("Failed to update coin during refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.Warn("Failed to create coin during refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.Warn("Error checking coin before upsert during refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.Error("Encountered errors during storing enriched coins in transaction", slog.Int("error_count", len(storeErrors)))
				// Decide if these errors should roll back the transaction.
				// For now, we are logging but the transaction will commit unless a fatal error is returned from here.
				// To ensure rollback on these, return an error:
				// return fmt.Errorf("failed to store all enriched coins: %s", strings.Join(storeErrors, "; "))
			}
		}

		slog.Info("Coin store refresh transaction part complete",
			slog.Time("scrapeTimestamp", enrichedCoins.ScrapeTimestamp),
			slog.Int("enrichedCoinsProcessed", len(enrichedCoins.Coins)))
		return nil // Commit transaction
	})
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
