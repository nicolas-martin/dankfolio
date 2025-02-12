package api

import (
	"encoding/json"
	"net/http"

	"github.com/nicolas-martin/meme-coin-trader/internal/model"
)

func (r *Router) handleGetWallet() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		wallet, err := r.walletService.GetWallet(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, wallet)
	}
}

func (r *Router) handleInitiateDeposit() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		var depositReq model.DepositRequest
		if err := json.NewDecoder(req.Body).Decode(&depositReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		depositInfo, err := r.walletService.InitiateDeposit(req.Context(), user.ID, depositReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, depositInfo)
	}
}

func (r *Router) handleInitiateWithdrawal() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		var withdrawalReq model.WithdrawalRequest
		if err := json.NewDecoder(req.Body).Decode(&withdrawalReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		// Validate withdrawal amount
		if err := r.walletService.ValidateWithdrawal(req.Context(), user.ID, withdrawalReq.Amount); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		withdrawalInfo, err := r.walletService.InitiateWithdrawal(req.Context(), user.ID, withdrawalReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, withdrawalInfo)
	}
}

func (r *Router) handleGetTransactionHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "User not found")
			return
		}

		txType := req.URL.Query().Get("type") // "deposit" or "withdrawal"
		limit := 50 // Default limit
		if limitStr := req.URL.Query().Get("limit"); limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
				limit = parsedLimit
			}
		}

		history, err := r.walletService.GetTransactionHistory(req.Context(), user.ID, txType, limit)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, history)
	}
} 