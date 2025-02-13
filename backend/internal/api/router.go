package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type Router struct {
	router             chi.Router
	authService        *service.AuthService
	portfolioService   service.PortfolioService
	solanaService      service.SolanaService
	userService        *service.UserService
	leaderboardService *service.LeaderboardService
	wsService          service.WebsocketService
	coinService        *service.CoinService
	tradeService       *service.TradeService
}

func NewRouter(
	authService *service.AuthService,
	portfolioService service.PortfolioService,
	solanaService service.SolanaService,
	userService *service.UserService,
	leaderboardService *service.LeaderboardService,
	wsService service.WebsocketService,
	coinService *service.CoinService,
	tradeService *service.TradeService,
) *Router {
	r := &Router{
		router:             chi.NewRouter(),
		authService:        authService,
		portfolioService:   portfolioService,
		solanaService:      solanaService,
		userService:        userService,
		leaderboardService: leaderboardService,
		wsService:          wsService,
		coinService:        coinService,
		tradeService:       tradeService,
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

	r.router.Route("/api", func(router chi.Router) {
		// Auth routes
		authHandlers := NewAuthHandlers(r.authService)
		router.Post("/auth/register", authHandlers.Register)
		router.Post("/auth/login", authHandlers.Login)
		router.Post("/auth/social", authHandlers.SocialLogin)

		// Protected routes
		router.Group(func(router chi.Router) {
			router.Use(AuthMiddleware(r.authService))

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

			// Coin routes
			coinHandlers := NewCoinHandlers(r.coinService)
			coinHandlers.RegisterRoutes(router)

			// Trade routes
			tradeHandlers := NewTradeHandlers(r.tradeService)
			router.Post("/trades/preview", tradeHandlers.PreviewTrade)
			router.Post("/trades/execute", tradeHandlers.ExecuteTrade)
			router.Get("/trades/history", tradeHandlers.GetTradeHistory)
		})
	})
}
