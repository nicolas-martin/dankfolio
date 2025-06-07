package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"

	bclient "github.com/nicolas-martin/dankfolio/backend/internal/client/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles coin-related operations
type Service struct {
	config         *Config
	jupiterClient  jupiter.ClientAPI
	chainClient    bclient.GenericClientAPI // Changed from solanaClient
	offchainClient offchain.ClientAPI
	store          db.Store
	fetcherCtx     context.Context    // Context for the new token fetcher goroutine
	fetcherCancel  context.CancelFunc // Cancel function for the fetcher goroutine
	birdeyeClient  birdeye.ClientAPI
}

// NewService creates a new CoinService instance
func NewService(
	config *Config,
	httpClient *http.Client, // httpClient is still needed for other clients if they don't take it directly yet
	jupiterClient jupiter.ClientAPI,
	store db.Store,
	chainClient bclient.GenericClientAPI,
	birdeyeClient birdeye.ClientAPI,
	apiTracker clients.APICallTracker, // Added apiTracker
	offchainClient offchain.ClientAPI, // Added offchainClient
) *Service {
	service := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		chainClient:    chainClient,
		offchainClient: offchainClient, // Use passed-in offchainClient
		store:          store,
		birdeyeClient:  birdeyeClient,
		// apiTracker is not a field in Service struct, it's used by offchainClient
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
// It first checks the 'coins' table. If not found, it checks 'raw_coins'
// and enriches from there. If not in 'raw_coins' either, it enriches from scratch.
func (s *Service) GetCoinByMintAddress(ctx context.Context, mintAddress string) (*model.Coin, error) {
	// Try fetching from the 'coins' table first (enriched coins)
	coin, err := s.store.Coins().GetByField(ctx, "mint_address", mintAddress)
	if err == nil {
		// Found in 'coins' table, assume it's complete and return
		slog.Debug("Coin found in 'coins' table", slog.String("mintAddress", mintAddress))
		return coin, nil
	}

	// If not found in 'coins' table, check the specific error
	if errors.Is(err, db.ErrNotFound) {
		slog.Info("Coin not found in 'coins' table, checking 'raw_coins' table.", slog.String("mintAddress", mintAddress))

		// Try fetching from 'raw_coins' table
		rawCoin, rawErr := s.store.RawCoins().GetByField(ctx, "mint_address", mintAddress)
		if rawErr == nil {
			// Found in 'raw_coins', enrich it, save to 'coins', and return
			slog.Info("Coin found in 'raw_coins' table, proceeding with enrichment.", slog.String("mintAddress", mintAddress))
			// This function 'enrichRawCoinAndSave' will be implemented in the next step.
			// It's responsible for calling EnrichCoinData with rawCoin's details and saving to 'coins'.
			return s.enrichRawCoinAndSave(ctx, rawCoin)
		}

		// If not found in 'raw_coins' table, check the specific error for raw_coins lookup
		if errors.Is(rawErr, db.ErrNotFound) {
			slog.Info("Coin not found in 'raw_coins' table either. Enriching from scratch.", slog.String("mintAddress", mintAddress))
			// Not in 'coins' or 'raw_coins', so fetch from scratch (e.g., external APIs)
			return s.fetchAndCacheCoin(ctx, mintAddress)
		}

		// An error other than 'not found' occurred when querying 'raw_coins'
		slog.Error("Error fetching coin from 'raw_coins' table", slog.String("mintAddress", mintAddress), slog.Any("error", rawErr))
		return nil, fmt.Errorf("error fetching coin from raw_coins %s: %w", mintAddress, rawErr)

	}

	// An error other than 'not found' occurred when querying 'coins'
	slog.Error("Error fetching coin from 'coins' table", slog.String("mintAddress", mintAddress), slog.Any("error", err))
	return nil, fmt.Errorf("error fetching coin %s from 'coins': %w", mintAddress, err)
}

// enrichRawCoinAndSave enriches a raw coin's data and saves it to the 'coins' table.
func (s *Service) enrichRawCoinAndSave(ctx context.Context, rawCoin *model.RawCoin) (*model.Coin, error) {
	slog.Info("Starting enrichment from raw_coin data", slog.String("mintAddress", rawCoin.MintAddress), slog.String("rawCoinSymbol", rawCoin.Symbol))

	enrichedCoin, err := s.EnrichCoinData(
		ctx,
		rawCoin.MintAddress,
		rawCoin.Name,
		rawCoin.LogoUrl, // Pass rawCoin.LogoUrl as the initialIconURL
		0.0,             // Pass 0.0 for initialVolume, EnrichCoinData will fetch it
	)
	if err != nil {
		slog.Error("Enrichment from raw_coin failed", slog.String("mintAddress", rawCoin.MintAddress), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich raw_coin %s: %w", rawCoin.MintAddress, err)
	}

	// Save the enrichedCoin to the 'coins' table
	existingCoin, getErr := s.store.Coins().GetByField(ctx, "mint_address", enrichedCoin.MintAddress)
	if getErr == nil && existingCoin != nil { // Found existing, so update
		enrichedCoin.ID = existingCoin.ID // Preserve existing PK ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.Warn("Failed to update enriched coin (from raw) in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
			// Log and continue, returning the enrichedCoin as the enrichment itself was successful.
		} else {
			slog.Info("Successfully updated coin in 'coins' table from raw_coin enrichment", slog.String("mintAddress", enrichedCoin.MintAddress))
		}
	} else if errors.Is(getErr, db.ErrNotFound) { // Not found, so create
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.Warn("Failed to create enriched coin (from raw) in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
			// Log and continue, returning the enrichedCoin.
		} else {
			slog.Info("Successfully created coin in 'coins' table from raw_coin enrichment", slog.String("mintAddress", enrichedCoin.MintAddress))
		}
	} else if getErr != nil {
		// Another error occurred trying to get the coin before saving
		slog.Error("Error checking for existing coin before saving enriched (from raw) coin", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", getErr))
		return nil, fmt.Errorf("error checking existing coin %s before save: %w", enrichedCoin.MintAddress, getErr)
	}

	// After successful save to 'coins' table, delete from 'raw_coins'
	rawCoinPKIDStr := strconv.FormatUint(rawCoin.ID, 10)
	slog.Debug("Attempting to delete processed coin from 'raw_coins' table",
		slog.String("mintAddress", rawCoin.MintAddress),
		slog.String("rawCoinID", rawCoinPKIDStr))

	if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStr); delErr != nil {
		// Log the error but don't let it overshadow the successful enrichment.
		slog.Warn("Failed to delete coin from 'raw_coins' table after successful enrichment",
			slog.String("mintAddress", rawCoin.MintAddress),
			slog.String("rawCoinID", rawCoinPKIDStr),
			slog.Any("error", delErr))
	} else {
		slog.Info("Successfully deleted coin from 'raw_coins' table after enrichment",
			slog.String("mintAddress", rawCoin.MintAddress),
			slog.String("rawCoinID", rawCoinPKIDStr))
	}

	slog.Info("Successfully enriched and saved coin from raw_coin data", slog.String("mintAddress", enrichedCoin.MintAddress))
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

		slog.Info("Trending data is too old or missing, triggering fetch and enrichment...")
		// FetchAndEnrichTrendingTokens might make external API calls, which ideally shouldn't be part of the DB transaction.
		// However, its result (enrichedCoins) is used in subsequent DB operations.
		// For this refactor, we'll keep it inside for simplicity, but in a more advanced setup,
		// data fetching could be done outside the transaction, and only DB writes inside.
		enrichedCoins, err := s.UpdateTrendingTokensFromBirdeye(ctx)
		if err != nil {
			return fmt.Errorf("failed to fetch and enrich trending coins: %w", err)
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
			slog.Time("fetchTimestamp", enrichedCoins.FetchTimestamp),
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
		slog.Info("Attempting to bulk upsert raw coins in GetAllTokens", slog.Int("count", len(rawCoinsToUpsert)))
		rowsAffected, err := s.store.RawCoins().BulkUpsert(ctx, &rawCoinsToUpsert)
		if err != nil {
			slog.Error("Failed to bulk upsert raw coins in GetAllTokens", slog.Any("error", err), slog.Int("attempted_count", len(rawCoinsToUpsert)))
			// Decide if this error should be returned to the caller.
			// The original function did not return errors from individual DB ops.
			// For now, we'll log and continue, consistent with that.
		} else {
			slog.Info("Successfully bulk upserted raw coins in GetAllTokens",
				slog.Int64("rows_affected", rowsAffected),
				slog.Int("submitted_count", len(rawCoinsToUpsert)))
		}
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

	if len(resp) == 0 {
		slog.Info("No new coins found from Jupiter.")
		return nil
	}

	// convert to CoinListInfo
	coins := make([]*jupiter.CoinListInfo, 0, len(resp))
	for _, newToken := range resp {
		// Add nil check to prevent panic
		if newToken == nil {
			continue
		}

		dt, err := time.Parse(time.RFC3339, newToken.CreatedAt)
		if err != nil {
			slog.Warn("Failed to parse CreatedAt for new token", slog.String("mint", newToken.Mint), slog.Any("error", err))
		}
		coin := &jupiter.CoinListInfo{
			Address:     newToken.Mint, // Map mint to address
			ChainID:     101,           // Solana mainnet
			Decimals:    newToken.Decimals,
			Name:        newToken.Name,
			Symbol:      newToken.Symbol,
			LogoURI:     newToken.LogoURI, // Map logo_uri to logoURI
			Extensions:  make(map[string]any),
			DailyVolume: 0,
			Tags:        []string{},
			CreatedAt:   dt, // Use parsed time
		}
		coins = append(coins, coin)
	}

	if len(coins) == 0 {
		slog.Info("No valid coins to process from Jupiter.")
		return nil
	}

	slog.Info("Successfully fetched new coins from Jupiter", slog.Int("fetched_count", len(coins)))

	rawCoinsToUpsert := make([]model.RawCoin, 0, len(coins))
	for _, v_jupiterCoin := range coins { // v_jupiterCoin is of type jupiter.Coin
		rawCoinModelPtr := v_jupiterCoin.ToRawCoin() // This returns *model.RawCoin
		if rawCoinModelPtr != nil {
			rawCoinsToUpsert = append(rawCoinsToUpsert, *rawCoinModelPtr)
		}
	}

	if len(rawCoinsToUpsert) > 0 {
		slog.Info("Attempting to bulk upsert new raw coins in FetchAndStoreNewTokens", slog.Int("count", len(rawCoinsToUpsert)))
		rowsAffected, err := s.store.RawCoins().BulkUpsert(ctx, &rawCoinsToUpsert)
		if err != nil {
			slog.Error("Failed to bulk upsert new raw coins in FetchAndStoreNewTokens", slog.Any("error", err), slog.Int("attempted_count", len(rawCoinsToUpsert)))
			return fmt.Errorf("failed to bulk upsert new raw coins: %w", err) // Return the error
		}
		slog.Info("Successfully bulk upserted new raw coins in FetchAndStoreNewTokens",
			slog.Int64("rows_affected", rowsAffected),
			slog.Int("submitted_count", len(rawCoinsToUpsert)))
	} else {
		slog.Info("No valid new raw coins were prepared for upserting in FetchAndStoreNewTokens.")
	}

	return nil
}

// SearchCoins searches for coins using the DB's SearchCoins (custom store method)
// It now accepts db.ListOptions for pagination/sorting and returns a total count (currently estimated).
func (s *Service) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, opts db.ListOptions) ([]model.Coin, int32, error) {
	var limit, offset int32
	var sortBy string
	var sortDesc bool

	if opts.Limit != nil {
		limit = int32(*opts.Limit)
	}
	if opts.Offset != nil {
		offset = int32(*opts.Offset)
	}
	if opts.SortBy != nil {
		sortBy = *opts.SortBy
	}
	if opts.SortDesc != nil {
		sortDesc = *opts.SortDesc
	}

	coins, err := s.store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search coins via store: %w", err)
	}

	// TODO: The store.SearchCoins method needs to be updated to return a proper total count
	// that respects the filters (query, tags, minVolume24h) but ignores pagination (limit, offset).
	// For now, returning the length of the fetched coins as a placeholder for total_count.
	// This is only accurate if the number of results is less than the limit.
	// A more accurate temporary count might be len(coins) if offset is 0 and len(coins) < limit, otherwise it's unknown.
	// For simplicity now, just using len(coins). This will be inaccurate for actual pagination.
	return coins, int32(len(coins)), nil
}
