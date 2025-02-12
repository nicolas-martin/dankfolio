package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

func (r *Router) handleGetPortfolio() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		portfolio, err := r.portfolioService.GetPortfolio(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, portfolio)
	}
}

func (r *Router) handleGetPortfolioHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		timeframe := req.URL.Query().Get("timeframe")
		if timeframe == "" {
			timeframe = "month" // default timeframe
		}

		history, err := r.portfolioService.GetPortfolioHistory(req.Context(), user.ID, timeframe)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, history)
	}
}

func (r *Router) handleGetPortfolioStats() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		stats, err := r.portfolioService.GetPortfolioStats(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, stats)
	}
} 