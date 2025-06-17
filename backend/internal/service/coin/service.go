package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

// Service handles coin-related operations
type Service struct {
	config         *Config
	jupiterClient  jupiter.ClientAPI
	chainClient    clients.GenericClientAPI // Changed from solanaClient
	offchainClient offchain.ClientAPI
	store          db.Store
	fetcherCtx     context.Context    // Context for the new token fetcher goroutine
	fetcherCancel  context.CancelFunc // Cancel function for the fetcher goroutine
	birdeyeClient  birdeye.ClientAPI
	apiTracker     telemetry.TelemetryAPI
	cache          CoinCache
}

// NewService creates a new CoinService instance
func NewService(
	config *Config,
	jupiterClient jupiter.ClientAPI,
	store db.Store,
	chainClient clients.GenericClientAPI,
	birdeyeClient birdeye.ClientAPI,
	apiTracker telemetry.TelemetryAPI,
	offchainClient offchain.ClientAPI,
	coinCache CoinCache, // <--- ADD THIS PARAMETER
) *Service {
	service := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		chainClient:    chainClient,
		offchainClient: offchainClient,
		store:          store,
		birdeyeClient:  birdeyeClient,
		apiTracker:     apiTracker,
		cache:          coinCache, // <--- ADD THIS LINE
	}
	service.fetcherCtx, service.fetcherCancel = context.WithCancel(context.Background())

	if service.config != nil {
		if service.config.TrendingFetchInterval > 0 {
			go service.runTrendingTokenFetcher(service.fetcherCtx)
		} else {
			slog.Warn("Trending token fetcher is disabled as TrendingFetchInterval is not configured or is zero.")
		}

		if service.config.NewCoinsFetchInterval > 0 {
			go service.runNewTokenFetcher(service.fetcherCtx)
		} else {
			slog.Warn("New token fetcher is disabled as NewCoinsFetchInterval is not configured or is zero.")
		}

		if service.config.TopGainersFetchInterval > 0 {
			go service.runTopGainersTokenFetcher(service.fetcherCtx)
		} else {
			slog.Warn("Top gainers token fetcher is disabled as TopGainersFetchInterval is not configured or is zero.")
		}
	} else {
		slog.Warn("Coin service config is nil. Fetchers will be disabled.")
	}

	return service
}

func (s *Service) runTrendingTokenFetcher(ctx context.Context) {
	if s.config == nil {
		slog.ErrorContext(ctx, "runTrendingTokenFetcher: service config is nil")
		return
	}
	slog.InfoContext(ctx, "Starting trending token fetcher", slog.Duration("interval", s.config.TrendingFetchInterval))
	ticker := time.NewTicker(s.config.TrendingFetchInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.InfoContext(ctx, "Periodically fetching trending tokens...")
			if err := s.FechAndStoreTrendingTokens(ctx); err != nil {
				slog.ErrorContext(ctx, "Failed to fetch and store trending tokens periodically", slog.Any("error", err))
			} else {
				slog.InfoContext(ctx, "Successfully fetched and stored trending tokens periodically.")
			}
		case <-ctx.Done():
			slog.InfoContext(ctx, "Trending token fetcher stopping due to context cancellation.")
			return
		}
	}
}

func (s *Service) runNewTokenFetcher(ctx context.Context) {
	if s.config == nil {
		slog.ErrorContext(ctx, "runNewTokenFetcher: service config is nil")
		return
	}
	slog.InfoContext(ctx, "Starting new token fetcher", slog.Duration("interval", s.config.NewCoinsFetchInterval))
	ticker := time.NewTicker(s.config.NewCoinsFetchInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.InfoContext(ctx, "Periodically fetching new tokens...")
			if err := s.FetchAndStoreNewTokens(ctx); err != nil {
				slog.ErrorContext(ctx, "Failed to fetch and store new tokens periodically", slog.Any("error", err))
			} else {
				slog.InfoContext(ctx, "Successfully fetched and stored new tokens periodically.")
			}
		case <-ctx.Done():
			slog.InfoContext(ctx, "New token fetcher stopping due to context cancellation.")
			return
		}
	}
}

