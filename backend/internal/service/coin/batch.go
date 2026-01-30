package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

// Batch operations for multiple coins

// GetCoinsByAddresses retrieves multiple coins by their addresses using batch operations when possible
func (s *Service) GetCoinsByAddresses(ctx context.Context, addresses []string, forceRefresh bool) ([]model.Coin, error) {
	if len(addresses) == 0 {
		return []model.Coin{}, nil
	}

	// Validate addresses
	var validAddresses []string
	for _, address := range addresses {
		// Special case for native SOL which is not a real Solana address
		if address == model.NativeSolMint || util.IsValidSolanaAddress(address) {
			validAddresses = append(validAddresses, address)
		} else {
			slog.WarnContext(ctx, "Invalid Solana address provided", "address", address)
		}
	}

	if len(validAddresses) == 0 {
		return []model.Coin{}, nil
	}

	slog.InfoContext(ctx, "Getting multiple coins by addresses", "count", len(validAddresses))

	// Step 1: Try to get coins from the database first
	existingCoins, err := s.getExistingCoinsByAddresses(ctx, validAddresses)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get existing coins from database", "error", err)
		return nil, fmt.Errorf("failed to get existing coins: %w", err)
	}

	// Step 2: Categorize coins by freshness and identify missing coins
	existingAddresses := make(map[string]*model.Coin)
	var addressesToFetch []string
	var addressesToUpdate []string
	var freshCoins []model.Coin

	for _, coin := range existingCoins {
		coinCopy := coin
		existingAddresses[coin.Address] = &coinCopy

		// Check cache first (always respect 2-minute cache to prevent spam)
		cacheKey := fmt.Sprintf("coin:%s", coin.Address)
		if cachedCoins, found := s.cache.Get(cacheKey); found && len(cachedCoins) > 0 {
			// Cache hit - data is < 2 min old, use it even if forceRefresh
			freshCoins = append(freshCoins, cachedCoins[0])
			slog.DebugContext(ctx, "Using cached data (< 2 min old)", "address", coin.Address)
		} else if !forceRefresh && s.isCoinMarketDataFresh(&coinCopy) {
			// No cache but database data is fresh (< 24 hours) and no force refresh
			freshCoins = append(freshCoins, coinCopy)
			slog.DebugContext(ctx, "Coin has fresh market data", "address", coin.Address, "lastUpdated", coin.LastUpdated)
		} else {
			// Need to update: either forceRefresh (beyond 2min cache), or stale data
			addressesToUpdate = append(addressesToUpdate, coin.Address)
			if forceRefresh {
				slog.DebugContext(ctx, "Force refresh requested for coin (beyond 2min cache)", "address", coin.Address)
			} else {
				slog.DebugContext(ctx, "Coin market data is stale, needs update", "address", coin.Address, "lastUpdated", coin.LastUpdated)
			}
		}
	}

	// Identify completely missing coins
	for _, address := range validAddresses {
		if _, exists := existingAddresses[address]; !exists {
			addressesToFetch = append(addressesToFetch, address)
		}
	}

	slog.InfoContext(ctx, "Coin retrieval status",
		"total_requested", len(validAddresses),
		"found_in_db", len(existingCoins),
		"fresh_coins", len(freshCoins),
		"stale_coins", len(addressesToUpdate),
		"need_to_fetch", len(addressesToFetch))

	// Step 3: Fetch completely missing coins
	if len(addressesToFetch) > 0 {
		newCoins, err := s.fetchCoinsBatch(ctx, addressesToFetch)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to fetch missing coins in batch", "error", err, "addresses", addressesToFetch)
			// Don't return error, just log and continue with existing coins
		} else {
			// Add newly fetched coins to fresh coins (they have fresh data)
			freshCoins = append(freshCoins, newCoins...)
			slog.InfoContext(ctx, "Successfully fetched missing coins", "count", len(newCoins))
		}
	}

	// Step 4: Update market data for stale coins only
	if len(addressesToUpdate) > 0 {
		var staleCoins []model.Coin
		for _, address := range addressesToUpdate {
			if coin, exists := existingAddresses[address]; exists {
				staleCoins = append(staleCoins, *coin)
			}
		}

		updatedCoins, err := s.updateCoinsBatch(ctx, staleCoins)
		if err != nil {
			slog.WarnContext(ctx, "Failed to update stale coins with fresh market data", "error", err)
			// Use stale data rather than failing
			freshCoins = append(freshCoins, staleCoins...)
		} else {
			freshCoins = append(freshCoins, updatedCoins...)
			slog.InfoContext(ctx, "Successfully updated stale coins", "count", len(updatedCoins))
		}
	}

	// Use freshCoins as our final result
	existingCoins = freshCoins

	// Populate cache with all fresh coins for quick individual lookups
	for _, coin := range existingCoins {
		cacheKey := fmt.Sprintf("coin:%s", coin.Address)
		s.cache.Set(cacheKey, []model.Coin{coin}, CoinCacheExpiry)
	}

	slog.InfoContext(ctx, "Completed batch coin retrieval", "final_count", len(existingCoins), "cached_count", len(existingCoins))
	return existingCoins, nil
}

