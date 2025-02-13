package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type Router struct {
	router        chi.Router
	solanaService *service.SolanaTradeService
	coinService   *service.CoinService
	tradeService  *service.TradeService
}

func NewRouter(
	solanaService *service.SolanaTradeService,
	coinService *service.CoinService,
	tradeService *service.TradeService,
) *Router {
	r := &Router{
		router:        chi.NewRouter(),
		solanaService: solanaService,
		coinService:   coinService,
		tradeService:  tradeService,
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
		// Coin routes
		coinHandlers := NewCoinHandlers(r.coinService)
		coinHandlers.RegisterRoutes(router)

		// Trade routes
		tradeHandlers := NewTradeHandlers(r.tradeService)
		tradeHandlers.RegisterRoutes(router)
	})
}
