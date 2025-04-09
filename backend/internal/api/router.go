package api

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	custommiddleware "github.com/nicolas-martin/dankfolio/internal/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/price"
	"github.com/nicolas-martin/dankfolio/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
)

// Router handles all HTTP routing
type Router struct {
	tradeHandlers  *TradeHandlers
	coinHandlers   *CoinHandlers
	priceHandlers  *PriceHandlers
	walletHandlers *WalletHandlers
}

// NewRouter creates a new Router instance
func NewRouter(
	solanaService *solana.SolanaTradeService,
	tradeService *trade.Service,
	coinService *coin.Service,
	priceService *price.Service,
	walletHandlers *WalletHandlers,
) *Router {
	return &Router{
		tradeHandlers:  NewTradeHandlers(tradeService, solanaService), // Pass solanaService
		coinHandlers:   NewCoinHandlers(coinService),
		priceHandlers:  NewPriceHandlers(priceService),
		walletHandlers: walletHandlers,
	}
}

// Setup initializes all routes
func (r *Router) Setup() http.Handler {
	router := chi.NewRouter()

	// Initialize cache middleware with 5 minute TTL
	// TODO: GOOD IDEA BUT THE REQUEST ISN"T PASSED TO THE LOGGER
	// cache := custommiddleware.NewCache(5 * time.Minute)
	// router.Use(cache.CacheMiddleware)

	router.Use(custommiddleware.RequestLogger)

	// Set up middleware
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)

	// Enable CORS with proper configuration
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8081", "http://localhost:3000"}, // Add your frontend origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Debug-Mode"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Health check
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Health check endpoint hit")
		respondJSON(w, map[string]string{
			"status":  "ok",
			"message": "Server is healthy",
		}, http.StatusOK)
	})

	// API routes with caching for GET requests
	router.Route("/api", func(apiRouter chi.Router) {

		// Register all routes through their respective handlers
		r.walletHandlers.RegisterRoutes(apiRouter)
		r.coinHandlers.RegisterRoutes(apiRouter)
		r.tradeHandlers.RegisterRoutes(apiRouter)
		r.priceHandlers.RegisterRoutes(apiRouter)
	})

	// Log all registered routes
	log.Printf("All routes registered. Walking routes...")
	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Printf("Route: %s %s", method, route)
		return nil
	}
	if err := chi.Walk(router, walkFunc); err != nil {
		log.Printf("Error walking routes: %v", err)
	}

	return router
}
