package api

import (
	"net/http"

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
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	stats, err := h.portfolioService.GetPortfolioStats(r.Context(), user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

func (h *PortfolioHandlers) GetPortfolioHistory(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	timeframe := r.URL.Query().Get("timeframe")
	if timeframe == "" {
		timeframe = "24h"
	}

	history, err := h.portfolioService.GetPortfolioHistory(r.Context(), user.ID, timeframe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, history)
}
