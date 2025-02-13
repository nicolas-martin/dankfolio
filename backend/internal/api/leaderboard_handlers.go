package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type LeaderboardHandlers struct {
	leaderboardService *service.LeaderboardService
}

func NewLeaderboardHandlers(leaderboardService *service.LeaderboardService) *LeaderboardHandlers {
	return &LeaderboardHandlers{
		leaderboardService: leaderboardService,
	}
}

func (h *LeaderboardHandlers) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	timeframe := chi.URLParam(r, "timeframe")
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 10 // default limit
	}

	leaderboard, err := h.leaderboardService.GetLeaderboard(r.Context(), timeframe, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, leaderboard)
}

func (h *LeaderboardHandlers) GetUserRank(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	timeframe := chi.URLParam(r, "timeframe")
	rank, err := h.leaderboardService.GetUserRank(r.Context(), user.ID, timeframe)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, rank)
}

func (r *Router) handleGetLeaderboard() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		timeframe := chi.URLParam(req, "timeframe")
		if timeframe == "" {
			timeframe = "all" // Default to all-time
		}

		limit := 10 // Default limit
		if limitStr := req.URL.Query().Get("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
		}

		leaderboard, err := r.leaderboardService.GetLeaderboard(req.Context(), timeframe, limit)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get leaderboard: %v", err))
			return
		}

		respondJSON(w, http.StatusOK, leaderboard)
	}
}

func (r *Router) handleGetUserRank() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		timeframe := chi.URLParam(req, "timeframe")
		if timeframe == "" {
			timeframe = "all" // Default to all-time
		}

		rank, err := r.leaderboardService.GetUserRank(req.Context(), user.ID, timeframe)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get user rank: %v", err))
			return
		}

		respondJSON(w, http.StatusOK, rank)
	}
}
