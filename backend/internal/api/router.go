package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/nicolas-martin/dankfolio/internal/service"
	"github.com/nicolas-martin/dankfolio/internal/middleware"
	"golang.org/x/time/rate"
)

type Router struct {
	authService      *service.AuthService
	coinService     *service.CoinService
	tradeService    *service.TradeService
	portfolioService *service.PortfolioService
	walletService   *service.WalletService
	redisClient     *redis.Client
}

func NewRouter(
	as *service.AuthService,
	cs *service.CoinService,
	ts *service.TradeService,
	ps *service.PortfolioService,
	ws *service.WalletService,
	redisClient *redis.Client,
) *Router {
	return &Router{
		authService:      as,
		coinService:     cs,
		tradeService:    ts,
		portfolioService: ps,
		walletService:   ws,
		redisClient:     redisClient,
	}
}

func (r *Router) Setup() http.Handler {
	router := chi.NewRouter()

	// Middleware
	router.Use(middleware.RequestLogger)
	router.Use(middleware.ErrorHandler)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(middleware.RealIP)
	router.Use(middleware.NewRateLimiter(rate.Limit(100), 200).Limit) // 100 requests per second with burst of 200
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

	// Public routes
	router.Group(func(r chi.Router) {
		r.Use(cache.Cache)
		r.Post("/api/auth/register", r.handleRegister())
		r.Post("/api/auth/login", r.handleLogin())
		r.Post("/api/auth/social-login", r.handleSocialLogin())
		
		// Public coin data
		r.Get("/api/coins", r.handleGetTopCoins())
		r.Get("/api/coins/{id}", r.handleGetCoinDetails())
		r.Get("/api/coins/{id}/price-history", r.handleGetCoinPriceHistory())
	})

	// Protected routes
	router.Group(func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)

		// WebSocket
		r.Get("/ws", r.handleWebSocket())

		// Trading
		r.Post("/api/trades/preview", r.handlePreviewTrade())
		r.Post("/api/trades/execute", r.handleExecuteTrade())
		r.Get("/api/trades/history", r.handleGetTradeHistory())

		// Portfolio
		r.Get("/api/portfolio", r.handleGetPortfolio())
		r.Get("/api/portfolio/history", r.handleGetPortfolioHistory())
		
		// Wallet
		r.Get("/api/wallet", r.handleGetWallet())
		r.Post("/api/wallet/deposit", r.handleInitiateDeposit())
		r.Post("/api/wallet/withdraw", r.handleInitiateWithdrawal())

		// User
		r.Get("/api/user/profile", r.handleGetProfile())
		r.Put("/api/user/profile", r.handleUpdateProfile())
		r.Put("/api/user/password", r.handleChangePassword())
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