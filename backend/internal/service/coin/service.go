package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"sync"
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

const (
	cacheKey_trending = "trendingCoins_rpc"
	cacheKey_new      = "newCoins"
	cacheKey_top      = "topGainersCoins"
)

// Service handles coin-related operations
type Service struct {
	config         *Config
	jupiterClient  jupiter.ClientAPI
	chainClient    clients.GenericClientAPI
	offchainClient offchain.ClientAPI
	store          db.Store
	fetcherCtx     context.Context
	fetcherCancel  context.CancelFunc
	birdeyeClient  birdeye.ClientAPI
	apiTracker     telemetry.TelemetryAPI
	cache          CoinCache
	naughtyWordSet map[string]struct{}

	// Mutexes to prevent duplicate API calls
	trendingMutex   sync.Mutex
	newCoinsMutex   sync.Mutex
	topGainersMutex sync.Mutex
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
	coinCache CoinCache,
) *Service {
	service := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		chainClient:    chainClient,
		offchainClient: offchainClient,
		store:          store,
		birdeyeClient:  birdeyeClient,
		apiTracker:     apiTracker,
		cache:          coinCache,
		naughtyWordSet: make(map[string]struct{}),
	}
	service.fetcherCtx, service.fetcherCancel = context.WithCancel(context.Background())

	// Load naughty words during initialization
	go func() {
		backgroundCtx := context.Background()
		if err := service.loadNaughtyWords(backgroundCtx); err != nil {
			slog.ErrorContext(backgroundCtx, "Failed to load naughty words during service initialization", slog.Any("error", err))
		} else {
			slog.InfoContext(backgroundCtx, "Naughty words loaded successfully during service initialization")
		}
	}()

	if service.config != nil {
		if service.config.TrendingFetchInterval > 0 {
			slog.Info("Starting trending token fetcher with configured interval", slog.Duration("interval", service.config.TrendingFetchInterval))
			go service.runTrendingTokenFetcher(service.fetcherCtx)
		} else {
			slog.Warn("Trending token fetcher is disabled as TrendingFetchInterval is not configured or is zero.")
		}

		if service.config.NewCoinsFetchInterval > 0 {
			slog.Info("Starting new token fetcher with configured interval", slog.Duration("interval", service.config.NewCoinsFetchInterval))
			go service.runNewTokenFetcher(service.fetcherCtx)
		} else {
			slog.Warn("New token fetcher is disabled as NewCoinsFetchInterval is not configured or is zero.")
		}

		if service.config.TopGainersFetchInterval > 0 {
			slog.Info("Starting top gainers token fetcher with configured interval", slog.Duration("interval", service.config.TopGainersFetchInterval))
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
			_, _, err := s.GetTrendingCoinsRPC(ctx, 10, 0)
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
			_, _, err := s.GetNewCoins(ctx, 10, 0)
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
			_, _, err := s.GetTopGainersCoins(ctx, 10, 0)
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
		defaultSortBy := "volume_24h_usd"
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

func (s *Service) GetCoinByAddress(ctx context.Context, address string) (*model.Coin, error) {
	if !util.IsValidSolanaAddress(address) {
		return nil, fmt.Errorf("invalid address: %s", address)
	}

	// Step 1: Always check database first
	coin, err := s.store.Coins().GetByField(ctx, "address", address)
	if err == nil {
		// Check if market data is fresh (< 24 hours old)
		if s.isCoinMarketDataFresh(coin) {
			slog.DebugContext(ctx, "Coin found with fresh market data", slog.String("address", address), slog.String("lastUpdated", coin.LastUpdated))
			return coin, nil
		}

		// Market data is stale, refresh with market data only
		slog.DebugContext(ctx, "Coin found but market data is stale, refreshing", slog.String("address", address), slog.String("lastUpdated", coin.LastUpdated))
		return s.updateCoinMarketData(ctx, coin)
	}

	if !errors.Is(err, db.ErrNotFound) {
		return nil, fmt.Errorf("error fetching coin %s from database: %w", address, err)
	}

	// Step 2: Fetch completely new coin from Birdeye
	slog.InfoContext(ctx, "Coin not found in database, fetching from Birdeye", slog.String("address", address))
	return s.fetchNewCoin(ctx, address)
}

// isCoinMarketDataFresh checks if coin market data was updated within the last 24 hours
func (s *Service) isCoinMarketDataFresh(coin *model.Coin) bool {
	if coin.LastUpdated == "" {
		return false
	}

	lastUpdated, err := time.Parse(time.RFC3339, coin.LastUpdated)
	if err != nil {
		slog.Warn("Failed to parse LastUpdated time", "address", coin.Address, "lastUpdated", coin.LastUpdated, "error", err)
		return false
	}

	// Consider fresh if updated within last 24 hours
	return time.Since(lastUpdated) < 24*time.Hour
}

// updateCoinMarketData updates only the market data (price, volume, etc.) for an existing coin
func (s *Service) updateCoinMarketData(ctx context.Context, coin *model.Coin) (*model.Coin, error) {
	// Use the single token overview endpoint instead of batch trade data (which requires premium)
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, coin.Address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye", slog.String("address", coin.Address), slog.Any("error", err))
		return coin, nil // Return stale data rather than failing
	}

	if !tokenOverview.Success || tokenOverview.Data.Address == "" {
		slog.WarnContext(ctx, "No valid data returned for coin", slog.String("address", coin.Address))
		return coin, nil // Return stale data
	}

	// Update coin with fresh data
	data := tokenOverview.Data
	coin.Price = data.Price
	coin.Price24hChangePercent = data.Price24hChangePercent
	coin.Marketcap = data.MarketCap
	coin.Volume24hUSD = data.Volume24hUSD
	coin.Volume24hChangePercent = data.Volume24hChangePercent
	coin.Liquidity = data.Liquidity
	coin.FDV = data.FDV
	coin.Rank = data.Rank
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	// Update in database
	if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
		slog.WarnContext(ctx, "Failed to update coin market data in database", slog.String("address", coin.Address), slog.Any("error", updateErr))
		// Continue anyway, return the coin with updated data even if DB update fails
	} else {
		slog.DebugContext(ctx, "Successfully updated coin market data", slog.String("address", coin.Address), slog.Float64("price", coin.Price))
	}

	return coin, nil
}