func (s *Service) runTopGainersTokenFetcher(ctx context.Context) {
	if s.config == nil {
		slog.ErrorContext(ctx, "runTopGainersTokenFetcher: service config is nil")
		return
	}
	slog.InfoContext(ctx, "Starting top gainers token fetcher", slog.Duration("interval", s.config.TopGainersFetchInterval))
	ticker := time.NewTicker(s.config.TopGainersFetchInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.InfoContext(ctx, "Periodically fetching top gainers tokens...")
			if err := s.FetchAndStoreTopGainersTokens(ctx); err != nil {
				slog.ErrorContext(ctx, "Failed to fetch and store top gainers tokens periodically", slog.Any("error", err))
			} else {
				slog.InfoContext(ctx, "Successfully fetched and stored top gainers tokens periodically.")
			}
		case <-ctx.Done():
			slog.InfoContext(ctx, "Top gainers token fetcher stopping due to context cancellation.")
			return
		}
	}
}

func (s *Service) Shutdown() {
	slog.Info("Shutting down coin service...")
	if s.fetcherCancel != nil {
		slog.Info("Cancelling fetchers...")
		s.fetcherCancel()
	}
	slog.Info("Coin service shutdown complete.")
}

func (s *Service) GetCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	if opts.SortBy == nil || *opts.SortBy == "" {
		defaultSortBy := "volume_24h"
		defaultSortDesc := true
		opts.SortBy = &defaultSortBy
		opts.SortDesc = &defaultSortDesc
		slog.DebugContext(ctx, "Applying default sort order to GetCoins", "sortBy", *opts.SortBy, "sortDesc", *opts.SortDesc)
	}

	const defaultLimit = 20
	const maxLimit = 100

	if opts.Limit == nil || *opts.Limit <= 0 {
		slog.DebugContext(ctx, "Applying default limit to GetCoins", "defaultLimit", defaultLimit)
		limit := defaultLimit
		opts.Limit = &limit
	} else if *opts.Limit > maxLimit {
		slog.WarnContext(ctx, "Requested limit exceeds maximum, capping limit", "requestedLimit", *opts.Limit, "maxLimit", maxLimit)
		limit := maxLimit
		opts.Limit = &limit
	}

	coins, totalCount, err := s.store.Coins().List(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list coins: %w", err)
	}
	return coins, totalCount, nil
}

func (s *Service) GetTrendingCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	trendingCoins, totalCount, err := s.store.ListTrendingCoins(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list trending coins: %w", err)
	}
	sort.Slice(trendingCoins, func(i, j int) bool {
		return trendingCoins[i].Volume24h > trendingCoins[j].Volume24h
	})
	return trendingCoins, totalCount, nil
}

func (s *Service) GetCoinByID(ctx context.Context, idStr string) (*model.Coin, error) {
	if _, parseErr := strconv.ParseUint(idStr, 10, 64); parseErr != nil {
		slog.InfoContext(ctx, "GetCoinByID received non-numeric ID", slog.String("idStr", idStr), slog.Any("error", parseErr))
		return nil, fmt.Errorf("invalid coin ID format: %s is not a valid numeric ID", idStr)
	}
	coin, err := s.store.Coins().Get(ctx, idStr)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			slog.InfoContext(ctx, "Coin not found by numeric ID", slog.String("idStr", idStr))
			return nil, fmt.Errorf("coin with ID %s not found: %w", idStr, db.ErrNotFound)
		}
		slog.ErrorContext(ctx, "Failed to get coin by numeric ID", slog.String("idStr", idStr), slog.Any("error", err))
		return nil, fmt.Errorf("failed to get coin by ID %s: %w", idStr, err)
	}
	return coin, nil
}

