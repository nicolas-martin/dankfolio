package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
)

// CoinHandlers handles HTTP requests related to coins
type CoinHandlers struct {
	coinService *coin.Service
}

// NewCoinHandlers creates a new CoinHandlers instance
func NewCoinHandlers(coinService *coin.Service) *CoinHandlers {
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
		// Check for specific error messages that indicate the coin was not found
		if strings.Contains(err.Error(), "not found") ||
			strings.Contains(err.Error(), "invalid") {
			respondError(w, fmt.Sprintf("Coin not found: %s", err.Error()), http.StatusNotFound)
			return
		}
		// For other errors, return a 500 status
		respondError(w, fmt.Sprintf("Error retrieving coin: %s", err.Error()), http.StatusInternalServerError)
		return
	}

	respondJSON(w, coin, http.StatusOK)
}

// RegisterRoutes registers all coin-related routes
func (h *CoinHandlers) RegisterRoutes(r chi.Router) {
	r.Get("/tokens", h.GetCoins)
	r.Get("/tokens/{id}", h.GetCoinByID)
}
