package main

import (
	"context"
	"log"
	"net/http"
	"os"

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

	// Initialize services
	authService := service.NewAuthService(database, os.Getenv("JWT_SECRET"))
	portfolioService := service.NewPortfolioService()
	solanaService := service.NewSolanaService()
	userService := service.NewUserService()
	leaderboardService := service.NewLeaderboardService()
	wsService := service.NewWebsocketService()
	coinService := service.NewCoinService(coinRepo)

	// Initialize router
	router := api.NewRouter(
		authService,
		portfolioService,
		solanaService,
		userService,
		leaderboardService,
		wsService,
		coinService,
	)

	// Start server
	log.Printf("Starting server on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