// getExistingCoinsByAddresses fetches coins that already exist in the database
func (s *Service) getExistingCoinsByAddresses(ctx context.Context, addresses []string) ([]model.Coin, error) {
	var allCoins []model.Coin

	// Batch database queries - get coins by addresses in chunks to avoid query size limits
	const dbBatchSize = 50
	for i := 0; i < len(addresses); i += dbBatchSize {
		end := i + dbBatchSize
		if end > len(addresses) {
			end = len(addresses)
		}
		batchAddresses := addresses[i:end]

		coins, err := s.store.Coins().GetByAddresses(ctx, batchAddresses)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get coins by addresses from database", "error", err, "batch", i/dbBatchSize)
			continue // Continue with other batches
		}
		allCoins = append(allCoins, coins...)
	}

	return allCoins, nil
}

// fetchCoinsBatch fetches missing coins using parallel API calls
func (s *Service) fetchCoinsBatch(ctx context.Context, addresses []string) ([]model.Coin, error) {
	if len(addresses) == 0 {
		return []model.Coin{}, nil
	}

	maxWorkers := s.birdeyeClient.GetMaxWorkers()
	const bufferSize = 10

	type coinFetchJob struct {
		address string
	}

	// Create job and result channels
	jobs := make(chan coinFetchJob, bufferSize)
	results := make(chan coinFetchResult, len(addresses))

	// Start worker goroutines
	var wg sync.WaitGroup
	for i := 0; i < maxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for job := range jobs {
				result := s.fetchSingleCoin(ctx, job.address, workerID)
				results <- result
			}
		}(i)
	}

	// Send jobs to workers
	go func() {
		defer close(jobs)
		for _, address := range addresses {
			select {
			case jobs <- coinFetchJob{address: address}:
			case <-ctx.Done():
				return
			}
		}
	}()

	// Wait for all workers to complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var allCoins []model.Coin
	var fetchErrors []error
	for result := range results {
		if result.err != nil {
			fetchErrors = append(fetchErrors, result.err)
			continue
		}
		if result.coin != nil {
			allCoins = append(allCoins, *result.coin)
		}
	}

	if len(fetchErrors) > 0 {
		slog.WarnContext(ctx, "Some coin fetches failed", "error_count", len(fetchErrors), "success_count", len(allCoins))
	}

	// Batch database operations for better performance
	if len(allCoins) > 0 {
		if err := s.batchCreateCoinsInDB(ctx, allCoins); err != nil {
			slog.WarnContext(ctx, "Failed to batch create coins in database", "error", err)
		}
	}

	slog.InfoContext(ctx, "Completed parallel coin fetching", "requested", len(addresses), "fetched", len(allCoins), "errors", len(fetchErrors))
	return allCoins, nil
}

