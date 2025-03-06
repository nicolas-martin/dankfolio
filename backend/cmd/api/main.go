package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/internal/api"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/price"
	"github.com/nicolas-martin/dankfolio/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
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

	coinService := coin.NewService(coinServiceConfig, httpClient)

	// Initialize the trade service with both dependencies
	tradeService := trade.NewService(solanaService, coinService)

	// Initialize the price service
	priceService := price.NewService(os.Getenv("BIRDEYE_API_KEY"))

	// Initialize router
	router := api.NewRouter(solanaService, tradeService, coinService, priceService)
	server := &http.Server{
		Addr:    ":8080",
		Handler: router.Setup(),
	}

	// Start server
	go func() {
		log.Printf("Server starting on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Gracefully shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited properly")
}