func (s *Service) GetCoinByMintAddress(ctx context.Context, mintAddress string) (*model.Coin, error) {
	if !util.IsValidSolanaAddress(mintAddress) {
		return nil, fmt.Errorf("invalid mint_address: %s", mintAddress)
	}
	coin, err := s.store.Coins().GetByField(ctx, "mint_address", mintAddress)
	if err == nil {
		slog.DebugContext(ctx, "Coin found in 'coins' table", slog.String("mintAddress", mintAddress))
		return coin, nil
	}
	if errors.Is(err, db.ErrNotFound) {
		slog.InfoContext(ctx, "Coin not found in 'coins' table, checking 'raw_coins' table.", slog.String("mintAddress", mintAddress))
		rawCoin, rawErr := s.store.RawCoins().GetByField(ctx, "mint_address", mintAddress)
		if rawErr == nil {
			slog.InfoContext(ctx, "Coin found in 'raw_coins' table, proceeding with enrichment.", slog.String("mintAddress", mintAddress))
			return s.enrichRawCoinAndSave(ctx, rawCoin)
		}
		if errors.Is(rawErr, db.ErrNotFound) {
			slog.InfoContext(ctx, "Coin not found in 'raw_coins' table either. Enriching from scratch.", slog.String("mintAddress", mintAddress))
			return s.fetchAndCacheCoin(ctx, mintAddress)
		}
		slog.ErrorContext(ctx, "Error fetching coin from 'raw_coins' table", slog.String("mintAddress", mintAddress), slog.Any("error", rawErr))
		return nil, fmt.Errorf("error fetching coin from raw_coins %s: %w", mintAddress, rawErr)
	}
	slog.ErrorContext(ctx, "Error fetching coin from 'coins' table", slog.String("mintAddress", mintAddress), slog.Any("error", err))
	return nil, fmt.Errorf("error fetching coin %s from 'coins': %w", mintAddress, err)
}

func (s *Service) enrichRawCoinAndSave(ctx context.Context, rawCoin *model.RawCoin) (*model.Coin, error) {
	slog.InfoContext(ctx, "Starting enrichment from raw_coin data", slog.String("mintAddress", rawCoin.MintAddress), slog.String("rawCoinSymbol", rawCoin.Symbol))
	initialData := &birdeye.TokenDetails{
		Address:  rawCoin.MintAddress,
		Name:     rawCoin.Name,
		Symbol:   rawCoin.Symbol,
		LogoURI:  rawCoin.LogoUrl,
		Decimals: rawCoin.Decimals,
	}
	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Enrichment from raw_coin failed", slog.String("mintAddress", rawCoin.MintAddress), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich raw_coin %s: %w", rawCoin.MintAddress, err)
	}
	existingCoin, getErr := s.store.Coins().GetByField(ctx, "mint_address", enrichedCoin.MintAddress)
	if getErr == nil && existingCoin != nil {
		enrichedCoin.ID = existingCoin.ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to update enriched coin (from raw) in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
		} else {
			slog.InfoContext(ctx, "Successfully updated coin in 'coins' table from raw_coin enrichment", slog.String("mintAddress", enrichedCoin.MintAddress))
		}
	} else if errors.Is(getErr, db.ErrNotFound) {
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to create enriched coin (from raw) in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
		} else {
			slog.InfoContext(ctx, "Successfully created coin in 'coins' table from raw_coin enrichment", slog.String("mintAddress", enrichedCoin.MintAddress))
		}
	} else if getErr != nil {
		slog.ErrorContext(ctx, "Error checking for existing coin before saving enriched (from raw) coin", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", getErr))
		return nil, fmt.Errorf("error checking existing coin %s before save: %w", enrichedCoin.MintAddress, getErr)
	}
	rawCoinPKIDStr := strconv.FormatUint(rawCoin.ID, 10)
	slog.DebugContext(ctx, "Attempting to delete processed coin from 'raw_coins' table", slog.String("mintAddress", rawCoin.MintAddress), slog.String("rawCoinID", rawCoinPKIDStr))
	if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStr); delErr != nil {
		slog.WarnContext(ctx, "Failed to delete coin from 'raw_coins' table after successful enrichment", slog.String("mintAddress", rawCoin.MintAddress), slog.String("rawCoinID", rawCoinPKIDStr), slog.Any("error", delErr))
	} else {
		slog.InfoContext(ctx, "Successfully deleted coin from 'raw_coins' table after enrichment", slog.String("mintAddress", rawCoin.MintAddress), slog.String("rawCoinID", rawCoinPKIDStr))
	}
	slog.InfoContext(ctx, "Successfully enriched and saved coin from raw_coin data", slog.String("mintAddress", enrichedCoin.MintAddress))
	return enrichedCoin, nil
}

