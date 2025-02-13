package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type Router struct {
	router             chi.Router
	portfolioService   service.PortfolioService
	solanaService      service.SolanaService
	userService        *service.UserService
	leaderboardService *service.LeaderboardService
	wsService          service.WebsocketService
}

func NewRouter(
	portfolioService service.PortfolioService,
	solanaService service.SolanaService,
	userService *service.UserService,
	leaderboardService *service.LeaderboardService,
	wsService service.WebsocketService,
) *Router {
	r := &Router{
		router:             chi.NewRouter(),
		portfolioService:   portfolioService,
		solanaService:      solanaService,
		userService:        userService,
		leaderboardService: leaderboardService,
		wsService:          wsService,
	}

	r.setupRoutes()
	return r
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.router.ServeHTTP(w, req)
}

func (r *Router) setupRoutes() {
	// Middleware
	r.router.Use(middleware.Logger)
	r.router.Use(middleware.Recoverer)
	r.router.Use(middleware.RequestID)
	r.router.Use(middleware.RealIP)

	// Health check
	r.router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.router.Route("/api/v1", func(router chi.Router) {
		// Portfolio routes
		portfolioHandlers := NewPortfolioHandlers(r.portfolioService)
		router.Get("/portfolio/stats", portfolioHandlers.GetPortfolioStats)
		router.Get("/portfolio/history", portfolioHandlers.GetPortfolioHistory)

		// Solana routes
		solanaHandlers := NewSolanaHandlers(r.solanaService)
		router.Get("/solana/trading-pairs", solanaHandlers.GetTradingPairs)
		router.Post("/solana/testnet/fund", solanaHandlers.FundTestnetWallet)

		// User routes
		userHandlers := NewUserHandlers(r.userService)
		router.Get("/user/profile", userHandlers.GetProfile)
		router.Put("/user/profile", userHandlers.UpdateProfile)
		router.Post("/user/password", userHandlers.ChangePassword)

		// Leaderboard routes
		leaderboardHandlers := NewLeaderboardHandlers(r.leaderboardService)
		router.Get("/leaderboard/{timeframe}", leaderboardHandlers.GetLeaderboard)
		router.Get("/leaderboard/{timeframe}/rank", leaderboardHandlers.GetUserRank)

		// Websocket route
		wsHandler := NewWebsocketHandler(r.wsService)
		router.Get("/ws", wsHandler.HandleWebsocket)
	})
}