// fetchNewCoin fetches a completely new coin from Birdeye (metadata + market data)
func (s *Service) fetchNewCoin(ctx context.Context, address string) (*model.Coin, error) {
	// Use the single token overview endpoint instead of batch (which requires premium)
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
	if err != nil {
		// Check if it's an API key/permissions error
		if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "API key") || strings.Contains(err.Error(), "suspended") {
			return nil, fmt.Errorf("unable to access market data at this time. Please try again later")
		}
		return nil, fmt.Errorf("unable to fetch token data. Please try again")
	}

	if !tokenOverview.Success || tokenOverview.Data.Address == "" {
		return nil, fmt.Errorf("token not found. Please check the address and try again")
	}

	tokenData := tokenOverview.Data

	// Check for naughty words
	if s.coinContainsNaughtyWord(tokenData.Name, "") {
		return nil, fmt.Errorf("token contains inappropriate content: %s", tokenData.Name)
	}

	// Create coin from Birdeye data
	coin := &model.Coin{
		Address:                tokenData.Address,
		Name:                   tokenData.Name,
		Symbol:                 tokenData.Symbol,
		Decimals:               tokenData.Decimals,
		LogoURI:                tokenData.LogoURI,
		Tags:                   tokenData.Tags,
		Price:                  tokenData.Price,
		Price24hChangePercent:  tokenData.Price24hChangePercent,
		Marketcap:              tokenData.MarketCap,
		Volume24hUSD:           tokenData.Volume24hUSD,
		Volume24hChangePercent: tokenData.Volume24hChangePercent,
		Liquidity:              tokenData.Liquidity,
		FDV:                    tokenData.FDV,
		Rank:                   tokenData.Rank,
		CreatedAt:              time.Now().Format(time.RFC3339),
		LastUpdated:            time.Now().Format(time.RFC3339),
	}

	// Enrich with additional metadata if needed
	enrichedCoin, err := s.EnrichCoinData(ctx, &birdeye.TokenDetails{
		Address:  tokenData.Address,
		Name:     tokenData.Name,
		Symbol:   tokenData.Symbol,
		Decimals: tokenData.Decimals,
		LogoURI:  tokenData.LogoURI,
	})
	if err != nil {
		slog.WarnContext(ctx, "Failed to enrich coin data, using basic data", slog.String("address", address), slog.Any("error", err))
		// Use the coin we created above instead of failing
	} else {
		// Update with enriched data but preserve market data from Birdeye
		enrichedCoin.Price = coin.Price
		enrichedCoin.Price24hChangePercent = coin.Price24hChangePercent
		enrichedCoin.Marketcap = coin.Marketcap
		enrichedCoin.Volume24hUSD = coin.Volume24hUSD
		enrichedCoin.Volume24hChangePercent = coin.Volume24hChangePercent
		enrichedCoin.Liquidity = coin.Liquidity
		enrichedCoin.FDV = coin.FDV
		enrichedCoin.Rank = coin.Rank
		enrichedCoin.LastUpdated = coin.LastUpdated
		coin = enrichedCoin
	}

	// Final naughty word check after enrichment
	if s.coinContainsNaughtyWord(coin.Name, coin.Description) {
		return nil, fmt.Errorf("token contains inappropriate content after enrichment: %s", coin.Name)
	}

	// Save to database
	if createErr := s.store.Coins().Create(ctx, coin); createErr != nil {
		slog.WarnContext(ctx, "Failed to create new coin in database", slog.String("address", coin.Address), slog.Any("error", createErr))
	}

	slog.InfoContext(ctx, "Successfully fetched and saved new coin", slog.String("address", coin.Address))
	return coin, nil
}

