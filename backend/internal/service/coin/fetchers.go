package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Background fetcher methods for trending, new, and top gainer tokens

func (s *Service) runTrendingTokenFetcher(ctx context.Context) {
	// Add panic recovery to prevent goroutine from crashing
	defer func() {
		if r := recover(); r != nil {
			slog.ErrorContext(ctx, "PANIC in trending token fetcher - recovered and restarting", slog.Any("panic", r))
			// Restart the fetcher after a panic
			go s.runTrendingTokenFetcher(ctx)
		}
	}()
	
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
			// Call the fetch function directly to get fresh data from Birdeye
			err := s.FetchAndStoreTrendingTokens(ctx)
			if err != nil {
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
			// Call the fetch function directly to get fresh data from Birdeye
			err := s.FetchAndStoreNewTokens(ctx)
			if err != nil {
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
			// Call the fetch function directly to get fresh data from Birdeye
			err := s.FetchAndStoreTopGainersTokens(ctx)
			if err != nil {
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

// Fetch and store operations for background processes

func (s *Service) FetchAndStoreTrendingTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		enrichedCoins, err := s.UpdateTrendingTokensFromBirdeye(ctx)
		if err != nil {
			return fmt.Errorf("failed to fetch and enrich trending coins: %w", err)
		}
		limit := 20
		offset := 0

		// Get existing coins with "trending" tag to clear them
		existingTrendingCoins, _, err := txStore.ListTrendingCoins(ctx, db.ListOptions{Limit: &limit, Offset: &offset})
		if err != nil {
			return fmt.Errorf("failed to ListTrendingCoins for existing trending coins: %w", err)
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
				// IsTrending field has been removed - now using tags system only
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

				// Process logo through image proxy to upload to S3
				s.processLogoURL(ctx, &currentCoin)

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "address", currentCoin.Address)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update trending coin", slog.String("address", currentCoin.Address), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create trending coin", slog.String("address", currentCoin.Address), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during trending refresh", slog.String("address", currentCoin.Address), slog.Any("error", getErr))
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

		// Invalidate cache after successful DB update
		s.cache.Delete(cacheKeyTrending)
		slog.InfoContext(ctx, "Invalidated trending coins cache after DB refresh")

		return nil
	})
}

func (s *Service) FetchAndStoreTopGainersTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		// Fetch top gainers from BirdEye using volume sorting (proxy for trending/hot tokens)
		birdeyeTokens, err := s.birdeyeClient.GetTrendingTokens(ctx, birdeye.TrendingTokensParams{
			SortBy:   birdeye.SortByVolume24hUSD,
			SortType: birdeye.SortTypeDesc,
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

		limit := 20
		offset := 0
		// Get existing coins with "top-gainer" tag to clear them
		existingTopGainers, _, err := txStore.ListTopGainersCoins(ctx, db.ListOptions{Limit: &limit, Offset: &offset})
		if err != nil {
			return fmt.Errorf("failed to ListTopGainersCoins for existing top gainers: %w", err)
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

				// Process logo through image proxy to upload to S3
				s.processLogoURL(ctx, &currentCoin)

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "address", currentCoin.Address)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update top gainer coin", slog.String("address", currentCoin.Address), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create top gainer coin", slog.String("address", currentCoin.Address), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during top gainers refresh", slog.String("address", currentCoin.Address), slog.Any("error", getErr))
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

		// Invalidate cache after successful DB update
		s.cache.Delete(cacheKeyTop)
		slog.InfoContext(ctx, "Invalidated top gainers coins cache after DB refresh")

		return nil
	})
}

