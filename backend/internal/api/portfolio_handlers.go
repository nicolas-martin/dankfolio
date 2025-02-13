package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type PortfolioHandlers struct {
	portfolioService service.PortfolioService
}

func NewPortfolioHandlers(portfolioService service.PortfolioService) *PortfolioHandlers {
	return &PortfolioHandlers{
		portfolioService: portfolioService,
	}
}

func (h *PortfolioHandlers) GetPortfolioStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	stats, err := h.portfolioService.GetPortfolioStats(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

func (h *PortfolioHandlers) GetPortfolio(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	portfolio, err := h.portfolioService.GetPortfolioStats(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, portfolio)
}

func (h *PortfolioHandlers) GetPortfolioHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	timeframe := chi.URLParam(r, "timeframe")
	if timeframe == "" {
		timeframe = "24h"
	}

	history, err := h.portfolioService.GetPortfolioHistory(r.Context(), userID, timeframe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, history)
}
