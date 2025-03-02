package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

// CoinHandlers handles HTTP requests related to coins
type CoinHandlers struct {
	coinService *service.CoinService
}

// NewCoinHandlers creates a new CoinHandlers instance
func NewCoinHandlers(coinService *service.CoinService) *CoinHandlers {
	return &CoinHandlers{
		coinService: coinService,
	}
}

// GetCoins returns a list of all available coins
func (h *CoinHandlers) GetCoins(w http.ResponseWriter, r *http.Request) {
	// Fetch coins from the service
	coins, err := h.coinService.GetCoins(r.Context())
	if err != nil {
		respondError(w, "Failed to retrieve coins: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, coins, http.StatusOK)
}

// GetCoinByID returns a coin by its ID
func (h *CoinHandlers) GetCoinByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	coin, err := h.coinService.GetCoinByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Coin not found", http.StatusNotFound)
		return
	}

	respondJSON(w, coin, http.StatusOK)
}
