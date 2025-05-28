package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/auth"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint     string
	BirdEyeEndpoint       string
	BirdEyeAPIKey         string
	CoinGeckoAPIKey       string
	GRPCPort              int
	DBURL                 string
	CacheExpiry           time.Duration
	JupiterApiKey         string
	JupiterApiUrl         string
	Env                   string
	JWTSecret             string
	TokenExpiry           time.Duration
	NewCoinsFetchInterval time.Duration
}

func loadConfig() (*Config, error) {
	// Load environment variables
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			// slog is not configured yet, use original log.Fatal
			log.Fatal(err)
		}
	}

	// Parse cache expiry duration from environment variable (default to 5 minutes)
	cacheExpiry := 5 * time.Minute
	if expiryStr := os.Getenv("CACHE_EXPIRY_SECONDS"); expiryStr != "" {
		expirySecs, err := strconv.Atoi(expiryStr)
		if err != nil {
			// slog not configured yet, or use a temp logger if this happens often before main setup
			log.Printf("Warning: Invalid CACHE_EXPIRY_SECONDS value: %v, using default. Slog not yet initialized.", err)
		} else {
			cacheExpiry = time.Duration(expirySecs) * time.Second
		}
	}

	// Parse token expiry duration (default to 24 hours)
	tokenExpiry := 24 * time.Hour
	if expiryStr := os.Getenv("JWT_TOKEN_EXPIRY_HOURS"); expiryStr != "" {
		expiryHours, err := strconv.Atoi(expiryStr)
		if err != nil {
			log.Printf("Warning: Invalid JWT_TOKEN_EXPIRY_HOURS value: %v, using default 24 hours.", err)
		} else {
			tokenExpiry = time.Duration(expiryHours) * time.Hour
		}
	}

	newCoinsIntervalMinutesStr := os.Getenv("NEW_COINS_FETCH_INTERVAL_MINUTES")
	newCoinsIntervalMinutes, err := strconv.Atoi(newCoinsIntervalMinutesStr)
	if err != nil {
		log.Fatalf("invalid NEW_COINS_FETCH_INTERVAL_MINUTES value: %v", err)
	}
	newCoinsFetchInterval := time.Duration(newCoinsIntervalMinutes) * time.Minute

	config := &Config{
		SolanaRPCEndpoint:     os.Getenv("SOLANA_RPC_ENDPOINT"),
		BirdEyeEndpoint:       os.Getenv("BIRDEYE_ENDPOINT"),
		BirdEyeAPIKey:         os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey:       os.Getenv("COINGECKO_API_KEY"),
		DBURL:                 os.Getenv("DB_URL"),
		GRPCPort:              9000, // Default value
		CacheExpiry:           cacheExpiry,
		JupiterApiKey:         os.Getenv("JUPITER_API_KEY"),
		JupiterApiUrl:         os.Getenv("JUPITER_API_URL"),
		Env:                   os.Getenv("APP_ENV"),
		JWTSecret:             os.Getenv("JWT_SECRET"),
		TokenExpiry:           tokenExpiry,
		NewCoinsFetchInterval: newCoinsFetchInterval,
	}

	// Validate required fields
	var missingVars []string

	if config.JWTSecret == "" {
		missingVars = append(missingVars, "JWT_SECRET")
	}
	if config.Env == "" {
		missingVars = append(missingVars, "APP_ENV")
	}
	if config.SolanaRPCEndpoint == "" {
		missingVars = append(missingVars, "SOLANA_RPC_ENDPOINT")
	}
	if config.BirdEyeEndpoint == "" {
		missingVars = append(missingVars, "BIRDEYE_ENDPOINT")
	}
	if config.BirdEyeAPIKey == "" {
		missingVars = append(missingVars, "BIRDEYE_API_KEY")
	}
	if config.DBURL == "" {
		missingVars = append(missingVars, "DB_URL")
	}
	if config.JupiterApiUrl == "" {
		missingVars = append(missingVars, "JUPITER_API_URL")
	}

	if len(missingVars) > 0 {
		log.Fatalf("missing required environment variables: %v", missingVars)
	}

	return config, nil
}

func main() {
	logLevel := slog.LevelDebug
	var handler slog.Handler

	config, err := loadConfig()
	if err != nil {
		// Use standard log here as slog might not be initialized if config loading fails early
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if config.Env != "development" {
		logLevel = slog.LevelInfo
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
	)

	ctx := context.Background()
	firebaseApp, err := firebase.NewApp(ctx, nil)
	if err != nil {
		slog.Error("Failed to initialize Firebase Admin SDK", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("🔥 Firebase Admin SDK initialized successfully")

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

	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey)

	birdeyeClient := birdeye.NewClient(config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	solanaClient := solana.NewClient(config.SolanaRPCEndpoint)

	offchainClient := offchain.NewClient(httpClient)

	store, err := postgres.NewStore(config.DBURL, true, logLevel) // Pass logLevel
	if err != nil {
		slog.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize auth service with App Check client
	authServiceConfig := &auth.Config{
		JWTSecret:      config.JWTSecret,
		TokenExpiry:    config.TokenExpiry,
		AppCheckClient: appCheckClient,
		Env:            config.Env, // Pass AppEnv to auth service config
	}
	authService, err := auth.NewService(authServiceConfig)
	if err != nil {
		slog.Error("Failed to initialize auth service", slog.Any("error", err))
		os.Exit(1)
	}

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:        config.BirdEyeEndpoint,
		BirdEyeAPIKey:         config.BirdEyeAPIKey,
		CoinGeckoAPIKey:       config.CoinGeckoAPIKey,
		SolanaRPCEndpoint:     config.SolanaRPCEndpoint,
		NewCoinsFetchInterval: config.NewCoinsFetchInterval,
	}
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store)
	slog.Info("Coin service initialized.")

	priceService := price.NewService(birdeyeClient, jupiterClient)

	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
	)

	walletService := wallet.New(solanaClient.GetRpcConnection(), store)

	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher)

	grpcServer := grpcapi.NewServer(
		coinService,
		walletService,
		tradeService,
		priceService,
		utilitySvc,
		authService,
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