func (s *Service) fetchAndCacheCoin(ctx context.Context, mintAddress string) (*model.Coin, error) {
	slog.DebugContext(ctx, "Starting dynamic coin enrichment", slog.String("mintAddress", mintAddress))
	initialData := &birdeye.TokenDetails{Address: mintAddress}
	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Dynamic coin enrichment failed", slog.String("mintAddress", mintAddress), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich coin %s: %w", mintAddress, err)
	}
	existingCoin, getErr := s.store.Coins().GetByField(ctx, "mint_address", enrichedCoin.MintAddress)
	if getErr == nil && existingCoin != nil {
		enrichedCoin.ID = existingCoin.ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to update enriched coin in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
		}
	} else {
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to create enriched coin in store", slog.String("mintAddress", enrichedCoin.MintAddress), slog.Any("error", dbErr))
		}
	}
	slog.DebugContext(ctx, "Dynamic coin enrichment and storage attempt complete", slog.String("mintAddress", mintAddress))
	return enrichedCoin, nil
}

func (s *Service) FechAndStoreTrendingTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		enrichedCoins, err := s.UpdateTrendingTokensFromBirdeye(ctx)
		if err != nil {
			return fmt.Errorf("failed to fetch and enrich trending coins: %w", err)
		}

		// Get existing coins with "trending" tag to clear them
		existingTrendingCoins, err := txStore.SearchCoins(ctx, "", []string{"trending"}, 0, 1000, 0, "", false)
		if err != nil {
			return fmt.Errorf("failed to search for existing trending coins: %w", err)
		}

		// Clear "trending" tag from existing trending coins
		if len(existingTrendingCoins) > 0 {
			slog.DebugContext(ctx, "Clearing trending status for existing trending coins", slog.Int("count", len(existingTrendingCoins)))
			coinsToUpdate := make([]model.Coin, 0, len(existingTrendingCoins))
			currentTime := time.Now().Format(time.RFC3339)
			for _, coin := range existingTrendingCoins {
				modifiedCoin := coin
				// Remove "trending" tag
				newTags := make([]string, 0, len(coin.Tags))
				for _, tag := range coin.Tags {
					if tag != "trending" {
						newTags = append(newTags, tag)
					}
				}
				modifiedCoin.Tags = newTags
				// Also clear the legacy IsTrending field for backward compatibility
				if coin.IsTrending {
					modifiedCoin.IsTrending = false
				}
				modifiedCoin.LastUpdated = currentTime
				coinsToUpdate = append(coinsToUpdate, modifiedCoin)
			}

			if len(coinsToUpdate) > 0 {
				slog.DebugContext(ctx, "Bulk updating existing trending coins to clear status", slog.Int("count", len(coinsToUpdate)))
				if _, err := txStore.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil {
					slog.ErrorContext(ctx, "Failed to bulk update trending status for coins", slog.Any("error", err))
				}
			}
		}

		// Store/update enriched trending coins
		if len(enrichedCoins.Coins) > 0 {
			slog.DebugContext(ctx, "Storing/updating enriched trending coins", slog.Int("count", len(enrichedCoins.Coins)))
			var storeErrors []string
			for _, coin := range enrichedCoins.Coins {
				currentCoin := coin
				// Add "trending" tag
				currentCoin.Tags = append(currentCoin.Tags, "trending")
				// Also set the legacy IsTrending field for backward compatibility
				currentCoin.IsTrending = true

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "mint_address", currentCoin.MintAddress)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update trending coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create trending coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during trending refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.ErrorContext(ctx, "Encountered errors during storing trending coins in transaction", slog.Int("error_count", len(storeErrors)))
			}
		} else {
			slog.InfoContext(ctx, "No new trending coins to store from this refresh.", slog.Time("fetch_timestamp", enrichedCoins.FetchTimestamp), slog.Int("incoming_enriched_coin_count", len(enrichedCoins.Coins)))
		}

		slog.InfoContext(ctx, "Trending coin store refresh transaction complete", slog.Time("fetchTimestamp", enrichedCoins.FetchTimestamp), slog.Int("enrichedCoinsProcessed", len(enrichedCoins.Coins)))
		return nil
	})
}

func (s *Service) FetchAndStoreTopGainersTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		// Fetch top gainers from BirdEye using price change percentage sorting
		birdeyeTokens, err := s.birdeyeClient.GetTrendingTokens(ctx, birdeye.TrendingTokensParams{
			SortBy:   "price24hChangePercent",
			SortType: "desc",
			Limit:    10,
		})
		if err != nil {
			return fmt.Errorf("failed to get top gainers tokens from BirdEye: %w", err)
		}

		if len(birdeyeTokens.Data.Tokens) == 0 {
			slog.InfoContext(ctx, "No top gainers tokens received from BirdEye.")
			return nil
		}

		// Enrich the tokens using the existing enrichment process
		enrichedCoins, err := s.processBirdeyeTokens(ctx, birdeyeTokens.Data.Tokens)
		if err != nil {
			return fmt.Errorf("failed to enrich top gainers tokens: %w", err)
		}

		// Get existing coins with "top-gainer" tag to clear them
		existingTopGainers, err := txStore.SearchCoins(ctx, "", []string{"top-gainer"}, 0, 1000, 0, "", false)
		if err != nil {
			return fmt.Errorf("failed to search for existing top gainers: %w", err)
		}

		// Clear "top-gainer" tag from existing top gainers
		if len(existingTopGainers) > 0 {
			slog.DebugContext(ctx, "Clearing top gainers status for existing top gainers", slog.Int("count", len(existingTopGainers)))
			coinsToUpdate := make([]model.Coin, 0, len(existingTopGainers))
			currentTime := time.Now().Format(time.RFC3339)
			for _, coin := range existingTopGainers {
				modifiedCoin := coin
				// Remove "top-gainer" tag
				newTags := make([]string, 0, len(coin.Tags))
				for _, tag := range coin.Tags {
					if tag != "top-gainer" {
						newTags = append(newTags, tag)
					}
				}
				modifiedCoin.Tags = newTags
				modifiedCoin.LastUpdated = currentTime
				coinsToUpdate = append(coinsToUpdate, modifiedCoin)
			}

			if len(coinsToUpdate) > 0 {
				slog.DebugContext(ctx, "Bulk updating existing top gainers to clear status", slog.Int("count", len(coinsToUpdate)))
				if _, err := txStore.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil {
					slog.ErrorContext(ctx, "Failed to bulk update top gainers status for coins", slog.Any("error", err))
				}
			}
		}

		// Store/update enriched top gainers coins
		if len(enrichedCoins) > 0 {
			slog.DebugContext(ctx, "Storing/updating enriched top gainers coins", slog.Int("count", len(enrichedCoins)))
			var storeErrors []string
			for _, coin := range enrichedCoins {
				currentCoin := coin
				// Add "top-gainer" tag
				currentCoin.Tags = append(currentCoin.Tags, "top-gainer")

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "mint_address", currentCoin.MintAddress)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update top gainer coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create top gainer coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during top gainers refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.ErrorContext(ctx, "Encountered errors during storing top gainers coins in transaction", slog.Int("error_count", len(storeErrors)))
			}
		} else {
			slog.InfoContext(ctx, "No new top gainers coins to store from this refresh.")
		}

		slog.InfoContext(ctx, "Top gainers coin store refresh transaction complete", slog.Int("enrichedCoinsProcessed", len(enrichedCoins)))
		return nil
	})
}

