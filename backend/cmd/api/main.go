package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
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
}

func loadConfig() (*Config, error) {
	// // Base URL for Jupiter API
	// baseURL  = "https://api.jup.ag"
	// lightURL = "https://lite-api.jup.ag"

	// Load environment variables
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			log.Fatal(err)
		}
	}

	// Parse cache expiry duration from environment variable (default to 5 minutes)
	cacheExpiry := 5 * time.Minute
	if expiryStr := os.Getenv("CACHE_EXPIRY_SECONDS"); expiryStr != "" {
		expirySecs, err := strconv.Atoi(expiryStr)
		if err != nil {
			log.Printf("Warning: Invalid CACHE_EXPIRY_SECONDS value: %v, using default", err)
		} else {
			cacheExpiry = time.Duration(expirySecs) * time.Second
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
	}

	// Validate required fields
	var missingVars []string

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
	if config.Env != "development" {
		if config.JupiterApiKey == "" {
			missingVars = append(missingVars, "JUPITER_API_KEY")
		}
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
	// Load and validate configuration
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

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
	store, err := postgres.NewStore(config.DBURL, true)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
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

	// Initialize gRPC server
	grpcServer := grpcapi.NewServer(
		coinService,
		walletService,
		tradeService,
		priceService,
		utilitySvc,
	)

	// Start gRPC server
	go func() {
		log.Printf("Starting gRPC server on port %d", config.GRPCPort)
		if err := grpcServer.Start(config.GRPCPort); err != nil {
			log.Fatalf("gRPC server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down servers...")

	// Stop gRPC server
	grpcServer.Stop()

	log.Println("Servers exited properly")
}
