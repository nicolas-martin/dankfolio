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

	bloctoRPC "github.com/blocto/solana-go-sdk/rpc"
	"github.com/gagliardetto/solana-go/rpc"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint         string
	SolanaRPCAPIKey           string
	BirdEyeEndpoint           string
	BirdEyeAPIKey             string
	CoinGeckoAPIKey           string
	GRPCPort                  int
	DBURL                     string
	CacheExpiry               time.Duration
	JupiterApiKey             string
	JupiterApiUrl             string
	Env                       string
	NewCoinsFetchInterval     time.Duration
	PlatformFeeBps            int
	PlatformFeeAccountAddress string
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

	newCoinsIntervalMinutesStr := os.Getenv("NEW_COINS_FETCH_INTERVAL_MINUTES")
	newCoinsIntervalMinutes, err := strconv.Atoi(newCoinsIntervalMinutesStr)
	if err != nil {
		log.Fatalf("invalid NEW_COINS_FETCH_INTERVAL_MINUTES value: %v", err)
	}
	newCoinsFetchInterval := time.Duration(newCoinsIntervalMinutes) * time.Minute

	platformFeeBpsStr := os.Getenv("PLATFORM_FEE_BPS")
	platformFeeBps := 0 // Default to 0
	if platformFeeBpsStr != "" {
		parsedBps, err := strconv.Atoi(platformFeeBpsStr)
		if err != nil {
			log.Printf("Warning: Invalid PLATFORM_FEE_BPS value: %v. Defaulting to 0.", err)
		} else {
			platformFeeBps = parsedBps
		}
	}
	platformFeeAccountAddress := os.Getenv("PLATFORM_FEE_ACCOUNT_ADDRESS")

	config := &Config{
		SolanaRPCEndpoint:         os.Getenv("SOLANA_RPC_ENDPOINT"),
		SolanaRPCAPIKey:           os.Getenv("SOLANA_RPC_API_KEY"),
		BirdEyeEndpoint:           os.Getenv("BIRDEYE_ENDPOINT"),
		BirdEyeAPIKey:             os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey:           os.Getenv("COINGECKO_API_KEY"),
		DBURL:                     os.Getenv("DB_URL"),
		GRPCPort:                  9000, // Default value
		CacheExpiry:               cacheExpiry,
		JupiterApiKey:             os.Getenv("JUPITER_API_KEY"),
		JupiterApiUrl:             os.Getenv("JUPITER_API_URL"),
		Env:                       os.Getenv("APP_ENV"),
		NewCoinsFetchInterval:     newCoinsFetchInterval,
		PlatformFeeBps:            platformFeeBps,
		PlatformFeeAccountAddress: platformFeeAccountAddress,
	}

	// Validate required fields
	var missingVars []string

	if config.Env == "" {
		missingVars = append(missingVars, "APP_ENV")
	}
	if config.SolanaRPCEndpoint == "" {
		log.Print("Warning: SOLANA_RPC_ENDPOINT is not set, using default value.")
		config.SolanaRPCEndpoint = "https://api.mainnet-beta.solana.com"
	}

	if config.SolanaRPCEndpoint != "" && config.SolanaRPCAPIKey == "" {
		missingVars = append(missingVars, "SolanaRPCAPIKey")
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
	// No longer validating IPFSNodeAPIAddress
	// PreferredGatewayForCIDv0 has a default, so not strictly required to be in missingVars unless empty is invalid.

	if len(missingVars) > 0 {
		log.Fatalf("missing required environment variables: %v", missingVars)
	}

	// PLATFORM_FEE_BPS represents a basis point value for platform fees and must be non-negative.
	if config.PlatformFeeBps < 0 {
		log.Fatalf("PLATFORM_FEE_BPS cannot be negative.")
	}
	// If PLATFORM_FEE_BPS is greater than 0, PLATFORM_FEE_ACCOUNT_ADDRESS must be set
	// because a non-zero platform fee requires an account to receive the fee.
	if config.PlatformFeeBps > 0 && config.PlatformFeeAccountAddress == "" {
		log.Fatalf("PLATFORM_FEE_ACCOUNT_ADDRESS must be set if PLATFORM_FEE_BPS is greater than 0.")
	}

	return config, nil
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

	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey)

	birdeyeClient := birdeye.NewClient(config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}
	solClient := rpc.NewWithHeaders(config.SolanaRPCEndpoint, header)
	baseClient := &http.Client{
		Transport: &headerTransport{APIKey: config.SolanaRPCAPIKey},
	}
	blotorpcClient := bloctoRPC.New(bloctoRPC.WithEndpoint(config.SolanaRPCEndpoint), bloctoRPC.WithHTTPClient(baseClient))

	solanaClient := solana.NewClient(solClient, blotorpcClient)

	offchainClient := offchain.NewClient(httpClient)

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

	walletService := wallet.New(solClient, store, coinService)

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

type headerTransport struct {
	Base   http.RoundTripper
	APIKey string
}

func (t *headerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+t.APIKey)
	return t.transport().RoundTrip(req)
}

func (t *headerTransport) transport() http.RoundTripper {
	if t.Base != nil {
		return t.Base
	}
	return http.DefaultTransport
}