func (s *Service) fetchAndCacheCoin(ctx context.Context, address string) (*model.Coin, error) {
	slog.DebugContext(ctx, "Starting dynamic coin enrichment", slog.String("address", address))

	// First try to fetch market data from Birdeye
	var initialData *birdeye.TokenDetails
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye, using minimal data", slog.String("address", address), slog.Any("error", err))
		// Fallback to minimal data if Birdeye fails
		initialData = &birdeye.TokenDetails{Address: address}
	} else if tokenOverview.Success && tokenOverview.Data.Address != "" {
		// Convert TokenOverviewData to TokenDetails
		initialData = &birdeye.TokenDetails{
			Address:                tokenOverview.Data.Address,
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
		slog.DebugContext(ctx, "Successfully fetched token overview from Birdeye", slog.String("address", address), slog.String("name", initialData.Name), slog.String("symbol", initialData.Symbol), slog.Float64("price", initialData.Price), slog.Float64("marketcap", initialData.MarketCap))
	} else {
		slog.WarnContext(ctx, "Birdeye token overview returned unsuccessful or empty data, using minimal data", slog.String("address", address))
		// Fallback to minimal data if response is unsuccessful
		initialData = &birdeye.TokenDetails{Address: address}
	}

	if initialData != nil && s.coinContainsNaughtyWord(initialData.Name, initialData.Symbol) {
		return nil, fmt.Errorf("token name contains inappropriate content: %s", initialData.Name)
	}

	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Dynamic coin enrichment failed", slog.String("address", address), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich coin %s: %w", address, err)
	}

	// <<< NAUGHTY WORD CHECK FOR NAME (post-enrichment) >>>
	if enrichedCoin != nil && s.coinContainsNaughtyWord(enrichedCoin.Name, enrichedCoin.Description) {
		return nil, fmt.Errorf("token name contains inappropriate content for address: %s after enrich", enrichedCoin.Address)
	}

	existingCoin, getErr := s.store.Coins().GetByField(ctx, "address", enrichedCoin.Address)
	if getErr == nil && existingCoin != nil {
		enrichedCoin.ID = existingCoin.ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to update enriched coin in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		}
	} else {
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to create enriched coin in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		}
	}
	slog.DebugContext(ctx, "Dynamic coin enrichment and storage attempt complete", slog.String("address", address))
	return enrichedCoin, nil
}