// coinFetchResult represents the result of fetching a single coin
type coinFetchResult struct {
	coin *model.Coin
	err  error
}

// coinUpdateResult represents the result of updating a single coin
type coinUpdateResult struct {
	coin *model.Coin
	err  error
}

// fetchSingleCoin fetches and enriches a single coin (called by worker goroutines)
func (s *Service) fetchSingleCoin(ctx context.Context, address string, workerID int) coinFetchResult {
	// Special handling for native SOL
	if address == model.NativeSolMint {
		nativeSol, err := s.getNativeSolCoin(ctx)
		if err != nil {
			slog.WarnContext(ctx, "Worker failed to get native SOL", "worker_id", workerID, "error", err)
			return coinFetchResult{coin: nil, err: err}
		}
		return coinFetchResult{coin: nativeSol, err: nil}
	}

	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "Worker failed to fetch token overview", "worker_id", workerID, "address", address, "error", err)
		return coinFetchResult{coin: nil, err: err}
	}

	if tokenOverview == nil || !tokenOverview.Success || tokenOverview.Data.Address == "" {
		slog.WarnContext(ctx, "Worker received invalid token overview", "worker_id", workerID, "address", address)
		return coinFetchResult{coin: nil, err: fmt.Errorf("invalid token overview response")}
	}

	// Check for naughty words
	if s.coinContainsNaughtyWord(tokenOverview.Data.Name, "") {
		slog.InfoContext(ctx, "Worker skipping token with inappropriate content", "worker_id", workerID, "address", address, "name", tokenOverview.Data.Name)
		return coinFetchResult{coin: nil, err: fmt.Errorf("inappropriate content")}
	}

	// Convert to TokenDetails format for enrichment
	tokenDetails := &birdeye.TokenDetails{
		Address:                address,
		Name:                   tokenOverview.Data.Name,
		Symbol:                 tokenOverview.Data.Symbol,
		Decimals:               tokenOverview.Data.Decimals,
		LogoURI:                tokenOverview.Data.LogoURI,
		Price:                  tokenOverview.Data.Price,
		Volume24hUSD:           tokenOverview.Data.Volume24hUSD,
		Volume24hChangePercent: tokenOverview.Data.Volume24hChangePercent,
		MarketCap:              tokenOverview.Data.MarketCap,
		Liquidity:              tokenOverview.Data.Liquidity,
		FDV:                    tokenOverview.Data.FDV,
		Rank:                   tokenOverview.Data.Rank,
		Price24hChangePercent:  tokenOverview.Data.Price24hChangePercent,
		Tags:                   tokenOverview.Data.Tags,
	}

	// Enrich the coin data
	enrichedCoin, err := s.EnrichCoinData(ctx, tokenDetails)
	if err != nil {
		slog.ErrorContext(ctx, "Worker failed to enrich coin data", "worker_id", workerID, "address", address, "error", err)
		return coinFetchResult{coin: nil, err: err}
	}

	// Check for naughty words after enrichment
	if s.coinContainsNaughtyWord(enrichedCoin.Name, enrichedCoin.Description) {
		slog.InfoContext(ctx, "Worker skipping enriched token with inappropriate content", "worker_id", workerID, "address", enrichedCoin.Address, "name", enrichedCoin.Name)
		return coinFetchResult{coin: nil, err: fmt.Errorf("inappropriate content after enrichment")}
	}

	slog.DebugContext(ctx, "Worker successfully fetched and enriched coin", "worker_id", workerID, "address", address, "name", enrichedCoin.Name)
	return coinFetchResult{coin: enrichedCoin, err: nil}
}

