package api

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/model"
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

// GetCoins returns a list of available coins, optionally filtered by trending status
func (h *CoinHandlers) GetCoins(w http.ResponseWriter, r *http.Request) {
	// Check for the 'trending' query parameter
	filterTrending := r.URL.Query().Get("trending") == "true"

	var coins []model.Coin
	var err error

	if filterTrending {
		// Fetch only trending coins from the service
		log.Println("Fetching only trending coins based on query parameter...")
		coins, err = h.coinService.GetTrendingCoins(r.Context())
		if err != nil {
			respondError(w, "Failed to retrieve trending coins: "+err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		// Fetch all coins from the service
		log.Println("Fetching all coins...")
		coins, err = h.coinService.GetCoins(r.Context())
		if err != nil {
			respondError(w, "Failed to retrieve all coins: "+err.Error(), http.StatusInternalServerError)
			return
		}
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
	r.Get("/tokens", h.GetCoins) // Handles both all tokens and ?trending=true
	r.Get("/tokens/{id}", h.GetCoinByID)
}
