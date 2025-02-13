package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type CoinHandlers struct {
	coinService *service.CoinService
}

func NewCoinHandlers(coinService *service.CoinService) *CoinHandlers {
	return &CoinHandlers{
		coinService: coinService,
	}
}

// RegisterRoutes registers all coin-related routes
func (h *CoinHandlers) RegisterRoutes(r chi.Router) {
	r.Get("/coins/top", h.GetTopMemeCoins)
	r.Get("/coins/{id}", h.GetCoinByID)
	r.Get("/coins/{id}/price-history", h.GetCoinPriceHistory)
	r.Get("/coins/contract/{address}", h.GetCoinByContractAddress)
}

// GetTopMemeCoins returns the top meme coins
func (h *CoinHandlers) GetTopMemeCoins(w http.ResponseWriter, r *http.Request) {
	limit := 10 // Default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	coins, err := h.coinService.GetTopMemeCoins(r.Context(), limit)
	if err != nil {
		respondError(w, "Failed to fetch top meme coins", http.StatusInternalServerError)
		return
	}

	respondJSON(w, coins, http.StatusOK)
}

// GetCoinByID returns a specific coin by ID
func (h *CoinHandlers) GetCoinByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	coin, err := h.coinService.GetCoinByID(r.Context(), id)
	if err != nil {
		respondError(w, "Coin not found", http.StatusNotFound)
		return
	}

	respondJSON(w, coin, http.StatusOK)
}

// GetCoinByContractAddress returns a specific coin by contract address
func (h *CoinHandlers) GetCoinByContractAddress(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")

	coin, err := h.coinService.GetCoinByContractAddress(r.Context(), address)
	if err != nil {
		respondError(w, "Coin not found", http.StatusNotFound)
		return
	}

	respondJSON(w, coin, http.StatusOK)
}

// GetCoinPriceHistory returns the price history for a specific coin
func (h *CoinHandlers) GetCoinPriceHistory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	timeframe := r.URL.Query().Get("timeframe")
	if timeframe == "" {
		timeframe = "day" // Default to 24h
	}

	history, err := h.coinService.GetCoinPriceHistory(r.Context(), id, timeframe)
	if err != nil {
		respondError(w, "Failed to fetch price history", http.StatusInternalServerError)
		return
	}

	respondJSON(w, history, http.StatusOK)
}

// FetchAndStoreRealMemeCoins handles fetching and storing meme coins
func (h *CoinHandlers) FetchAndStoreRealMemeCoins(w http.ResponseWriter, r *http.Request) {
	err := h.coinService.FetchAndStoreRealMemeCoins(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{"status": "success"}, http.StatusOK)
}
