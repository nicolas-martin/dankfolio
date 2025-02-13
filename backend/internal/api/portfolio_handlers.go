package api

import (
	"net/http"
	"time"
)

func (r *Router) handleGetPortfolio() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		portfolio, err := (*r.portfolioService).GetPortfolio(req.Context(), user.ID)
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
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		timeframe := req.URL.Query().Get("timeframe")
		if timeframe == "" {
			timeframe = "24h" // Default timeframe
		}

		history, err := (*r.portfolioService).GetPortfolioHistory(req.Context(), user.ID, timeframe)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, history)
	}
}

func getStartTimeForTimeframe(timeframe string) time.Time {
	now := time.Now()
	switch timeframe {
	case "24h":
		return now.Add(-24 * time.Hour)
	case "7d":
		return now.AddDate(0, 0, -7)
	case "30d":
		return now.AddDate(0, 0, -30)
	case "90d":
		return now.AddDate(0, 0, -90)
	case "1y":
		return now.AddDate(-1, 0, 0)
	default:
		return time.Time{}
	}
}

func (r *Router) handleGetPortfolioStats() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		stats, err := (*r.portfolioService).GetPortfolioStats(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, stats)
	}
}
