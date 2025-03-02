package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

// Router handles all HTTP routing
type Router struct {
	solanaService *service.SolanaTradeService
	tradeService  *service.TradeService
	coinService   *service.CoinService
}

// NewRouter creates a new Router instance
func NewRouter(
	solanaService *service.SolanaTradeService,
	tradeService *service.TradeService,
) *Router {
	// Initialize the coin service
	coinService := service.NewCoinService()

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
		w.WriteHeader(http.StatusOK)
	})

	// Set up handlers
	tradeHandlers := NewTradeHandlers(r.tradeService)
	walletHandlers := NewWalletHandlers()
	coinHandlers := NewCoinHandlers(r.coinService)

	// Coin routes
	router.Get("/api/v1/coins", coinHandlers.GetCoins)
	router.Get("/api/v1/coins/{id}", coinHandlers.GetCoinByID)

	// Trade routes
	router.Post("/api/v1/trades/execute", tradeHandlers.ExecuteTrade)
	router.Get("/api/v1/trades/{id}", tradeHandlers.GetTradeByID)
	router.Get("/api/v1/trades", tradeHandlers.ListTrades)
	router.Get("/api/v1/trades/quote", tradeHandlers.GetTradeQuote)

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
