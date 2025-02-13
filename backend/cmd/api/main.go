package main

import (
	"log"
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/api"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

func main() {
	// Initialize services
	portfolioService := service.NewPortfolioService()
	solanaService := service.NewSolanaService()
	userService := service.NewUserService()
	leaderboardService := service.NewLeaderboardService()
	wsService := service.NewWebsocketService()

	// Initialize router
	router := api.NewRouter(
		portfolioService,
		solanaService,
		userService,
		leaderboardService,
		wsService,
	)

	// Start server
	log.Printf("Starting server on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
