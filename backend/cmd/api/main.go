package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/api"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

func main() {
	// Initialize database
	dbpool, err := pgxpool.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer dbpool.Close()

	database := db.NewDB(dbpool)

	// Initialize repositories
	coinRepo := repository.NewCoinRepository(database)
	tradeRepo := repository.NewTradeRepository(database)
	walletRepo := repository.NewWalletRepository(database)

	// Initialize services
	authService := service.NewAuthService(database, os.Getenv("JWT_SECRET"))
	portfolioService := service.NewPortfolioService()
	solanaService := service.NewSolanaService()
	userService := service.NewUserService()
	leaderboardService := service.NewLeaderboardService()
	wsService := service.NewWebsocketService()
	coinService := service.NewCoinService(coinRepo)

	// Initialize test data in development
	if os.Getenv("APP_ENV") == "development" {
		if err := coinService.InitializeTestData(context.Background()); err != nil {
			log.Printf("Warning: Failed to initialize test data: %v", err)
		}
	}

	walletService := service.NewWalletService(os.Getenv("SOLANA_RPC_ENDPOINT"), walletRepo)

	// Initialize Solana-specific services
	solanaTradeService, err := service.NewSolanaTradeService(
		os.Getenv("SOLANA_RPC_ENDPOINT"),
		os.Getenv("SOLANA_WS_ENDPOINT"),
		os.Getenv("SOLANA_PROGRAM_ID"),
		os.Getenv("SOLANA_POOL_WALLET"),
		database,
	)
	if err != nil {
		log.Fatalf("Failed to initialize Solana trade service: %v", err)
	}

	// Set compute budget and fees if configured
	if limit := os.Getenv("SOLANA_COMPUTE_UNIT_LIMIT"); limit != "" {
		if limitVal, err := strconv.ParseUint(limit, 10, 32); err == nil {
			solanaTradeService.SetComputeUnitLimit(uint32(limitVal))
		}
	}
	if fee := os.Getenv("SOLANA_FEE_MICRO_LAMPORTS"); fee != "" {
		if feeVal, err := strconv.ParseUint(fee, 10, 64); err == nil {
			solanaTradeService.SetFeeMicroLamports(feeVal)
		}
	}

	// Initialize trade service with all dependencies
	tradeService := service.NewTradeService(
		coinService,
		walletService,
		solanaTradeService,
		tradeRepo,
	)

	// Initialize router
	router := api.NewRouter(
		authService,
		portfolioService,
		solanaService,
		userService,
		leaderboardService,
		wsService,
		coinService,
		tradeService,
	)

	// Start server
	log.Printf("Starting server on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