// updateCoin updates the price and market stats of a cached coin with fresh data from Birdeye
func (s *Service) updateCoin(ctx context.Context, coin *model.Coin) (*model.Coin, error) {
	slog.DebugContext(ctx, "Updating price and market stats for cached coin", slog.String("address", coin.Address), slog.Float64("currentPrice", coin.Price))

	// Fetch current price and market data from Birdeye token overview
	tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, coin.Address)
	if err != nil {
		slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye", slog.String("address", coin.Address), slog.Any("error", err))
		return nil, err
	}

	// Update coin with fresh data from Birdeye token overview
	data := tokenOverview.Data
	coin.Price = data.Price
	coin.Price24hChangePercent = data.Price24hChangePercent
	coin.Marketcap = data.MarketCap
	coin.Volume24hUSD = data.Volume24hUSD
	coin.Volume24hChangePercent = data.Volume24hChangePercent
	coin.Liquidity = data.Liquidity
	coin.FDV = data.FDV
	coin.Rank = data.Rank
	coin.LastUpdated = time.Now().Format(time.RFC3339)

	// Update logo if it's available and we don't have one
	if data.LogoURI != "" && coin.LogoURI == "" {
		coin.LogoURI = data.LogoURI
	}

	// Ensure ResolvedIconUrl is populated from LogoURI if empty
	if coin.ResolvedIconUrl == "" && coin.LogoURI != "" {
		coin.ResolvedIconUrl = coin.LogoURI
	}

	// Update tags if available and we don't have any
	// TODO: We might want to keep our OWN tags since we use them
	// for filetering ie: trending, new, top-gainer, etc.
	if len(data.Tags) > 0 && len(coin.Tags) == 0 {
		coin.Tags = data.Tags
	}

	slog.DebugContext(ctx, "Successfully updated coin with fresh data from Birdeye token overview",
		slog.String("address", coin.Address),
		slog.Float64("newPrice", coin.Price),
		slog.Float64("marketCap", coin.Marketcap),
		slog.Float64("volume24h", coin.Volume24hUSD),
		slog.Float64("liquidity", coin.Liquidity))

	// Update the coin in the database with the new data
	if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
		slog.WarnContext(ctx, "Failed to update coin with fresh data in database", slog.String("address", coin.Address), slog.Any("error", updateErr))
		// Continue anyway, return the coin with updated data even if DB update fails
	} else {
		slog.DebugContext(ctx, "Successfully updated coin with fresh data in database", slog.String("address", coin.Address))
	}

	return coin, nil
}

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
		return nil
	})
}

func (s *Service) FetchAndStoreNewTokens(ctx context.Context) error {
	return s.store.WithTransaction(ctx, func(txStore db.Store) error {
		slog.InfoContext(ctx, "Starting to fetch and store new tokens from Birdeye")
		limit := 20 // Reasonable limit for new tokens
		offset := 0

		// Fetch new listing tokens from Birdeye with meme platform enabled
		birdeyeTokens, err := s.birdeyeClient.GetNewListingTokens(ctx, birdeye.NewListingTokensParams{
			Limit:               limit,
			Offset:              offset,
			MemePlatformEnabled: true, // Enable meme platforms to get new tokens
		})
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get new listing tokens from Birdeye", slog.Any("error", err))
			return fmt.Errorf("failed to get new listing tokens from Birdeye: %w", err)
		}

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

	// First try database search
	coins, err := s.store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search coins via store: %w", err)
	}

	// If we have results or filters are applied, return database results
	if len(coins) > 0 || len(tags) > 0 || minVolume24h > 0 {
		return coins, int32(len(coins)), nil
	}

	// If no results from database and query is not empty, try Birdeye search
	if query != "" && len(coins) == 0 {
		slog.InfoContext(ctx, "No results from database, searching via Birdeye",
			slog.String("query", query))
		return s.searchCoinsViaBirdeye(ctx, query, int(limit), int(offset))
	}

	return coins, int32(len(coins)), nil
}

