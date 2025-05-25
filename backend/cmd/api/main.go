package main

import (
	"context"
	"log"      // Import standard log for pre-slog setup errors
	"log/slog" // Import slog
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
	SolanaRPCEndpoint string
	BirdEyeEndpoint   string
	BirdEyeAPIKey     string
	CoinGeckoAPIKey   string
	GRPCPort          int
	DBURL             string
	CacheExpiry       time.Duration
	JupiterApiKey     string
	JupiterApiUrl     string
	Env               string
	JWTSecret         string
	TokenExpiry       time.Duration
}

func loadConfig() (*Config, error) {
	// // Base URL for Jupiter API
	// baseURL  = "https://api.jup.ag"
	// lightURL = "https://lite-api.jup.ag"

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

	config := &Config{
		SolanaRPCEndpoint: os.Getenv("SOLANA_RPC_ENDPOINT"),
		BirdEyeEndpoint:   os.Getenv("BIRDEYE_ENDPOINT"),
		BirdEyeAPIKey:     os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey:   os.Getenv("COINGECKO_API_KEY"),
		DBURL:             os.Getenv("DB_URL"),
		GRPCPort:          9000, // Default value
		CacheExpiry:       cacheExpiry,
		JupiterApiKey:     os.Getenv("JUPITER_API_KEY"),
		JupiterApiUrl:     os.Getenv("JUPITER_API_URL"),
		Env:               os.Getenv("APP_ENV"),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		TokenExpiry:       tokenExpiry,
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
	// if config.Env != "development" {
	// 	if config.JupiterApiKey == "" {
	// 		missingVars = append(missingVars, "JUPITER_API_KEY")
	// 	}
	// }
	if config.JupiterApiUrl == "" {
		missingVars = append(missingVars, "JUPITER_API_URL")
	}

	if len(missingVars) > 0 {
		// Slog not configured yet
		log.Fatalf("missing required environment variables: %v", missingVars)
	}

	return config, nil
}

func main() {
	logLevel := slog.LevelDebug
	var handler slog.Handler
	handler = logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)

	if os.Getenv("APP_ENV") != "development" {
		logLevel = slog.LevelInfo
		handler = slog.NewJSONHandler(os.Stdout, nil)
	}

	// Create color handler and set it as default
	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	// Load and validate configuration
	config, err := loadConfig()
	if err != nil {
		slog.Error("Failed to load configuration", slog.Any("error", err))
		os.Exit(1)
	}

	slog.Info("Configuration loaded successfully", "env", config.Env, "port", config.GRPCPort)

	// Initialize Firebase Admin SDK
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

	// Initialize HTTP client
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Initialize Jupiter client
	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey)

	// Initialize BirdEye client
	birdeyeClient := birdeye.NewClient(config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	// Initialize Solana client
	solanaClient := solana.NewClient(config.SolanaRPCEndpoint)

	// Initialize offchain client
	offchainClient := offchain.NewClient(httpClient)

	// Initialize store with configured cache expiry
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
	}
	authService, err := auth.NewService(authServiceConfig)
	if err != nil {
		panic(err)
	}

	// Initialize coin service
	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:    config.BirdEyeEndpoint,
		BirdEyeAPIKey:     config.BirdEyeAPIKey,
		CoinGeckoAPIKey:   config.CoinGeckoAPIKey,
		SolanaRPCEndpoint: config.SolanaRPCEndpoint,
	}
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store)

	// Initialize price service
	priceService := price.NewService(birdeyeClient, jupiterClient)

	// Initialize trade service with all dependencies
	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
	)

	// Initialize wallet service
	walletService := wallet.New(solanaClient.GetRpcConnection(), store)

	// Initialize Image Service / Utility Service
	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher)

	// Initialize gRPC server with auth service
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
