package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

// Router handles all HTTP routing
type Router struct {
	solanaService *service.SolanaTradeService
	tradeService  *service.TradeService
}

// NewRouter creates a new Router instance
func NewRouter(
	solanaService *service.SolanaTradeService,
	tradeService *service.TradeService,
) *Router {
	return &Router{
		solanaService: solanaService,
		tradeService:  tradeService,
	}
}

// Setup initializes all routes
func (r *Router) Setup() chi.Router {
	router := chi.NewRouter()

	// Set up middleware
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(corsMiddleware)

	// Health check
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Set up handlers
	tradeHandlers := NewTradeHandlers(r.tradeService)
	walletHandlers := NewWalletHandlers()

	// Trade routes
	router.Post("/api/v1/trades", tradeHandlers.ExecuteTrade)
	router.Get("/api/v1/trades/{id}", tradeHandlers.GetTradeByID)
	router.Get("/api/v1/trades", tradeHandlers.ListTrades)

	// Wallet routes
	router.Post("/api/v1/wallets", walletHandlers.CreateWallet)

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