func (s *Service) GetAllTokens(ctx context.Context) (*jupiter.CoinListResponse, error) {
	slog.InfoContext(ctx, "Starting to fetch all tokens from Jupiter")
	resp, err := s.jupiterClient.GetAllCoins(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get all coins from Jupiter", slog.Any("error", err))
		return nil, fmt.Errorf("failed to get all coins from Jupiter: %w", err)
	}
	if resp == nil || len(resp.Coins) == 0 {
		slog.InfoContext(ctx, "No coins found from Jupiter.")
		return resp, nil
	}
	slog.InfoContext(ctx, "Successfully fetched all coins from Jupiter", slog.Int("fetched_count", len(resp.Coins)))
	rawCoinsToUpsert := make([]model.RawCoin, 0, len(resp.Coins))
	for _, jupiterCoin := range resp.Coins {
		rawCoinModelPtr := jupiterCoin.ToRawCoin()
		if rawCoinModelPtr != nil {
			rawCoinsToUpsert = append(rawCoinsToUpsert, *rawCoinModelPtr)
		}
	}
	if len(rawCoinsToUpsert) > 0 {
		slog.InfoContext(ctx, "Attempting to bulk upsert raw coins in GetAllTokens", slog.Int("count", len(rawCoinsToUpsert)))
		rowsAffected, err := s.store.RawCoins().BulkUpsert(ctx, &rawCoinsToUpsert)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to bulk upsert raw coins in GetAllTokens", slog.Any("error", err), slog.Int("attempted_count", len(rawCoinsToUpsert)))
		} else {
			slog.InfoContext(ctx, "Successfully bulk upserted raw coins in GetAllTokens", slog.Int64("rows_affected", rowsAffected), slog.Int("submitted_count", len(rawCoinsToUpsert)))
		}
	} else {
		slog.InfoContext(ctx, "No valid raw coins were prepared for upserting after fetching from Jupiter in GetAllTokens.")
	}
	return resp, nil
}

