package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func (r *Router) handleGetTopCoins() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		limit := 100 // Default limit
		if limitStr := req.URL.Query().Get("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
		}

		coins, err := r.coinService.GetTopCoins(req.Context(), limit)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, coins)
	}
}

func (r *Router) handleGetCoinDetails() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		coinID := chi.URLParam(req, "id")
		if coinID == "" {
			respondError(w, http.StatusBadRequest, "Missing coin ID")
			return
		}

		coin, err := r.coinService.GetCoinByID(req.Context(), coinID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, coin)
	}
}

func (r *Router) handleGetCoinPriceHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		coinID := chi.URLParam(req, "id")
		if coinID == "" {
			respondError(w, http.StatusBadRequest, "Missing coin ID")
			return
		}

		timeframe := req.URL.Query().Get("timeframe")
		if timeframe == "" {
			timeframe = "24h" // Default timeframe
		}

		history, err := r.coinService.GetCoinPriceHistory(req.Context(), coinID, timeframe)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, history)
	}
}
