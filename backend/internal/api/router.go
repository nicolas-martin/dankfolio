package api

import (
	"net/http"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-redis/redis/v8"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/nicolas-martin/dankfolio/internal/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type Router struct {
	authService      *service.AuthService
	userService      *service.UserService
	coinService      *service.CoinService
	tradeService     *service.TradeService
	portfolioService *service.PortfolioService
	walletService    *service.WalletService
	wsService        *service.WebSocketService
	solanaService    *service.SolanaTradeService
	redisClient      *redis.Client
}

func NewRouter(
	as *service.AuthService,
	us *service.UserService,
	cs *service.CoinService,
	ts *service.TradeService,
	ps *service.PortfolioService,
	ws *service.WalletService,
	wss *service.WebSocketService,
	ss *service.SolanaTradeService,
	redisClient *redis.Client,
) *Router {
	return &Router{
		authService:      as,
		userService:      us,
		coinService:      cs,
		tradeService:     ts,
		portfolioService: ps,
		walletService:    ws,
		wsService:        wss,
		solanaService:    ss,
		redisClient:      redisClient,
	}
}

func (r *Router) Setup() http.Handler {
	router := chi.NewRouter()

	// Middleware
	router.Use(middleware.RequestLogger)
	router.Use(middleware.ErrorHandler)
	router.Use(chimiddleware.Logger)
	router.Use(chimiddleware.Recoverer)
	router.Use(chimiddleware.RealIP)
	router.Use(chimiddleware.ThrottleBacklog(100, 200, time.Second)) // 100 requests per second with burst of 200
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Cache middleware for specific routes
	cache := middleware.NewCacheMiddleware(r.redisClient, 5*time.Minute, "dankfolio:")

	// API Documentation
	r.setupSwagger(router)

	// Health check endpoint
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Public routes
	router.Group(func(router chi.Router) {
		router.Use(cache.Cache)
		router.Post("/api/auth/register", r.handleRegister())
		router.Post("/api/auth/login", r.handleLogin())
		router.Post("/api/auth/social-login", r.handleSocialLogin())

		// Public coin data
		router.Get("/api/coins", r.handleGetTopCoins())
		router.Get("/api/coins/{id}", r.handleGetCoinDetails())
		router.Get("/api/coins/{id}/price-history", r.handleGetCoinPriceHistory())
	})

	// Protected routes
	router.Group(func(router chi.Router) {
		router.Use(middleware.Authenticate(r.authService))

		// WebSocket
		router.Get("/ws", r.handleWebSocket())

		// Trading
		router.Post("/api/trades/preview", r.handlePreviewTrade())
		router.Post("/api/trades/execute", r.handleExecuteTrade())
		router.Get("/api/trades/history", r.handleGetTradeHistory())

		// Solana Trading
		router.Get("/api/v1/solana/coins/trading-pairs", r.handleGetSolanaTradingPairs())
		router.Post("/api/v1/solana/testnet/fund", r.handleTestnetFunding())

		// Portfolio
		router.Get("/api/portfolio", r.handleGetPortfolio())
		router.Get("/api/portfolio/history", r.handleGetPortfolioHistory())

		// Wallet
		router.Get("/api/wallet", r.handleGetWallet())
		router.Post("/api/wallet/deposit", r.handleInitiateDeposit())
		router.Post("/api/wallet/withdraw", r.handleInitiateWithdrawal())

		// User
		router.Get("/api/user/profile", r.handleGetProfile())
		router.Put("/api/user/profile", r.handleUpdateProfile())
		router.Put("/api/user/password", r.handleChangePassword())
	})

	return router
}

func (r *Router) setupSwagger(router chi.Router) {
	// Serve OpenAPI specification
	router.Get("/swagger.yaml", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("api", "openapi.yaml"))
	})

	// Serve Swagger UI
	router.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger.yaml"),
		httpSwagger.DocExpansion("none"),
	))
}
