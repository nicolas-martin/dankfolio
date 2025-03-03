package api

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
)

// Router handles all HTTP routing
type Router struct {
	solanaService *solana.SolanaTradeService
	tradeService  *trade.Service
	coinService   *coin.Service
}

// NewRouter creates a new Router instance
func NewRouter(
	solanaService *solana.SolanaTradeService,
	tradeService *trade.Service,
	coinService *coin.Service,
) *Router {
	return &Router{
		solanaService: solanaService,
		tradeService:  tradeService,
		coinService:   coinService,
	}
}

// Setup initializes all routes
func (r *Router) Setup() chi.Router {
	router := chi.NewRouter()

	// Set up middleware
	router.Use(middleware.RequestLogger)
	router.Use(chimiddleware.RequestID)
	router.Use(chimiddleware.RealIP)
	router.Use(chimiddleware.Recoverer)
	router.Use(corsMiddleware)

	// Health check
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Health check endpoint hit")
		w.WriteHeader(http.StatusOK)
	})

	// Set up handlers
	tradeHandlers := NewTradeHandlers(r.tradeService)
	walletHandlers := NewWalletHandlers()
	coinHandlers := NewCoinHandlers(r.coinService)

	// Coin routes
	router.Get("/api/coins", coinHandlers.GetCoins)
	router.Get("/api/coins/{id}", coinHandlers.GetCoinByID)
	router.Get("/api/tokens/{id}/details", coinHandlers.GetTokenDetails)

	// Trade routes
	log.Printf("Registering trade routes...")
	router.Route("/api/trades", func(r chi.Router) {
		r.Get("/quote", tradeHandlers.GetTradeQuote)
		r.Post("/execute", tradeHandlers.ExecuteTrade)
		r.Get("/{id}", tradeHandlers.GetTradeByID)
		r.Get("/", tradeHandlers.ListTrades)
	})
	log.Printf("Trade routes registered")

	// Wallet routes
	router.Post("/api/wallets", walletHandlers.CreateWallet)

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

// corsMiddleware handles CORS headers
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