func (s *Service) FetchAndStoreNewTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		slog.InfoContext(ctx, "Starting to fetch and store new tokens from Birdeye")
		limit := 20 // Reasonable limit for new tokens
		offset := 0

		// Fetch new listing tokens from Birdeye with meme platform enabled
		slog.InfoContext(ctx, "📡 Calling Birdeye GetNewListingTokens API...",
			slog.Int("limit", limit), slog.Int("offset", offset))
		birdeyeTokens, err := s.birdeyeClient.GetNewListingTokens(ctx, birdeye.NewListingTokensParams{
			Limit:               limit,
			Offset:              offset,
			MemePlatformEnabled: true, // Enable meme platforms to get new tokens
		})
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get new listing tokens from Birdeye", slog.Any("error", err))
			return fmt.Errorf("failed to get new listing tokens from Birdeye: %w", err)
		}

		slog.InfoContext(ctx, "📊 Birdeye API Response for new tokens",
			slog.Int("tokensReceived", len(birdeyeTokens.Data.Items)))
		if len(birdeyeTokens.Data.Items) == 0 {
			slog.InfoContext(ctx, "No new listing tokens found from Birdeye.")
			return nil
		}

		// Convert Birdeye new listing tokens to enriched coins directly
		enrichedCoins := make([]model.Coin, 0, len(birdeyeTokens.Data.Items))
		for _, newToken := range birdeyeTokens.Data.Items {
			// Check for naughty words before processing
			if s.coinContainsNaughtyWord(newToken.Name, newToken.Symbol) {
				slog.InfoContext(ctx, "Skipping token with inappropriate name",
					"address", newToken.Address, "name", newToken.Name)
				continue
			}

			// Convert NewListingToken to TokenDetails for enrichment
			tokenDetail := birdeye.TokenDetails{
				Address:   newToken.Address,
				Name:      newToken.Name,
				Symbol:    newToken.Symbol,
				LogoURI:   newToken.LogoURI,
				Decimals:  newToken.Decimals,
				Liquidity: newToken.Liquidity,
			}

			// Enrich the token
			enrichedCoin, err := s.EnrichCoinData(ctx, &tokenDetail)
			if err != nil {
				slog.WarnContext(ctx, "Failed to enrich new token", "address", newToken.Address, "error", err)
				continue
			}

			// Use liquidityAddedAt as the created_at timestamp for proper chronological ordering
			enrichedCoin.CreatedAt = newToken.LiquidityAddedAt.Time.Format(time.RFC3339)
			enrichedCoin.Tags = append(enrichedCoin.Tags, "new-coin")

			enrichedCoins = append(enrichedCoins, *enrichedCoin)
		}

		if len(enrichedCoins) == 0 {
			slog.InfoContext(ctx, "No valid tokens to process after filtering inappropriate content.")
			return nil
		}

		// Get existing coins with "new-coin" tag to clear them
		listOpts := db.ListOptions{Limit: &limit, Offset: &offset}
		existingNewCoins, _, err := s.store.ListNewestCoins(ctx, listOpts)
		if err != nil && !errors.Is(err, db.ErrNotFound) {
			slog.ErrorContext(ctx, "Failed to ListNewestCoins for existing new coins to clear tags", slog.Any("error", err))
			// Continue, as this is not a fatal error for processing new coins
		}

		// Clear "new-coin" tag from existing new coins
		if len(existingNewCoins) > 0 {
			slog.DebugContext(ctx, "Clearing new coins status for existing new coins", slog.Int("count", len(existingNewCoins)))
			coinsToUpdate := make([]model.Coin, 0, len(existingNewCoins))
			currentTime := time.Now().Format(time.RFC3339)
			for _, existingCoin := range existingNewCoins { // Iterate over copies
				modifiedCoin := existingCoin // Create a new instance or copy
				newTags := make([]string, 0, len(existingCoin.Tags))
				for _, tag := range existingCoin.Tags {
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
				// Use BulkUpsert on the repository from txStore
				if _, bulkErr := txStore.Coins().BulkUpsert(ctx, &coinsToUpdate); bulkErr != nil {
					slog.ErrorContext(ctx, "Failed to bulk update new coins status for coins", slog.Any("error", bulkErr))
					// Non-fatal, continue
				}
			}
		}

		// Store/update enriched new coins
		if len(enrichedCoins) > 0 {
			slog.DebugContext(ctx, "Storing/updating enriched new coins from Birdeye source", slog.Int("count", len(enrichedCoins)))
			var storeErrors []string
			for _, coin := range enrichedCoins { // Iterate over copies
				currentCoin := coin // Create a new instance or copy
				// Add "new-coin" tag if not already present (processBirdeyeTokens might not add specific tags)
				isNewCoinTagPresent := slices.Contains(currentCoin.Tags, "new-coin")
				if !isNewCoinTagPresent {
					currentCoin.Tags = append(currentCoin.Tags, "new-coin")
				}

				// Process logo through image proxy to upload to S3
				s.processLogoURL(ctx, &currentCoin)

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "address", currentCoin.Address)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID // Preserve existing primary key
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update new coin (Birdeye source)", slog.String("address", currentCoin.Address), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create new coin (Birdeye source)", slog.String("address", currentCoin.Address), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during new coins refresh (Birdeye source)", slog.String("address", currentCoin.Address), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.ErrorContext(ctx, "Encountered errors during storing new coins (Birdeye source) in transaction", slog.Int("error_count", len(storeErrors)))
			}
		} else {
			slog.InfoContext(ctx, "No new coins (Birdeye source) to store from this refresh after enrichment/filtering.")
		}

		slog.InfoContext(ctx, "New coins store refresh (Birdeye source) transaction complete", slog.Int("enriched_coins_processed_count", len(enrichedCoins)))

		// Invalidate cache after successful DB update
		s.cache.Delete(cacheKeyNew)
		slog.InfoContext(ctx, "Invalidated new coins cache after DB refresh")

		return nil
	})
}

// RPC helper methods for cached retrieval with fallback
const (
	defaultCacheTTL = 5 * time.Minute
	staleCacheTTL   = 30 * time.Second // Shorter TTL for stale/empty data
)

// coinListFunc is a function type for listing coins from the database
type coinListFunc func(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error)

// coinFetchFunc is a function type for fetching coins from external APIs
type coinFetchFunc func(ctx context.Context) error

