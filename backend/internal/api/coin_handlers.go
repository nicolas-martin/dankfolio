package api

import (
	"encoding/json"
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
	r.Post("/api/coins/fetch", h.FetchCoins)
	r.Get("/api/coins/top", h.GetTopCoins)
	r.Get("/api/coins/{id}", h.GetCoinByID)
	r.Get("/api/coins/contract/{address}", h.GetCoinByContractAddress)
	r.Get("/api/coins/{id}/history", h.GetCoinPriceHistory)
}

// FetchCoins handles fetching and storing meme coins
func (h *CoinHandlers) FetchCoins(w http.ResponseWriter, r *http.Request) {
	err := h.coinService.FetchAndStoreRealMemeCoins(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// GetTopCoins returns the top meme coins
func (h *CoinHandlers) GetTopCoins(w http.ResponseWriter, r *http.Request) {
	limit := 50 // default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	coins, err := h.coinService.GetTopMemeCoins(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(coins)
}

// GetCoinByID returns a specific coin by ID
func (h *CoinHandlers) GetCoinByID(w http.ResponseWriter, r *http.Request) {
	coinID := chi.URLParam(r, "id")
	coin, err := h.coinService.GetCoinByID(r.Context(), coinID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(coin)
}

// GetCoinByContractAddress returns a specific coin by contract address
func (h *CoinHandlers) GetCoinByContractAddress(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	coin, err := h.coinService.GetCoinByContractAddress(r.Context(), address)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(coin)
}

// GetCoinPriceHistory returns the price history for a specific coin
func (h *CoinHandlers) GetCoinPriceHistory(w http.ResponseWriter, r *http.Request) {
	coinID := chi.URLParam(r, "id")
	timeframe := r.URL.Query().Get("timeframe")

	history, err := h.coinService.GetCoinPriceHistory(r.Context(), coinID, timeframe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}
