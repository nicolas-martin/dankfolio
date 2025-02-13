package api

import (
	"net/http"

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
func (h *CoinHandlers) RegisterRoutes(router chi.Router) {
	router.Get("/coins", h.GetTopMemeCoins)
	router.Get("/coins/{id}", h.GetCoinByID)
	router.Get("/coins/{id}/history", h.GetCoinPriceHistory)
	router.Get("/coins/contract/{address}", h.GetCoinByContractAddress)
	router.Post("/coins/fetch", h.FetchAndStoreRealMemeCoins)
}

// GetTopMemeCoins returns the top meme coins
func (h *CoinHandlers) GetTopMemeCoins(w http.ResponseWriter, r *http.Request) {
	coins, err := h.coinService.GetTopMemeCoins(r.Context(), 50) // Default limit of 50
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, coins)
}

// GetCoinByID returns a specific coin by ID
func (h *CoinHandlers) GetCoinByID(w http.ResponseWriter, r *http.Request) {
	coinID := chi.URLParam(r, "id")
	if coinID == "" {
		http.Error(w, "coin ID is required", http.StatusBadRequest)
		return
	}

	coin, err := h.coinService.GetCoinByID(r.Context(), coinID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, coin)
}

// GetCoinByContractAddress returns a specific coin by contract address
func (h *CoinHandlers) GetCoinByContractAddress(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	if address == "" {
		http.Error(w, "contract address is required", http.StatusBadRequest)
		return
	}

	coin, err := h.coinService.GetCoinByContractAddress(r.Context(), address)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, coin)
}

// GetCoinPriceHistory returns the price history for a specific coin
func (h *CoinHandlers) GetCoinPriceHistory(w http.ResponseWriter, r *http.Request) {
	coinID := chi.URLParam(r, "id")
	timeframe := r.URL.Query().Get("timeframe")
	if timeframe == "" {
		timeframe = "day" // Default timeframe
	}

	history, err := h.coinService.GetCoinPriceHistory(r.Context(), coinID, timeframe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, history)
}

// FetchAndStoreRealMemeCoins handles fetching and storing meme coins
func (h *CoinHandlers) FetchAndStoreRealMemeCoins(w http.ResponseWriter, r *http.Request) {
	err := h.coinService.FetchAndStoreRealMemeCoins(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "success"})
}
