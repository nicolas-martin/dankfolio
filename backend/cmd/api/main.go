package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint string
	BirdEyeEndpoint   string
	BirdEyeAPIKey     string
	CoinGeckoAPIKey   string
	GRPCPort          int
	CacheExpiry       time.Duration
}

func loadConfig() (*Config, error) {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
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
		GRPCPort:          9000, // Default value
		CacheExpiry:       cacheExpiry,
	}

	// Validate required fields
	var missingVars []string

	if config.SolanaRPCEndpoint == "" {
		missingVars = append(missingVars, "SOLANA_RPC_ENDPOINT")
	}
	if config.BirdEyeEndpoint == "" {
		missingVars = append(missingVars, "BIRDEYE_ENDPOINT")
	}
	if config.BirdEyeAPIKey == "" {
		missingVars = append(missingVars, "BIRDEYE_API_KEY")
	}

	if len(missingVars) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %v", missingVars)
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
	jupiterClient := jupiter.NewClient(httpClient)

	// Initialize store with configured cache expiry
	store := memory.NewWithConfig(memory.Config{
		DefaultCacheExpiry: config.CacheExpiry,
	})

	// Initialize coin service
	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:  config.BirdEyeEndpoint,
		BirdEyeAPIKey:   config.BirdEyeAPIKey,
		CoinGeckoAPIKey: config.CoinGeckoAPIKey,
	}
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store)

	// Initialize Solana service
	solanaService, err := solana.NewSolanaTradeService(config.SolanaRPCEndpoint)
	if err != nil {
		log.Fatalf("Failed to initialize Solana service: %v", err)
	}

	// Initialize price service
	priceService := price.NewService(config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	// Initialize trade service with all dependencies
	tradeService := trade.NewService(solanaService, coinService, priceService, jupiterClient, store)

	// Initialize wallet service
	walletService := wallet.New(solanaService.GetRPCClient(), coinService)

	// Initialize gRPC server
	grpcServer := grpcapi.NewServer(coinService, walletService, tradeService, priceService)

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
