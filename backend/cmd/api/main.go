package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	"github.com/gagliardetto/solana-go/rpc"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"

	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

func main() {
	logLevel := slog.LevelInfo
	var handler slog.Handler

	config := loadConfig()

	if config.Env != "development" {
		logLevel = slog.LevelDebug
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		handler = logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)
	}

	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	slog.Info("Configuration loaded successfully",
		slog.String("appEnv", config.Env),
		slog.Int("port", config.GRPCPort),
		slog.Duration("newCoinsFetchInterval", config.NewCoinsFetchInterval),
		slog.String("solanaRPCEndpoint", config.SolanaRPCEndpoint),
		slog.Int("platformFeeBps", config.PlatformFeeBps),
		slog.String("platformFeeAccountAddress", config.PlatformFeeAccountAddress),
	)

	ctx := context.Background()
	// Initialize Firebase with explicit project ID to match App Check token audience
	// The token has audiences: ["projects/7513481592181", "projects/dankfolio"]
	// We need to configure Firebase to accept either format
	firebaseConfig := &firebase.Config{
		ProjectID: "dankfolio", // Use string project ID as seen in one of the token's audiences
	}
	firebaseApp, err := firebase.NewApp(ctx, firebaseConfig)
	if err != nil {
		slog.Error("Failed to initialize Firebase Admin SDK", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("🔥 Firebase Admin SDK initialized successfully", "projectID", firebaseConfig.ProjectID)

	// Initialize Firebase App Check client
	appCheckClient, err := firebaseApp.AppCheck(ctx)
	if err != nil {
		slog.Error("Failed to initialize Firebase App Check client", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("🔒 Firebase App Check client initialized successfully")

	if (config.Env == "development" || config.Env == "local" || config.Env == "production-simulator") && config.DevAppCheckToken == "" {
		log.Fatal("DEV_APP_CHECK_TOKEN is not set. This is required for development/local/production-simulator app check bypass.")
	} else if config.DevAppCheckToken != "" {
		slog.Info("DEV_APP_CHECK_TOKEN is set.", "env", config.Env)
	}

	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Initialize database store first (required for APICallTracker)
	store, err := postgres.NewStore(config.DBURL, true, logLevel, config.Env)
	if err != nil {
		slog.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Database store initialized successfully.")

	// Initialize APICallTracker now that store is available
	apiTracker := tracker.NewAPICallTracker(store, slogger)
	slog.Info("API Call Tracker initialized.")

	// Now initialize all clients with the properly initialized apiTracker
	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey, apiTracker)

	birdeyeClient := birdeye.NewClient(httpClient, config.BirdEyeEndpoint, config.BirdEyeAPIKey, apiTracker)

	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}
	solClient := rpc.NewWithHeaders(config.SolanaRPCEndpoint, header)

	solanaClient := solana.NewClient(solClient, apiTracker)

	offchainClient := offchain.NewClient(httpClient, apiTracker)

	// Load today's stats
	if err := apiTracker.LoadStatsForToday(ctx); err != nil {
		slog.Error("Failed to load API stats for today on startup", slog.Any("error", err))
		// Depending on policy, might not be fatal. For now, just log.
	} else {
		slog.Info("Successfully loaded API stats for today on startup.")
	}

	// Start the APICallTracker's own background processing goroutine
	go apiTracker.Start(ctx) // Use the main application context

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:          config.BirdEyeEndpoint,
		BirdEyeAPIKey:           config.BirdEyeAPIKey,
		SolanaRPCEndpoint:       config.SolanaRPCEndpoint,
		NewCoinsFetchInterval:   config.NewCoinsFetchInterval,
		TrendingFetchInterval:   config.TrendingCoinsFetchInterval,
		TopGainersFetchInterval: config.TopGainersFetchInterval,
	}

	coinCache, err := coin.NewCoinCache()
	if err != nil {
		slog.Error("Failed to create coin cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Coin cache initialized successfully.")

	// Initialize coin service with all dependencies including cache
	coinService := coin.NewService(
		coinServiceConfig,
		jupiterClient,
		store,
		solanaClient,   // This is the chainClient
		birdeyeClient,  // This is the birdeyeClient
		apiTracker,     // Pass existing apiTracker
		offchainClient, // Pass existing offchainClient
		coinCache,      // Pass the initialized coinCache
	)
	slog.Info("Coin service initialized.")

	priceCache, err := price.NewPriceHistoryCache()
	if err != nil {
		slog.Error("Failed to create price cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Price cache initialized successfully.")

	priceService := price.NewService(birdeyeClient, jupiterClient, store, priceCache)

	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
		config.PlatformFeeBps,
		config.PlatformFeeAccountAddress,
	)

	walletService := wallet.New(solanaClient, store, coinService)

	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher)

	grpcServer := grpcapi.NewServer(
		coinService,
		walletService,
		tradeService,
		priceService,
		utilitySvc,
		appCheckClient,
		config.Env,
		config.DevAppCheckToken,
	)

	slog.Debug("Debug message")
	slog.Info("Info message")
	slog.Warn("Warning message")
	slog.Error("Error message")

	// Start gRPC server
	go func() {
		slog.Info("Starting gRPC server", slog.Int("port", config.GRPCPort))
		if err := grpcServer.Start(config.GRPCPort); err != nil {
			slog.Error("gRPC server error", slog.Any("error", err))
			// Consider if os.Exit(1) is appropriate in a goroutine,
			// might need channel to signal main goroutine for shutdown.
			// For now, this matches previous log.Fatalf behavior.
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit // Block until a signal is received
	slog.Info("Received shutdown signal", slog.String("signal", sig.String()))

	slog.Info("Persisting final API stats before shutdown...")
	// Use a new context for this shutdown operation, as the app context might be canceled elsewhere.
	// However, the main app `ctx` is `context.Background()`, which doesn't get canceled unless explicitly.
	// For safety in shutdown, create a short-timeout context if needed, or use existing `ctx`.
	// Given `ResetStats` has its own internal timeout, using `ctx` should be fine.
	if err := apiTracker.ResetStats(ctx); err != nil {
		slog.Error("Failed to persist API stats during shutdown", slog.Any("error", err))
	} else {
		slog.Info("Successfully persisted API stats during shutdown.")
	}

	slog.Info("Stopping gRPC server...")
	grpcServer.Stop()
	slog.Info("gRPC server stopped.")

	// Add any other cleanup tasks here, e.g., closing DB connection if store had a Close() method.
	// if err := store.Close(); err != nil {
	// 	slog.Error("Failed to close database store", slog.Any("error", err))
	// } else {
	// 	slog.Info("Database store closed.")
	// }

	slog.Info("Server shutdown completed.")
}

type Config struct {
	SolanaRPCEndpoint          string        `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey            string        `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	BirdEyeEndpoint            string        `envconfig:"BIRDEYE_ENDPOINT" required:"true"`
	BirdEyeAPIKey              string        `envconfig:"BIRDEYE_API_KEY" required:"true"`
	GRPCPort                   int           `envconfig:"GRPC_PORT" default:"9000"`
	DBURL                      string        `envconfig:"DB_URL" required:"true"`
	CacheExpiry                time.Duration `envconfig:"CACHE_EXPIRY_SECONDS" default:"5m"`
	JupiterApiKey              string        `envconfig:"JUPITER_API_KEY"`
	JupiterApiUrl              string        `envconfig:"JUPITER_API_URL" required:"true"`
	Env                        string        `envconfig:"APP_ENV" required:"true"`
	NewCoinsFetchInterval      time.Duration `envconfig:"NEW_COINS_FETCH_INTERVAL" default:"1h"`        // Default to 1 hour
	TrendingCoinsFetchInterval time.Duration `envconfig:"TRENDING_COINS_FETCH_INTERVAL" default:"24h"`  // Default to 24 hours
	TopGainersFetchInterval    time.Duration `envconfig:"TOP_GAINERS_FETCH_INTERVAL" default:"5m"`      // Default to 5 minutes
	PlatformFeeBps             int           `envconfig:"PLATFORM_FEE_BPS" required:"true"`             // Basis points for platform fee, e.g., 100 = 1%
	PlatformFeeAccountAddress  string        `envconfig:"PLATFORM_FEE_ACCOUNT_ADDRESS" required:"true"` // Conditionally required, handled in validation
	DevAppCheckToken           string        `envconfig:"DEV_APP_CHECK_TOKEN"`
}

func loadConfig() *Config {
	// Load environment variables from .env file in development
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
	}

	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		log.Fatalf("Error processing environment variables: %v", err)
	}

	return &cfg
}
