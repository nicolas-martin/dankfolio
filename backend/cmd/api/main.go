package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/api/rest"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Set development mode if not specified
	if os.Getenv("APP_ENV") == "" {
		os.Setenv("APP_ENV", "development")
	}

	// Initialize services
	solanaService, err := solana.NewSolanaTradeService(os.Getenv("SOLANA_RPC_ENDPOINT"))
	if err != nil {
		log.Fatalf("Failed to initialize Solana service: %v", err)
	}

	// Initialize the coin service
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:  "https://public-api.birdeye.so",
		BirdEyeAPIKey:   os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey: os.Getenv("COINGECKO_API_KEY"),
	}

	// Initialize Jupiter client
	jupiterClient := coin.NewJupiterClient()

	// Initialize the coin service with Jupiter client
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient)

	// Initialize the trade service with both dependencies
	tradeService := trade.NewService(solanaService, coinService, jupiterClient)

	// Initialize the price service
	priceService := price.NewService(os.Getenv("BIRDEYE_API_KEY"))

	// Initialize Solana RPC client
	solanaClient := rpc.New(os.Getenv("SOLANA_RPC_ENDPOINT"))

	// Initialize the wallet service with coin service
	walletService := wallet.New(solanaClient, coinService)

	// Initialize REST handlers
	walletHandlers := rest.NewWalletHandlers(walletService)

	// Initialize REST router
	router := rest.NewRouter(solanaService, tradeService, coinService, priceService, walletHandlers)
	httpServer := &http.Server{
		Addr:    ":8080",
		Handler: router.Setup(),
	}

	// Initialize gRPC server
	grpcServer := grpcapi.NewServer(coinService, walletService, tradeService, priceService)
	grpcPort := 9000

	// Start REST server
	go func() {
		log.Printf("HTTP server starting on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Start gRPC server
	go func() {
		log.Printf("Starting gRPC server on port %d", grpcPort)
		if err := grpcServer.Start(grpcPort); err != nil {
			log.Fatalf("gRPC server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down servers...")

	// Gracefully shutdown HTTP server
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatal("HTTP server forced to shutdown:", err)
	}

	// Stop gRPC server
	grpcServer.Stop()

	log.Println("Servers exited properly")
}