// searchCoinsViaBirdeye searches for coins using Birdeye search API
func (s *Service) searchCoinsViaBirdeye(ctx context.Context, query string, limit, offset int) ([]model.Coin, int32, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("search:%s:%d:%d", query, limit, offset)
	if cachedCoins, found := s.cache.Get(cacheKey); found {
		slog.DebugContext(ctx, "Search results found in cache",
			slog.String("query", query),
			slog.Int("count", len(cachedCoins)))
		return cachedCoins, int32(len(cachedCoins)), nil
	}

	// Prepare search parameters
	searchParams := birdeye.SearchParams{
		Keyword:  query,
		SearchBy: birdeye.SearchByCombination, // Search by all fields
		Limit:    limit,
		Offset:   offset,
	}

	// Perform search
	searchResponse, err := s.birdeyeClient.Search(ctx, searchParams)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search via Birdeye: %w", err)
	}

	// Extract tokens from search response
	var searchTokens []birdeye.SearchToken
	for _, item := range searchResponse.Data.Items {
		if item.Type == "token" {
			searchTokens = append(searchTokens, item.Result...)
		}
	}

	// Convert search tokens to model coins
	coins := make([]model.Coin, 0, len(searchTokens))
	for _, token := range searchTokens {
		// Skip tokens with no volume
		if token.Volume24hUSD == 0 {
			continue
		}

		coin := model.Coin{
			Address:               token.Address,
			Name:                  token.Name,
			Symbol:                token.Symbol,
			Decimals:              token.Decimals,
			LogoURI:               token.LogoURI,
			Tags:                  token.Tags,
			Price:                 token.Price,
			Price24hChangePercent: token.Price24hChangePercent,
			Marketcap:             token.MarketCap,
			Volume24hUSD:          token.Volume24hUSD,
			Liquidity:             token.Liquidity,
			LastUpdated:           time.Now().Format(time.RFC3339),
		}

		// Check if coin exists in DB and update/insert as needed
		existingCoin, err := s.store.Coins().GetByField(ctx, "address", token.Address)
		if err == nil {
			// Update existing coin with fresh data
			coin.ID = existingCoin.ID
			coin.CreatedAt = existingCoin.CreatedAt
			coin.LastUpdated = time.Now().Format(time.RFC3339)

			if err := s.store.Coins().Update(ctx, &coin); err != nil {
				slog.WarnContext(ctx, "Failed to update coin from search",
					slog.String("address", token.Address),
					slog.String("error", err.Error()))
			}
		} else if errors.Is(err, db.ErrNotFound) {
			// Create new coin
			coin.CreatedAt = time.Now().Format(time.RFC3339)
			coin.LastUpdated = time.Now().Format(time.RFC3339)

			if err := s.store.Coins().Create(ctx, &coin); err != nil {
				slog.WarnContext(ctx, "Failed to insert coin from search",
					slog.String("address", token.Address),
					slog.String("error", err.Error()))
			}
		}

		coins = append(coins, coin)
	}

	// Cache the results
	if len(coins) > 0 {
		s.cache.Set(cacheKey, coins, 5*time.Minute)
		slog.DebugContext(ctx, "Cached search results",
			slog.String("query", query),
			slog.Int("count", len(coins)))
	}

	return coins, int32(len(coins)), nil
}

// --- Added RPC Methods ---
const (
	defaultCacheTTL = 5 * time.Minute
	staleCacheTTL   = 30 * time.Second // Shorter TTL for stale/empty data
)

// coinListFunc is a function type for listing coins from the database
type coinListFunc func(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error)

// coinFetchFunc is a function type for fetching coins from external APIs
type coinFetchFunc func(ctx context.Context) error

