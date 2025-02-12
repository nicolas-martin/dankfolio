package api

import (
	"encoding/json"
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

func (r *Router) handlePreviewTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var tradeReq model.TradeRequest
		if err := json.NewDecoder(req.Body).Decode(&tradeReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user := getUserFromContext(req.Context())
		tradeReq.UserID = user.ID

		preview, err := r.tradeService.PreviewTrade(req.Context(), tradeReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, preview)
	}
}

func (r *Router) handleExecuteTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		var tradeReq model.TradeRequest
		if err := json.NewDecoder(req.Body).Decode(&tradeReq); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user := getUserFromContext(req.Context())
		tradeReq.UserID = user.ID

		trade, err := r.tradeService.ExecuteTrade(req.Context(), tradeReq)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, trade)
	}
}

func (r *Router) handleGetTradeHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		user := getUserFromContext(req.Context())

		trades, err := r.tradeService.GetTradeHistory(req.Context(), user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		respondJSON(w, http.StatusOK, trades)
	}
}
