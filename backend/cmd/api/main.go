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
	"github.com/kelseyhightower/envconfig" // Added import
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	"github.com/gagliardetto/solana-go/rpc"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint         string        `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey           string        `envconfig:"SOLANA_RPC_API_KEY"` // Not strictly required if using a public RPC, but good to have
	BirdEyeEndpoint           string        `envconfig:"BIRDEYE_ENDPOINT" required:"true"`
	BirdEyeAPIKey             string        `envconfig:"BIRDEYE_API_KEY" required:"true"`
	CoinGeckoAPIKey           string        `envconfig:"COINGECKO_API_KEY"` // Optional
	GRPCPort                  int           `envconfig:"GRPC_PORT" default:"9000"`
	DBURL                     string        `envconfig:"DB_URL" required:"true"`
	CacheExpiry               time.Duration `envconfig:"CACHE_EXPIRY_SECONDS" default:"300s"`    // Default to 5 minutes (300 seconds)
	JupiterApiKey             string        `envconfig:"JUPITER_API_KEY"`                        // Optional
	JupiterApiUrl             string        `envconfig:"JUPITER_API_URL" required:"true"`
	Env                       string        `envconfig:"APP_ENV" required:"true"`
	NewCoinsFetchInterval     time.Duration `envconfig:"NEW_COINS_FETCH_INTERVAL_MINUTES" default:"5m"` // Default to 5 minutes
	PlatformFeeBps            int           `envconfig:"PLATFORM_FEE_BPS" default:"0"`
	PlatformFeeAccountAddress string        `envconfig:"PLATFORM_FEE_ACCOUNT_ADDRESS"` // Conditionally required, handled in validation
}

func loadConfig() (*Config, error) {
	// Load environment variables from .env file in development
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
	}

	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return nil, err
	}

	// Custom validations
	// If SolanaRPCEndpoint is set to something other than the public default, API key is effectively required.
	// Note: envconfig handles the default for SolanaRPCEndpoint.
	if cfg.SolanaRPCEndpoint != "https://api.mainnet-beta.solana.com" && cfg.SolanaRPCAPIKey == "" {
		log.Print("Warning: SOLANA_RPC_API_KEY is not set for a non-default SOLANA_RPC_ENDPOINT.")
		// Depending on strictness, you might choose to log.Fatalf here
		// For now, retain original behaviour of logging a warning but allowing it.
		// If it should be fatal: log.Fatalf("SOLANA_RPC_API_KEY is required for non-default SOLANA_RPC_ENDPOINT")
	}


	// PLATFORM_FEE_BPS represents a basis point value for platform fees and must be non-negative.
	// envconfig doesn't have a direct "min" or "non-negative" validator, so manual check is fine.
	if cfg.PlatformFeeBps < 0 {
		log.Fatalf("PLATFORM_FEE_BPS cannot be negative. Value: %d", cfg.PlatformFeeBps)
	}

	// If PLATFORM_FEE_BPS is greater than 0, PLATFORM_FEE_ACCOUNT_ADDRESS must be set
	// because a non-zero platform fee requires an account to receive the fee.
	if cfg.PlatformFeeBps > 0 && cfg.PlatformFeeAccountAddress == "" {
		log.Fatalf("PLATFORM_FEE_ACCOUNT_ADDRESS must be set if PLATFORM_FEE_BPS (%d) is greater than 0.", cfg.PlatformFeeBps)
	}

	return &cfg, nil
}

func main() {
	logLevel := slog.LevelInfo
	var handler slog.Handler

	config, err := loadConfig()
	if err != nil {
		// Use standard log here as slog might not be initialized if config loading fails early
		log.Fatalf("Failed to load configuration: %v", err)
	}

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

	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Initialize APICallTracker
	apiTracker := clients.NewAPICallTracker()

	// Start goroutine to log API stats periodically with context cancellation
	go func(ctx context.Context) {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				slog.Info("Shutting down API stats logging goroutine")
				return
			case <-ticker.C:
				telemetry.LogAPIStats(apiTracker, slogger) // Use slogger here
			}
		}
	}(ctx)

	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey, apiTracker)

	birdeyeClient := birdeye.NewClient(config.BirdEyeEndpoint, config.BirdEyeAPIKey, apiTracker)

	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}
	solClient := rpc.NewWithHeaders(config.SolanaRPCEndpoint, header)

	solanaClient := solana.NewClient(solClient, apiTracker)

	offchainClient := offchain.NewClient(httpClient, apiTracker)

	store, err := postgres.NewStore(config.DBURL, true, logLevel, config.Env) // Pass logLevel
	if err != nil {
		slog.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// We don't need the auth service anymore as we're using App Check directly

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:        config.BirdEyeEndpoint,
		BirdEyeAPIKey:         config.BirdEyeAPIKey,
		CoinGeckoAPIKey:       config.CoinGeckoAPIKey,
		SolanaRPCEndpoint:     config.SolanaRPCEndpoint,
		NewCoinsFetchInterval: config.NewCoinsFetchInterval,
	}
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store, solanaClient)
	slog.Info("Coin service initialized.")

	// Initialize Price Service Cache
	priceCache, err := price.NewGoCacheAdapter()
	if err != nil {
		slog.Error("Failed to create price cache adapter", slog.Any("error", err))
		os.Exit(1) // Or handle more gracefully depending on application requirements
	}
	slog.Info("Price cache adapter initialized successfully.")

	priceService := price.NewService(birdeyeClient, jupiterClient, store, priceCache)

	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
		0,
		"",
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

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down servers...")

	// Stop gRPC server
	grpcServer.Stop()

	slog.Info("Servers exited properly")
}