// getCoinsCachedWithFallback is a standardized helper for fetching coins with cache, DB, and API fallback
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
	needsFetch := false
	if len(coins) == 0 {
		needsFetch = true
		slog.InfoContext(ctx, "No coins found in database, will fetch from API",
			"cacheKey", cacheKey)
	} else if s.isDataStale(coins) {
		needsFetch = true
		slog.InfoContext(ctx, "Coins data is stale, will refresh from API",
			"cacheKey", cacheKey)
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
			slog.ErrorContext(ctx, "Failed to fetch data from API",
				"cacheKey", cacheKey, "error", fetchErr)
			// If we have stale data, return it with a short cache TTL
			if len(coins) > 0 {
				s.cache.Set(cacheKey, coins, staleCacheTTL)
				return coins, totalCount, nil
			}
			// No data at all, return error
			return nil, 0, fmt.Errorf("failed to fetch data and no cached data available: %w", fetchErr)
		}

		// Re-query database after successful fetch
		coins, totalCount, err = listFunc(ctx, listOpts)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to list coins after API fetch",
				"cacheKey", cacheKey, "error", err)
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

// isDataStale checks if any coin in the list has stale data (older than 1 hour)
func (s *Service) isDataStale(coins []model.Coin) bool {
	if len(coins) == 0 {
		return true
	}

	// Check the first coin's last updated time as a proxy for the whole list
	if coins[0].LastUpdated == "" {
		return true
	}

	lastUpdated, err := time.Parse(time.RFC3339, coins[0].LastUpdated)
	if err != nil {
		slog.Warn("Failed to parse LastUpdated time for staleness check",
			"lastUpdated", coins[0].LastUpdated, "error", err)
		return true
	}

	// Consider data stale if older than 1 hour
	return time.Since(lastUpdated) > time.Hour
}

// GetNewCoins implements the RPC method with domain types.
func (s *Service) GetNewCoins(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	return s.getCoinsCachedWithFallback(
		ctx,
		cacheKey_new,
		s.store.ListNewestCoins,
		s.FetchAndStoreNewTokens,
		&s.newCoinsMutex,
		s.config.NewCoinsFetchInterval,
		limit,
		offset,
	)
}

// GetStore returns the database store (used by banned words manager)
func (s *Service) GetStore() db.Store {
	return s.store
}

// LoadNaughtyWords is a public method to reload naughty words (called from main.go after population)
func (s *Service) LoadNaughtyWords(ctx context.Context) error {
	return s.loadNaughtyWords(ctx)
}

// loadNaughtyWords fetches all words from the naughty_words table and populates the in-memory set.
func (s *Service) loadNaughtyWords(ctx context.Context) error {
	slog.InfoContext(ctx, "Loading naughty words into memory...")
	limit := 10000
	offset := 0
	// Prepare ListOptions. Ensure all fields are pointers as per db.ListOptions definition.
	opts := db.ListOptions{Limit: &limit, Offset: &offset}

	naughtyWordModels, totalCount, err := s.store.NaughtyWords().List(ctx, opts)
	if err != nil {
		return fmt.Errorf("failed to list naughty words from store: %w", err)
	}
	slog.DebugContext(ctx, "Fetched naughty words from DB", slog.Int("count", len(naughtyWordModels)), slog.Int("total_db_count", int(totalCount)))

	newSet := make(map[string]struct{}, len(naughtyWordModels))
	for _, nwModel := range naughtyWordModels {
		newSet[strings.ToLower(nwModel.Word)] = struct{}{}
	}

	s.naughtyWordSet = newSet
	slog.InfoContext(ctx, "Naughty words loaded into memory.", slog.Int("count", len(s.naughtyWordSet)))
	return nil
}

// isWordNaughty checks if a single word is in the loaded naughty word set.
// Assumes word is already normalized (e.g., lowercase).
func (s *Service) isWordNaughty(word string) bool {
	_, found := s.naughtyWordSet[strings.ToLower(word)] // Ensure word is lowercased before check
	return found
}

func (s *Service) coinContainsNaughtyWord(name, description string) bool {
	found := s.containsNaughtyWord(name)
	if found {
		return found
	}
	return s.containsNaughtyWord(description)
}