func (s *Service) FetchAndStoreNewTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		slog.InfoContext(ctx, "Starting to fetch and store new tokens from Jupiter")
		limit := 50
		offset := 0
		params := &jupiter.NewCoinsParams{Limit: limit, Offset: offset}
		resp, err := s.jupiterClient.GetNewCoins(ctx, params)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get new coins from Jupiter", slog.Any("error", err))
			return fmt.Errorf("failed to get new coins from Jupiter: %w", err)
		}
		if len(resp) == 0 {
			slog.InfoContext(ctx, "No new coins found from Jupiter.")
			return nil
		}

		// Convert Jupiter new coins to BirdEye token details for enrichment
		tokenDetails := make([]birdeye.TokenDetails, 0, len(resp))
		for _, newToken := range resp {
			if newToken == nil {
				continue
			}

			tokenDetail := birdeye.TokenDetails{
				Address:  newToken.Mint,
				Name:     newToken.Name,
				Symbol:   newToken.Symbol,
				LogoURI:  newToken.LogoURI,
				Decimals: newToken.Decimals,
				// Note: CreatedAt is not part of TokenDetails, it will be handled during enrichment
			}
			tokenDetails = append(tokenDetails, tokenDetail)
		}

		if len(tokenDetails) == 0 {
			slog.InfoContext(ctx, "No valid tokens to process from Jupiter.")
			return nil
		}

		// Enrich the tokens using the existing enrichment process
		enrichedCoins, err := s.processBirdeyeTokens(ctx, tokenDetails)
		if err != nil {
			return fmt.Errorf("failed to enrich new tokens: %w", err)
		}

		// Get existing coins with "new-coin" tag to clear them
		existingNewCoins, err := txStore.SearchCoins(ctx, "", []string{"new-coin"}, 0, 1000, 0, "", false)
		if err != nil {
			return fmt.Errorf("failed to search for existing new coins: %w", err)
		}

		// Clear "new-coin" tag from existing new coins
		if len(existingNewCoins) > 0 {
			slog.DebugContext(ctx, "Clearing new coins status for existing new coins", slog.Int("count", len(existingNewCoins)))
			coinsToUpdate := make([]model.Coin, 0, len(existingNewCoins))
			currentTime := time.Now().Format(time.RFC3339)
			for _, coin := range existingNewCoins {
				modifiedCoin := coin
				// Remove "new-coin" tag
				newTags := make([]string, 0, len(coin.Tags))
				for _, tag := range coin.Tags {
					if tag != "new-coin" {
						newTags = append(newTags, tag)
					}
				}
				modifiedCoin.Tags = newTags
				modifiedCoin.LastUpdated = currentTime
				coinsToUpdate = append(coinsToUpdate, modifiedCoin)
			}

			if len(coinsToUpdate) > 0 {
				slog.DebugContext(ctx, "Bulk updating existing new coins to clear status", slog.Int("count", len(coinsToUpdate)))
				if _, err := txStore.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil {
					slog.ErrorContext(ctx, "Failed to bulk update new coins status for coins", slog.Any("error", err))
				}
			}
		}

		// Store/update enriched new coins
		if len(enrichedCoins) > 0 {
			slog.DebugContext(ctx, "Storing/updating enriched new coins", slog.Int("count", len(enrichedCoins)))
			var storeErrors []string
			for _, coin := range enrichedCoins {
				currentCoin := coin
				// Add "new-coin" tag
				currentCoin.Tags = append(currentCoin.Tags, "new-coin")

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "mint_address", currentCoin.MintAddress)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update new coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create new coin", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during new coins refresh", slog.String("mintAddress", currentCoin.MintAddress), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.ErrorContext(ctx, "Encountered errors during storing new coins in transaction", slog.Int("error_count", len(storeErrors)))
			}
		} else {
			slog.InfoContext(ctx, "No new coins to store from this refresh.")
		}

		slog.InfoContext(ctx, "New coins store refresh transaction complete", slog.Int("enrichedCoinsProcessed", len(enrichedCoins)))
		return nil
	})
}

func (s *Service) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, opts db.ListOptions) ([]model.Coin, int32, error) {
	if len(query) > 256 {
		return nil, 0, fmt.Errorf("query string too long (max 256 chars): %d", len(query))
	}
	for i, tag := range tags {
		if len(tag) > 64 {
			return nil, 0, fmt.Errorf("tag at index %d too long (max 64 chars): %s", i, tag)
		}
	}
	if minVolume24h < 0 {
		return nil, 0, fmt.Errorf("min_volume_24h cannot be negative: %f", minVolume24h)
	}
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
	return coins, int32(len(coins)), nil
}

/*
// Config struct might be defined in a model or config package.
type Config struct {
    TrendingFetchInterval time.Duration `env:"COIN_TRENDING_FETCH_INTERVAL" envDefault:"5m"`
    NewCoinsFetchInterval time.Duration `env:"COIN_NEW_COINS_FETCH_INTERVAL" envDefault:"1h"`
}
*/

// --- Added RPC Methods ---
const (
	defaultCacheTTL = 5 * time.Minute
)

