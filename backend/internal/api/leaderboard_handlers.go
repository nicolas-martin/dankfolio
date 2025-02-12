package api

import (
	"net/http"
	"strconv"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

func (r *Router) handleGetLeaderboard() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		timeframe := req.URL.Query().Get("timeframe")
		if timeframe == "" {
			timeframe = "24h" // default timeframe
		}

		limit := 100 // default limit
		if limitStr := req.URL.Query().Get("limit"); limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		leaderboard, err := r.leaderboardService.GetLeaderboard(req.Context(), timeframe, limit)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, leaderboard)
	}
}

func (r *Router) handleGetUserRank() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		timeframe := req.URL.Query().Get("timeframe")
		if timeframe == "" {
			timeframe = "24h"
		}

		rank, err := r.leaderboardService.GetUserRank(req.Context(), user.ID, timeframe)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, rank)
	}
} 