// containsNaughtyWord checks if any word in the input text is a naughty word.
func (s *Service) containsNaughtyWord(text string) bool {
	if text == "" {
		return false
	}
	normalizedText := strings.ToLower(text)
	words := strings.FieldsFunc(normalizedText, func(r rune) bool {
		// Consider more comprehensive punctuation/splitters if needed
		return r == ' ' || r == ',' || r == '.' || r == ';' || r == ':' || r == '-' || r == '_' || r == '\n' || r == '/' || r == '(' || r == ')' || r == '[' || r == ']' || r == '{' || r == '}' || r == '"' || r == '\''
	})

	for _, word := range words {
		// Trim additional common punctuation that might remain after FieldsFunc
		cleanedWord := strings.Trim(word, ".,;:!?'\"()[]{}<>")
		if cleanedWord != "" && s.isWordNaughty(cleanedWord) {
			slog.Warn("Naughty word found in text", slog.String("word", cleanedWord), slog.String("text_preview", text[:min(len(text), 100)]))
			return true
		}
	}
	return false
}

// GetTrendingCoinsRPC implements the RPC method with domain types (renamed to avoid conflict).
func (s *Service) GetTrendingCoinsRPC(ctx context.Context, limit, offset int32) ([]model.Coin, int32, error) {
	return s.getCoinsCachedWithFallback(
		ctx,
		cacheKey_trending,
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
		cacheKey_top,
		s.store.ListTopGainersCoins,
		s.FetchAndStoreTopGainersTokens,
		&s.topGainersMutex,
		s.config.TopGainersFetchInterval,
		limit,
		offset,
	)
}

