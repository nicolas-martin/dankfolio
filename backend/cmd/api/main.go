package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/api"
	"github.com/nicolas-martin/dankfolio/internal/config"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/logger"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/service"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal(context.Background(), "Failed to load configuration", zap.Error(err))
	}

	// Initialize database connection
	dbPool, err := pgxpool.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Fatal(context.Background(), "Failed to connect to database", zap.Error(err))
	}
	defer dbPool.Close()

	// Initialize database wrapper
	dbWrapper := db.NewDB(dbPool)

	// Initialize Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
	})
	defer redisClient.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(dbWrapper)
	coinRepo := repository.NewCoinRepository(dbWrapper)
	walletRepo := repository.NewWalletRepository(dbWrapper)
	tradeRepo := repository.NewTradeRepository(dbWrapper)
	portfolioRepo := repository.NewPortfolioRepository(dbWrapper)

	// Initialize services
	authService := service.NewAuthService(dbWrapper, cfg.JWTSecret)
	userService := service.NewUserService(userRepo)
	coinService := service.NewCoinService(coinRepo)
	walletService := service.NewWalletService(cfg.SolanaRPCEndpoint, walletRepo)

	// Initialize Solana trade service
	solanaService, err := service.NewSolanaTradeService(
		cfg.SolanaRPCEndpoint,
		cfg.SolanaWSEndpoint,
		cfg.SolanaProgramID,
		cfg.SolanaPoolWallet,
		dbWrapper,
	)
	if err != nil {
		logger.Fatal(context.Background(), "Failed to initialize Solana trade service", zap.Error(err))
	}

	tradeService := service.NewTradeService(coinService, walletService, solanaService, tradeRepo)
	portfolioService := service.NewPortfolioService(portfolioRepo, coinService)
	wsService := service.NewWebSocketService()
	leaderboardService := service.NewLeaderboardService(dbWrapper)

	// Initialize router
	router := api.NewRouter(
		authService,
		userService,
		coinService,
		tradeService,
		&portfolioService,
		walletService,
		wsService,
		solanaService,
		leaderboardService,
		redisClient,
	)

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: router.Setup(),
	}

	// Start WebSocket service
	wsService.Start()

	// Start server in a goroutine
	go func() {
		logger.Info(context.Background(), "Starting server",
			zap.String("addr", server.Addr),
			zap.String("env", cfg.Environment),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal(context.Background(), "Server failed", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	logger.Info(context.Background(), "Server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	wsService.Stop()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal(context.Background(), "Server forced to shutdown", zap.Error(err))
	}

	logger.Info(context.Background(), "Server stopped gracefully")
}