// GetNewCoins implements the RPC method with domain types.
func (s *Service) GetNewCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	cacheKey := "newCoins"
	if limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, limit)
	}
	if offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, offset)
	}

	listOpts := db.ListOptions{}
	if limit > 0 {
		limitInt := int(limit)
		listOpts.Limit = &limitInt
	}
	if offset > 0 {
		offsetInt := int(offset)
		listOpts.Offset = &offsetInt
	}

	// First, check if we have any existing new coins
	existingNewCoins, err := s.store.SearchCoins(ctx, "", []string{"new-coin"}, 0, 1, 0, "", false)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to check for existing new coins", "error", err)
		// Continue with the normal flow even if check fails
	} else if len(existingNewCoins) == 0 {
		// No new coins exist, fetch them immediately
		slog.InfoContext(ctx, "No new coins found in database, fetching immediately...")
		if fetchErr := s.FetchAndStoreNewTokens(ctx); fetchErr != nil {
			slog.ErrorContext(ctx, "Failed to fetch new coins immediately", "error", fetchErr)
			// Don't return error, continue with empty results
		} else {
			slog.InfoContext(ctx, "Successfully fetched new coins immediately")
		}
	}

	modelCoins, totalCount, err := s.store.ListNewestCoins(ctx, listOpts)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to list newest coins from store", "error", err)
		return nil, 0, fmt.Errorf("failed to list newest coins: %w", err)
	}

	return modelCoins, totalCount, nil
}

// GetTrendingCoinsRPC implements the RPC method with domain types (renamed to avoid conflict).
func (s *Service) GetTrendingCoinsRPC(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	cacheKey := "trendingCoins_rpc"
	if limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, limit)
	}
	if offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, offset)
	}

	listOpts := db.ListOptions{}
	if limit > 0 {
		limitInt := int(limit)
		listOpts.Limit = &limitInt
	}
	if offset > 0 {
		offsetInt := int(offset)
		listOpts.Offset = &offsetInt
	}

	// First, check if we have any existing trending coins
	existingTrendingCoins, err := s.store.SearchCoins(ctx, "", []string{"trending"}, 0, 1, 0, "", false)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to check for existing trending coins", "error", err)
		// Continue with the normal flow even if check fails
	} else if len(existingTrendingCoins) == 0 {
		// No trending coins exist, fetch them immediately
		slog.InfoContext(ctx, "No trending coins found in database, fetching immediately...")
		if fetchErr := s.FechAndStoreTrendingTokens(ctx); fetchErr != nil {
			slog.ErrorContext(ctx, "Failed to fetch trending coins immediately", "error", fetchErr)
			// Don't return error, continue with empty results
		} else {
			slog.InfoContext(ctx, "Successfully fetched trending coins immediately")
		}
	}

	modelCoins, totalCount, err := s.store.ListTrendingCoins(ctx, listOpts)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to list trending coins from store", "error", err)
		return nil, 0, fmt.Errorf("failed to list trending coins: %w", err)
	}

	return modelCoins, totalCount, nil
}

// GetTopGainersCoins implements the RPC method with domain types.
func (s *Service) GetTopGainersCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	cacheKey := "topGainersCoins"
	if limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, limit)
	}
	if offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, offset)
	}

	listOpts := db.ListOptions{}
	if limit > 0 {
		limitInt := int(limit)
		listOpts.Limit = &limitInt
	}
	if offset > 0 {
		offsetInt := int(offset)
		listOpts.Offset = &offsetInt
	}

	// First, check if we have any existing top gainers
	existingTopGainers, err := s.store.SearchCoins(ctx, "", []string{"top-gainer"}, 0, 1, 0, "", false)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to check for existing top gainers", "error", err)
		// Continue with the normal flow even if check fails
	} else if len(existingTopGainers) == 0 {
		// No top gainers exist, fetch them immediately
		slog.InfoContext(ctx, "No top gainers found in database, fetching immediately...")
		if fetchErr := s.FetchAndStoreTopGainersTokens(ctx); fetchErr != nil {
			slog.ErrorContext(ctx, "Failed to fetch top gainers immediately", "error", fetchErr)
			// Don't return error, continue with empty results
		} else {
			slog.InfoContext(ctx, "Successfully fetched top gainers immediately")
		}
	}

	modelCoins, totalCount, err := s.store.ListTopGainersCoins(ctx, listOpts)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to list top gainers coins from store", "error", err)
		return nil, 0, fmt.Errorf("failed to list top gainers coins: %w", err)
	}

	return modelCoins, totalCount, nil
}