// GetCoinsByAddresses retrieves multiple coins by their addresses using batch operations when possible
func (s *Service) GetCoinsByAddresses(ctx context.Context, addresses []string) ([]model.Coin, error) {
	if len(addresses) == 0 {
		return []model.Coin{}, nil
	}

	// Validate addresses
	var validAddresses []string
	for _, address := range addresses {
		if util.IsValidSolanaAddress(address) {
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

	// Step 2: Identify missing coins and addresses that need updates
	existingAddresses := make(map[string]*model.Coin)
	var addressesToFetch []string

	for _, coin := range existingCoins {
		coinCopy := coin
		existingAddresses[coin.Address] = &coinCopy
	}

	for _, address := range validAddresses {
		if _, exists := existingAddresses[address]; !exists {
			addressesToFetch = append(addressesToFetch, address)
		}
	}

	slog.InfoContext(ctx, "Coin retrieval status",
		"total_requested", len(validAddresses),
		"found_in_db", len(existingCoins),
		"need_to_fetch", len(addressesToFetch))

	// Step 3: Fetch missing coins using batch API if we have addresses to fetch
	if len(addressesToFetch) > 0 {
		newCoins, err := s.fetchCoinsBatch(ctx, addressesToFetch)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to fetch missing coins in batch", "error", err, "addresses", addressesToFetch)
			// Don't return error, just log and continue with existing coins
		} else {
			// Add newly fetched coins to our results
			existingCoins = append(existingCoins, newCoins...)
			slog.InfoContext(ctx, "Successfully fetched missing coins", "count", len(newCoins))
		}
	}

	// Step 4: Update price data for existing coins using batch update
	if len(existingCoins) > 0 {
		updatedCoins, err := s.updateCoinsBatch(ctx, existingCoins)
		if err != nil {
			slog.WarnContext(ctx, "Failed to update coins with fresh price data", "error", err)
			// Continue with existing data
		} else {
			existingCoins = updatedCoins
		}
	}

	slog.InfoContext(ctx, "Completed batch coin retrieval", "final_count", len(existingCoins))
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

// fetchCoinsBatch fetches missing coins using the Birdeye batch API
func (s *Service) fetchCoinsBatch(ctx context.Context, addresses []string) ([]model.Coin, error) {
	const birdeyeBatchSize = 20 // Maximum batch size for Birdeye market data endpoint
	var allCoins []model.Coin

	// Process addresses in batches
	for i := 0; i < len(addresses); i += birdeyeBatchSize {
		end := i + birdeyeBatchSize
		if end > len(addresses) {
			end = len(addresses)
		}
		batchAddresses := addresses[i:end]

		// Use individual calls instead of batch API (batch requires Premium tier)
		for _, address := range batchAddresses {
			tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
			if err != nil {
				slog.WarnContext(ctx, "Failed to fetch token overview from Birdeye", "error", err, "address", address)
				continue
			}

			if tokenOverview == nil || !tokenOverview.Success || tokenOverview.Data.Address == "" {
				slog.WarnContext(ctx, "Invalid token overview response", "address", address)
				continue
			}
			// Check for naughty words
			if s.coinContainsNaughtyWord(tokenOverview.Data.Name, "") {
				slog.InfoContext(ctx, "Skipping token with inappropriate content", "address", address, "name", tokenOverview.Data.Name)
				continue
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
				slog.ErrorContext(ctx, "Failed to enrich coin data", "error", err, "address", address)
				continue
			}

			// Check for naughty words after enrichment
			if s.coinContainsNaughtyWord(enrichedCoin.Name, enrichedCoin.Description) {
				slog.InfoContext(ctx, "Skipping enriched token with inappropriate content", "address", enrichedCoin.Address, "name", enrichedCoin.Name)
				continue
			}

			// Save to database
			existingCoin, getErr := s.store.Coins().GetByField(ctx, "address", enrichedCoin.Address)
			if getErr == nil && existingCoin != nil {
				enrichedCoin.ID = existingCoin.ID
				if updateErr := s.store.Coins().Update(ctx, enrichedCoin); updateErr != nil {
					slog.WarnContext(ctx, "Failed to update enriched coin in batch processing", "address", enrichedCoin.Address, "error", updateErr)
				}
			} else if errors.Is(getErr, db.ErrNotFound) {
				if createErr := s.store.Coins().Create(ctx, enrichedCoin); createErr != nil {
					slog.WarnContext(ctx, "Failed to create enriched coin in batch processing", "address", enrichedCoin.Address, "error", createErr)
				}
			}

			allCoins = append(allCoins, *enrichedCoin)
		}
	}

	return allCoins, nil
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

// updateCoinsBatch updates multiple coins with fresh price data
func (s *Service) updateCoinsBatch(ctx context.Context, coins []model.Coin) ([]model.Coin, error) {
	// Extract addresses from coins
	addresses := make([]string, len(coins))
	coinMap := make(map[string]*model.Coin)

	for i, coin := range coins {
		addresses[i] = coin.Address
		coinCopy := coin
		coinMap[coin.Address] = &coinCopy
	}

	// Fetch fresh data in batches
	const batchSize = 20
	for i := 0; i < len(addresses); i += batchSize {
		end := i + batchSize
		if end > len(addresses) {
			end = len(addresses)
		}
		batchAddresses := addresses[i:end]

		// Use individual calls instead of batch API (batch requires Premium tier)
		for _, address := range batchAddresses {
			if coin, exists := coinMap[address]; exists {
				tokenOverview, err := s.birdeyeClient.GetTokenOverview(ctx, address)
				if err != nil {
					slog.WarnContext(ctx, "Failed to get individual token overview", "error", err, "address", address)
					continue
				}
				if tokenOverview.Success && tokenOverview.Data.Address != "" {
					coin.Price = tokenOverview.Data.Price
					coin.Price24hChangePercent = tokenOverview.Data.Price24hChangePercent
					coin.Marketcap = tokenOverview.Data.MarketCap
					coin.Volume24hUSD = tokenOverview.Data.Volume24hUSD
					coin.Volume24hChangePercent = tokenOverview.Data.Volume24hChangePercent
					coin.Liquidity = tokenOverview.Data.Liquidity
					coin.FDV = tokenOverview.Data.FDV
					coin.Rank = tokenOverview.Data.Rank
					coin.LastUpdated = time.Now().Format(time.RFC3339)
					
					// Update in database
					if updateErr := s.store.Coins().Update(ctx, coin); updateErr != nil {
						slog.WarnContext(ctx, "Failed to update coin with fresh price data", "address", coin.Address, "error", updateErr)
					}
				}
			}
		}
	}

	// Convert map back to slice
	var updatedCoins []model.Coin
	for _, coin := range coinMap {
		updatedCoins = append(updatedCoins, *coin)
	}

	return updatedCoins, nil
}

// min is a helper function to find the minimum of two integers.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
