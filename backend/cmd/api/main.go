package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"

	"github.com/nicolas-martin/dankfolio/internal/api"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	// Initialize database connection
	dbpool, err := pgxpool.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbpool.Close()

	database := db.NewDB(dbpool)

	// Initialize repositories
	coinRepo := repository.NewCoinRepository(database)
	tradeRepo := repository.NewTradeRepository(database)

	// Initialize services
	coinService := service.NewCoinService(coinRepo)
	solanaService, err := service.NewSolanaTradeService(
		os.Getenv("SOLANA_RPC_ENDPOINT"),
		os.Getenv("SOLANA_WS_ENDPOINT"),
		os.Getenv("SOLANA_PROGRAM_ID"),
		os.Getenv("SOLANA_POOL_WALLET"),
		os.Getenv("SOLANA_PRIVATE_KEY"),
	)
	if err != nil {
		log.Fatalf("Failed to initialize Solana service: %v", err)
	}

	tradeService := service.NewTradeService(coinService, solanaService, tradeRepo)
	wsService := service.NewWebSocketService()

	// Initialize router
	router := api.NewRouter(solanaService, coinService, tradeService)

	// Start WebSocket service
	go wsService.Run(context.Background())

	// Configure server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", os.Getenv("PORT")),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %s", os.Getenv("PORT"))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")
}
