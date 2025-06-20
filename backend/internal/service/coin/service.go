package coin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
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
	naughtyWordSet map[string]struct{} // <<< ADD THIS LINE
}

// min is a helper function to find the minimum of two integers.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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
	if service.config.CacheExpiry == 0 {
		slog.Warn("Coin service cache expiration is not set")
	}

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
	coin, err := s.store.Coins().GetByField(ctx, "address", address)
	if err == nil {
		slog.DebugContext(ctx, "Coin found in 'coins' table, updating price", slog.String("address", address))
		// Just fetch and update the latest price for cached coins
		return s.updateCoin(ctx, coin)
	}
	if errors.Is(err, db.ErrNotFound) {
		slog.InfoContext(ctx, "Coin not found in 'coins' table, checking 'raw_coins' table.", slog.String("address", address))
		rawCoin, rawErr := s.store.RawCoins().GetByField(ctx, "address", address)
		if rawErr == nil {
			slog.InfoContext(ctx, "Coin found in 'raw_coins' table, proceeding with enrichment.", slog.String("address", address))
			return s.enrichRawCoinAndSave(ctx, rawCoin)
		}
		if errors.Is(rawErr, db.ErrNotFound) {
			slog.InfoContext(ctx, "Coin not found in 'raw_coins' table either. Enriching from scratch.", slog.String("address", address))
			return s.fetchAndCacheCoin(ctx, address)
		}
		slog.ErrorContext(ctx, "Error fetching coin from 'raw_coins' table", slog.String("address", address), slog.Any("error", rawErr))
	}
	slog.ErrorContext(ctx, "Error fetching coin from 'coins' table", slog.String("address", address), slog.Any("error", err))
	return nil, fmt.Errorf("error fetching coin %s from 'coins': %w", address, err)
}