// getCoinsCachedWithFallback is a standardized helper for fetching coins with cache, DB, and API fallback
// The function follows this logic:
// 1. Check cache first - if found, return immediately
// 2. Query database - if coins exist, cache them and return
// 3. If database is empty, fetch from API, store in DB, then cache and return
// Background fetchers keep the data fresh at configured intervals
func (s *Service) getCoinsCachedWithFallback(
	ctx context.Context,
	cacheKey string,
	listFunc coinListFunc,
	fetchFunc coinFetchFunc,
	mutex *sync.Mutex,
	cacheTTL time.Duration,
	limit, offset int32,
) ([]model.Coin, int32, error) {
	// Step 1: Check cache
	if cachedCoins, found := s.cache.Get(cacheKey); found {
		return cachedCoins, int32(len(cachedCoins)), nil
	}

	// Step 2: Prepare list options
	listOpts := db.ListOptions{}
	if limit > 0 {
		limitInt := int(limit)
		listOpts.Limit = &limitInt
	}
	if offset > 0 {
		offsetInt := int(offset)
		listOpts.Offset = &offsetInt
	}

	// Step 3: Try to get from database
	coins, totalCount, err := listFunc(ctx, listOpts)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to list coins from database",
			"cacheKey", cacheKey, "error", err)
		return nil, 0, fmt.Errorf("failed to list coins: %w", err)
	}

	// Step 4: Check if we need to fetch fresh data
	needsFetch := len(coins) == 0
	if needsFetch {
		slog.InfoContext(ctx, "No coins found in database, will fetch from API", "cacheKey", cacheKey)
	}

	// Step 5: Fetch from API if needed (with mutex to prevent duplicates)
	if needsFetch {
		mutex.Lock()
		// Double-check after acquiring lock (another request might have fetched already)
		if cachedCoins, found := s.cache.Get(cacheKey); found {
			mutex.Unlock()
			return cachedCoins, int32(len(cachedCoins)), nil
		}

		slog.InfoContext(ctx, "Fetching fresh data from API", "cacheKey", cacheKey)
		fetchErr := fetchFunc(ctx)
		mutex.Unlock()

		if fetchErr != nil {
			slog.ErrorContext(ctx, "Failed to fetch data from API", "cacheKey", cacheKey, "error", fetchErr)
			return nil, 0, fmt.Errorf("failed to fetch data and no cached data available: %w", fetchErr)
		}

		// Re-query database after successful fetch
		coins, totalCount, err = listFunc(ctx, listOpts)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to list coins after API fetch", "cacheKey", cacheKey, "error", err)
			return nil, 0, fmt.Errorf("failed to list coins after fetch: %w", err)
		}
	}

	// Step 6: Cache the results
	if len(coins) > 0 {
		s.cache.Set(cacheKey, coins, cacheTTL)
	} else {
		// Use shorter TTL for empty results
		s.cache.Set(cacheKey, coins, staleCacheTTL)
	}

	return coins, totalCount, nil
}

// GetNewCoins implements the RPC method with domain types.
func (s *Service) GetNewCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	return s.getCoinsCachedWithFallback(
		ctx,
		cacheKeyNew,
		s.store.ListNewestCoins,
		s.FetchAndStoreNewTokens,
		&s.newCoinsMutex,
		s.config.NewCoinsFetchInterval,
		limit,
		offset,
	)
}

// GetTrendingCoinsRPC implements the RPC method with domain types (renamed to avoid conflict).
func (s *Service) GetTrendingCoinsRPC(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	return s.getCoinsCachedWithFallback(
		ctx,
		cacheKeyTrending,
		s.store.ListTrendingCoins,
		s.FetchAndStoreTrendingTokens,
		&s.trendingMutex,
		s.config.TrendingFetchInterval,
		limit,
		offset,
	)
}

// GetTopGainersCoins implements the RPC method with domain types.
func (s *Service) GetTopGainersCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	return s.getCoinsCachedWithFallback(
		ctx,
		cacheKeyTop,
		s.store.ListTopGainersCoins,
		s.FetchAndStoreTopGainersTokens,
		&s.topGainersMutex,
		s.config.TopGainersFetchInterval,
		limit,
		offset,
	)
}

func (s *Service) GetXStocksCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	// For xStocks, we'll query directly from the database without caching
	// since these are relatively stable tokens that don't need frequent updates

	// Query coins with xstocks tag, sorted by highest % gain
	coins, err := s.store.SearchCoins(ctx, "", []string{"xstocks"}, 0, limit, offset, "price_24h_change_percent", true)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get xStocks coins: %w", err)
	}

	// Get total count by querying without limit/offset
	allCoins, err := s.store.SearchCoins(ctx, "", []string{"xstocks"}, 0, 0, 0, "price_24h_change_percent", true)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total xStocks count: %w", err)
	}
	totalCount := int32(len(allCoins))

	return coins, totalCount, nil
}