// updateCoinsBatch updates market data for multiple coins in parallel
func (s *Service) updateCoinsBatch(ctx context.Context, coins []model.Coin) ([]model.Coin, error) {
	if len(coins) == 0 {
		return []model.Coin{}, nil
	}

	updatedCoins := make([]model.Coin, 0, len(coins))
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Use a semaphore to limit concurrent API calls
	sem := make(chan struct{}, 5) // Limit to 5 concurrent updates

	for _, coin := range coins {
		wg.Add(1)
		coinCopy := coin // Important: capture loop variable

		go func() {
			defer wg.Done()
			sem <- struct{}{}        // Acquire semaphore
			defer func() { <-sem }() // Release semaphore

			// Update market data for this coin
			updated, err := s.updateCoinMarketData(ctx, &coinCopy)
			if err != nil {
				slog.WarnContext(ctx, "Failed to update coin market data in batch",
					"address", coinCopy.Address,
					"error", err)
				// Use original coin if update fails
				updated = &coinCopy
			}

			mu.Lock()
			updatedCoins = append(updatedCoins, *updated)
			mu.Unlock()
		}()
	}

	wg.Wait()

	slog.InfoContext(ctx, "Batch coin update completed",
		"requested", len(coins),
		"updated", len(updatedCoins))

	return updatedCoins, nil
}

// batchCreateCoinsInDB creates multiple coins in the database efficiently
func (s *Service) batchCreateCoinsInDB(ctx context.Context, coins []model.Coin) error {
	var coinsToCreate []model.Coin
	var coinsToUpdate []model.Coin

	// Process logo URLs through image proxy before saving
	s.processLogoURLs(ctx, coins)

	// Check which coins already exist
	for _, coin := range coins {
		existingCoin, getErr := s.store.Coins().GetByField(ctx, "address", coin.Address)
		if getErr == nil && existingCoin != nil {
			// Coin exists, prepare for update
			coin.ID = existingCoin.ID
			coinsToUpdate = append(coinsToUpdate, coin)
		} else if errors.Is(getErr, db.ErrNotFound) {
			// Coin doesn't exist, prepare for creation
			coinsToCreate = append(coinsToCreate, coin)
		}
	}

	// Batch create new coins
	if len(coinsToCreate) > 0 {
		for _, coin := range coinsToCreate {
			if createErr := s.store.Coins().Create(ctx, &coin); createErr != nil {
				slog.WarnContext(ctx, "Failed to create coin in batch", "address", coin.Address, "error", createErr)
			}
		}
	}

	// Batch update existing coins
	if len(coinsToUpdate) > 0 {
		if _, err := s.store.Coins().BulkUpsert(ctx, &coinsToUpdate); err != nil {
			slog.WarnContext(ctx, "Failed to bulk update existing coins", "error", err)
		}
	}

	slog.DebugContext(ctx, "Successfully batch processed coins in database", "created", len(coinsToCreate), "updated", len(coinsToUpdate))
	return nil
}

// fetchCoinsIndividually is a fallback method that fetches coins one by one
func (s *Service) fetchCoinsIndividually(ctx context.Context, addresses []string) ([]model.Coin, error) {
	var coins []model.Coin

	for _, address := range addresses {
		coin, err := s.GetCoinByAddress(ctx, address)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to fetch individual coin", "error", err, "address", address)
			continue
		}
		coins = append(coins, *coin)
	}

	return coins, nil
}

// batchUpdateCoinsInDB updates multiple coins in the database efficiently
func (s *Service) batchUpdateCoinsInDB(ctx context.Context, coins []model.Coin) error {
	// Convert to pointers for bulk upsert
	coinPtrs := make([]model.Coin, len(coins))
	copy(coinPtrs, coins)

	// Use bulk upsert for better performance
	if _, err := s.store.Coins().BulkUpsert(ctx, &coinPtrs); err != nil {
		return fmt.Errorf("failed to bulk update coins: %w", err)
	}

	slog.DebugContext(ctx, "Successfully batch updated coins in database", "count", len(coins))
	return nil
}