func (s *Service) enrichRawCoinAndSave(ctx context.Context, rawCoin *model.RawCoin) (*model.Coin, error) {
	slog.InfoContext(ctx, "Starting enrichment from raw_coin data", slog.String("address", rawCoin.Address), slog.String("rawCoinSymbol", rawCoin.Symbol))
	initialData := &birdeye.TokenDetails{
		Address:  rawCoin.Address,
		Name:     rawCoin.Name,
		Symbol:   rawCoin.Symbol,
		LogoURI:  rawCoin.LogoUrl,
		Decimals: rawCoin.Decimals,
	}

	// <<< NAUGHTY WORD CHECK FOR NAME (from rawCoin) >>>
	if s.containsNaughtyWord(initialData.Name) {
		slog.WarnContext(ctx, "Raw coin name identified as naughty during enrichRawCoinAndSave (pre-enrichment)",
			slog.String("name", initialData.Name),
			slog.String("address", rawCoin.Address))
		// Attempt to delete the unusable rawCoin
		rawCoinPKIDStrDel := strconv.FormatUint(rawCoin.ID, 10)
		if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStrDel); delErr != nil {
			slog.WarnContext(ctx, "Failed to delete naughty raw_coin", slog.String("address", rawCoin.Address), slog.Any("error", delErr))
		} else {
			slog.InfoContext(ctx, "Successfully deleted naughty raw_coin", slog.String("address", rawCoin.Address))
		}
		return nil, fmt.Errorf("raw coin name contains inappropriate content: %s", initialData.Name)
	}

	// <<< NAUGHTY WORD CHECK FOR SYMBOL (from rawCoin) >>>
	if s.containsNaughtyWord(initialData.Symbol) {
		slog.WarnContext(ctx, "Raw coin symbol identified as naughty during enrichRawCoinAndSave (pre-enrichment)",
			slog.String("symbol", initialData.Symbol),
			slog.String("address", rawCoin.Address))
		// Attempt to delete the unusable rawCoin
		rawCoinPKIDStrDel := strconv.FormatUint(rawCoin.ID, 10)
		if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStrDel); delErr != nil {
			slog.WarnContext(ctx, "Failed to delete naughty raw_coin", slog.String("address", rawCoin.Address), slog.Any("error", delErr))
		} else {
			slog.InfoContext(ctx, "Successfully deleted naughty raw_coin", slog.String("address", rawCoin.Address))
		}
		return nil, fmt.Errorf("raw coin symbol contains inappropriate content: %s", initialData.Symbol)
	}

	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Enrichment from raw_coin failed", slog.String("address", rawCoin.Address), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich raw_coin %s: %w", rawCoin.Address, err)
	}

	// <<< NAUGHTY WORD CHECK FOR NAME (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Name) {
		slog.WarnContext(ctx, "Enriched coin name identified as naughty during enrichRawCoinAndSave (post-enrichment)",
			slog.String("name", enrichedCoin.Name),
			slog.String("address", enrichedCoin.Address))
		// Attempt to delete the original rawCoin as its enrichment is problematic
		rawCoinPKIDStrDel := strconv.FormatUint(rawCoin.ID, 10)
		if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStrDel); delErr != nil {
			slog.WarnContext(ctx, "Failed to delete raw_coin after its name was found naughty post-enrichment", slog.String("address", rawCoin.Address), slog.Any("error", delErr))
		} else {
			slog.InfoContext(ctx, "Successfully deleted raw_coin as its name was naughty post-enrichment", slog.String("address", rawCoin.Address))
		}
		return nil, fmt.Errorf("token name contains inappropriate content for address: %s", enrichedCoin.Address)
	}

	// <<< NAUGHTY WORD CHECK FOR SYMBOL (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Symbol) {
		slog.WarnContext(ctx, "Enriched coin symbol identified as naughty during enrichRawCoinAndSave (post-enrichment)",
			slog.String("symbol", enrichedCoin.Symbol),
			slog.String("address", enrichedCoin.Address))
		// Attempt to delete the original rawCoin as its enrichment is problematic
		rawCoinPKIDStrDel := strconv.FormatUint(rawCoin.ID, 10)
		if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStrDel); delErr != nil {
			slog.WarnContext(ctx, "Failed to delete raw_coin after its symbol was found naughty post-enrichment", slog.String("address", rawCoin.Address), slog.Any("error", delErr))
		} else {
			slog.InfoContext(ctx, "Successfully deleted raw_coin as its symbol was naughty post-enrichment", slog.String("address", rawCoin.Address))
		}
		return nil, fmt.Errorf("token symbol contains inappropriate content for address: %s", enrichedCoin.Address)
	}

	// <<< NAUGHTY WORD CHECK FOR DESCRIPTION (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Description) {
		slog.WarnContext(ctx, "Enriched coin description identified as naughty during enrichRawCoinAndSave (post-enrichment)",
			slog.String("description", enrichedCoin.Description),
			slog.String("address", enrichedCoin.Address))
		// Attempt to delete the original rawCoin as its enrichment is problematic
		rawCoinPKIDStrDel := strconv.FormatUint(rawCoin.ID, 10)
		if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStrDel); delErr != nil {
			slog.WarnContext(ctx, "Failed to delete raw_coin after its description was found naughty post-enrichment", slog.String("address", rawCoin.Address), slog.Any("error", delErr))
		} else {
			slog.InfoContext(ctx, "Successfully deleted raw_coin as its description was naughty post-enrichment", slog.String("address", rawCoin.Address))
		}
		return nil, fmt.Errorf("token description contains inappropriate content for address: %s", enrichedCoin.Address)
	}

	existingCoin, getErr := s.store.Coins().GetByField(ctx, "address", enrichedCoin.Address)
	if getErr == nil && existingCoin != nil {
		enrichedCoin.ID = existingCoin.ID
		if dbErr := s.store.Coins().Update(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to update enriched coin (from raw) in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		} else {
			slog.InfoContext(ctx, "Successfully updated coin in 'coins' table from raw_coin enrichment", slog.String("address", enrichedCoin.Address))
		}
	} else if errors.Is(getErr, db.ErrNotFound) {
		if dbErr := s.store.Coins().Create(ctx, enrichedCoin); dbErr != nil {
			slog.WarnContext(ctx, "Failed to create enriched coin (from raw) in store", slog.String("address", enrichedCoin.Address), slog.Any("error", dbErr))
		} else {
			slog.InfoContext(ctx, "Successfully created coin in 'coins' table from raw_coin enrichment", slog.String("address", enrichedCoin.Address))
		}
	} else if getErr != nil {
		slog.ErrorContext(ctx, "Error checking for existing coin before saving enriched (from raw) coin", slog.String("address", enrichedCoin.Address), slog.Any("error", getErr))
		return nil, fmt.Errorf("error checking existing coin %s before save: %w", enrichedCoin.Address, getErr)
	}
	rawCoinPKIDStr := strconv.FormatUint(rawCoin.ID, 10)
	slog.DebugContext(ctx, "Attempting to delete processed coin from 'raw_coins' table", slog.String("address", rawCoin.Address), slog.String("rawCoinID", rawCoinPKIDStr))
	if delErr := s.store.RawCoins().Delete(ctx, rawCoinPKIDStr); delErr != nil {
		slog.WarnContext(ctx, "Failed to delete coin from 'raw_coins' table after successful enrichment", slog.String("address", rawCoin.Address), slog.String("rawCoinID", rawCoinPKIDStr), slog.Any("error", delErr))
	} else {
		slog.InfoContext(ctx, "Successfully deleted coin from 'raw_coins' table after enrichment", slog.String("address", rawCoin.Address), slog.String("rawCoinID", rawCoinPKIDStr))
	}
	slog.InfoContext(ctx, "Successfully enriched and saved coin from raw_coin data", slog.String("address", enrichedCoin.Address))
	return enrichedCoin, nil
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

	// <<< NAUGHTY WORD CHECK FOR NAME (pre-enrichment) >>>
	if initialData != nil && s.containsNaughtyWord(initialData.Name) {
		slog.WarnContext(ctx, "Token name identified as naughty during fetchAndCacheCoin (pre-enrichment)",
			slog.String("name", initialData.Name),
			slog.String("address", address))
		return nil, fmt.Errorf("token name contains inappropriate content: %s", initialData.Name)
	}

	// <<< NAUGHTY WORD CHECK FOR SYMBOL (pre-enrichment) >>>
	if initialData != nil && s.containsNaughtyWord(initialData.Symbol) {
		slog.WarnContext(ctx, "Token symbol identified as naughty during fetchAndCacheCoin (pre-enrichment)",
			slog.String("symbol", initialData.Symbol),
			slog.String("address", address))
		return nil, fmt.Errorf("token symbol contains inappropriate content: %s", initialData.Symbol)
	}

	enrichedCoin, err := s.EnrichCoinData(ctx, initialData)
	if err != nil {
		slog.ErrorContext(ctx, "Dynamic coin enrichment failed", slog.String("address", address), slog.Any("error", err))
		return nil, fmt.Errorf("failed to enrich coin %s: %w", address, err)
	}

	// <<< NAUGHTY WORD CHECK FOR NAME (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Name) {
		slog.WarnContext(ctx, "Token name identified as naughty during fetchAndCacheCoin (post-enrichment)",
			slog.String("name", enrichedCoin.Name),
			slog.String("address", enrichedCoin.Address))
		return nil, fmt.Errorf("token name contains inappropriate content for address: %s", enrichedCoin.Address)
	}

	// <<< NAUGHTY WORD CHECK FOR SYMBOL (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Symbol) {
		slog.WarnContext(ctx, "Token symbol identified as naughty during fetchAndCacheCoin (post-enrichment)",
			slog.String("symbol", enrichedCoin.Symbol),
			slog.String("address", enrichedCoin.Address))
		return nil, fmt.Errorf("token symbol contains inappropriate content for address: %s", enrichedCoin.Address)
	}

	// <<< NAUGHTY WORD CHECK FOR DESCRIPTION (post-enrichment) >>>
	if enrichedCoin != nil && s.containsNaughtyWord(enrichedCoin.Description) {
		slog.WarnContext(ctx, "Token description identified as naughty during fetchAndCacheCoin (post-enrichment)",
			slog.String("description", enrichedCoin.Description),
			slog.String("address", enrichedCoin.Address))
		return nil, fmt.Errorf("token description contains inappropriate content for address: %s", enrichedCoin.Address)
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
		// jupiterCoin is of type jupiter.CoinListInfo (struct, not pointer), so no nil check needed
		// <<< NAUGHTY WORD CHECK FOR NAME >>>
		if s.containsNaughtyWord(jupiterCoin.Symbol) {
			slog.InfoContext(ctx, "Skipping Jupiter token in GetAllTokens due to naughty symbol",
				slog.String("symbol", jupiterCoin.Symbol),
				slog.String("address", jupiterCoin.Address))
			continue // Skip this token
		}
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
		// Create params using a pointer to satisfy jupiter.NewCoinsParams if it's defined as a struct
		// If NewCoinsParams is an alias to a struct pointer, then this is fine.
		// Based on previous usage, it seems it might be a struct, so ensure it's passed as a pointer if the client expects that.
		// Assuming jupiter.NewCoinsParams is a struct type:
		params := jupiter.NewCoinsParams{Limit: limit, Offset: offset}

		// If jupiterClient.GetNewCoins expects *jupiter.NewCoinsParams, then:
		// params := &jupiter.NewCoinsParams{Limit: limit, Offset: offset}
		// For this example, I'll assume the client method handles whether it needs a pointer or value.
		// Let's stick to what was likely working before:
		// params := &jupiter.NewCoinsParams{Limit: limit, Offset: offset}

		resp, err := s.jupiterClient.GetNewCoins(ctx, &params) // Pass as pointer if that's what GetNewCoins expects
		if err != nil {
			slog.ErrorContext(ctx, "Failed to get new coins from Jupiter", slog.Any("error", err))
			return fmt.Errorf("failed to get new coins from Jupiter: %w", err)
		}
		if len(resp) == 0 {
			slog.InfoContext(ctx, "No new coins found from Jupiter.")
			return nil
		}

		// Filtered list of Jupiter NewTokenInfo objects
		var filteredJupiterTokens []*jupiter.NewTokenInfo
		for _, newToken := range resp {
			if newToken == nil { // Safety check for pointer
				continue
			}
			// <<< NAUGHTY WORD CHECK FOR NAME >>>
			if s.containsNaughtyWord(newToken.Symbol) {
				slog.InfoContext(ctx, "Skipping Jupiter new token due to naughty symbol",
					slog.String("symbol", newToken.Symbol),
					slog.String("mint", newToken.Mint))
				continue // Skip this token
			}
			// Add to filtered list if not naughty
			filteredJupiterTokens = append(filteredJupiterTokens, newToken)
		}

		if len(filteredJupiterTokens) == 0 {
			slog.InfoContext(ctx, "No valid (non-naughty name) tokens to process from Jupiter after filtering.")
			return nil
		}

		// Convert Jupiter new coins (filtered) to BirdEye token details for enrichment
		tokenDetails := make([]birdeye.TokenDetails, 0, len(filteredJupiterTokens))
		for _, jupiterToken := range filteredJupiterTokens {
			// newToken is already checked for nil above, and here jupiterToken is from filteredJupiterTokens
			tokenDetail := birdeye.TokenDetails{
				Address:  jupiterToken.Mint, // Assuming Mint is the field for address
				Name:     jupiterToken.Name,
				Symbol:   jupiterToken.Symbol,
				LogoURI:  jupiterToken.LogoURI,
				Decimals: jupiterToken.Decimals,
				// Note: CreatedAt from Jupiter's NewCoin (e.g., jupiterToken.CreatedAt) is not directly part of
				// birdeye.TokenDetails. It will be handled during model.Coin creation or enrichment if needed.
			}
			tokenDetails = append(tokenDetails, tokenDetail)
		}

		if len(tokenDetails) == 0 {
			// This case should ideally not be hit if filteredJupiterTokens was not empty,
			// but as a safeguard:
			slog.InfoContext(ctx, "No Birdeye token details to process after mapping from Jupiter tokens.")
			return nil
		}

		// Enrich the tokens using the existing enrichment process
		// This process already has naughty word checks for name (redundant here but harmless) and description.
		enrichedCoins, err := s.processBirdeyeTokens(ctx, tokenDetails)
		if err != nil {
			return fmt.Errorf("failed to enrich new tokens from Jupiter source: %w", err)
		}

		// Get existing coins with "new-coin" tag to clear them
		// Define default ListOptions for SearchCoins
		searchLimit := 1000
		// searchOffset := 0 // Offset not needed if we process all returned by ListWithOpts
		// emptyString := "" // Not needed if default sort is fine
		// falseBool := false // Not needed if default sort is fine
		existingNewCoins, _, listErr := txStore.Coins().ListWithOpts(ctx, db.ListOptions{Filters: []db.FilterOption{{Field: "tags", Operator: db.FilterOpLike, Value: "%new-coin%"}}, Limit: &searchLimit})
		if listErr != nil && !errors.Is(listErr, db.ErrNotFound) {
			slog.ErrorContext(ctx, "Failed to search for existing new coins to clear tags", slog.Any("error", listErr))
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
			slog.DebugContext(ctx, "Storing/updating enriched new coins from Jupiter source", slog.Int("count", len(enrichedCoins)))
			var storeErrors []string
			for _, coin := range enrichedCoins { // Iterate over copies
				currentCoin := coin // Create a new instance or copy
				// Add "new-coin" tag if not already present (processBirdeyeTokens might not add specific tags)
				isNewCoinTagPresent := false
				for _, tag := range currentCoin.Tags {
					if tag == "new-coin" {
						isNewCoinTagPresent = true
						break
					}
				}
				if !isNewCoinTagPresent {
					currentCoin.Tags = append(currentCoin.Tags, "new-coin")
				}

				existingCoin, getErr := txStore.Coins().GetByField(ctx, "address", currentCoin.Address)
				if getErr == nil && existingCoin != nil {
					currentCoin.ID = existingCoin.ID // Preserve existing primary key
					if errUpdate := txStore.Coins().Update(ctx, &currentCoin); errUpdate != nil {
						slog.WarnContext(ctx, "Failed to update new coin (Jupiter source)", slog.String("address", currentCoin.Address), slog.Any("error", errUpdate))
						storeErrors = append(storeErrors, errUpdate.Error())
					}
				} else if errors.Is(getErr, db.ErrNotFound) {
					if errCreate := txStore.Coins().Create(ctx, &currentCoin); errCreate != nil {
						slog.WarnContext(ctx, "Failed to create new coin (Jupiter source)", slog.String("address", currentCoin.Address), slog.Any("error", errCreate))
						storeErrors = append(storeErrors, errCreate.Error())
					}
				} else if getErr != nil {
					slog.WarnContext(ctx, "Error checking coin before upsert during new coins refresh (Jupiter source)", slog.String("address", currentCoin.Address), slog.Any("error", getErr))
					storeErrors = append(storeErrors, getErr.Error())
				}
			}
			if len(storeErrors) > 0 {
				slog.ErrorContext(ctx, "Encountered errors during storing new coins (Jupiter source) in transaction", slog.Int("error_count", len(storeErrors)))
				// Potentially return an aggregated error or the first one
				// return fmt.Errorf("encountered %d errors while storing new coins from Jupiter: %s", len(storeErrors), storeErrors[0])
			}
		} else {
			slog.InfoContext(ctx, "No new coins (Jupiter source) to store from this refresh after enrichment/filtering.")
		}

		slog.InfoContext(ctx, "New coins store refresh (Jupiter source) transaction complete", slog.Int("enriched_coins_processed_count", len(enrichedCoins)))
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

	if cachedCoin, found := s.cache.Get(cacheKey); found {
		return cachedCoin, int32(len(cachedCoin)), nil
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
	s.cache.Set(cacheKey, modelCoins, s.config.CacheExpiry)

	return modelCoins, totalCount, nil
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
		if cleanedWord != "" && s.isWordNaughty(cleanedWord) { // isWordNaughty already handles lowercase
			slog.DebugContext(context.Background(), "Naughty word found in text", slog.String("word", cleanedWord), slog.String("text_preview", text[:min(len(text), 100)]))
			return true
		}
	}
	return false
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

	if cachedCoin, found := s.cache.Get(cacheKey); found {
		return cachedCoin, int32(len(cachedCoin)), nil
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
	s.cache.Set(cacheKey, modelCoins, s.config.CacheExpiry)

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

	if cachedCoin, found := s.cache.Get(cacheKey); found {
		return cachedCoin, int32(len(cachedCoin)), nil
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

	s.cache.Set(cacheKey, modelCoins, s.config.CacheExpiry)

	return modelCoins, totalCount, nil
}
