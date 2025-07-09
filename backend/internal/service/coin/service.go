package coin

import (
	"context"
	"log/slog"
	"sync"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
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
	xstocksConfig  *XStocksConfig

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

	// Ensure native SOL coin exists
	go func() {
		backgroundCtx := context.Background()
		if err := service.ensureNativeSolCoin(backgroundCtx); err != nil {
			slog.ErrorContext(backgroundCtx, "Failed to ensure native SOL coin exists", slog.Any("error", err))
		}
	}()

	// Initialize xStocks tokens during startup if enabled
	if service.config != nil && service.config.InitializeXStocksOnStartup {
		go func() {
			backgroundCtx := context.Background()
			if err := service.initializeXStocks(backgroundCtx); err != nil {
				slog.ErrorContext(backgroundCtx, "Failed to initialize xStocks tokens", slog.Any("error", err))
			} else {
				slog.InfoContext(backgroundCtx, "xStocks tokens initialized successfully")
				// Optionally enrich xStocks data in background
				if err := service.EnrichXStocksData(backgroundCtx); err != nil {
					slog.WarnContext(backgroundCtx, "Failed to enrich xStocks data", slog.Any("error", err))
				}
			}
		}()
	} else {
		slog.Info("xStocks initialization on startup is disabled")
	}

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

func (s *Service) Shutdown() {
	slog.Info("Shutting down coin service...")
	if s.fetcherCancel != nil {
		slog.Info("Cancelling fetchers...")
		s.fetcherCancel()
	}
	slog.Info("Coin service shutdown complete.")
}