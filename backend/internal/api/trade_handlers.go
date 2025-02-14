package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type TradeHandlers struct {
	tradeService *service.TradeService
}

func NewTradeHandlers(tradeService *service.TradeService) *TradeHandlers {
	return &TradeHandlers{
		tradeService: tradeService,
	}
}

func (h *TradeHandlers) RegisterRoutes(r chi.Router) {
	r.Post("/trades/preview", h.PreviewTrade)
	r.Post("/trades/execute", h.ExecuteTrade)
	r.Get("/trades/{id}", h.GetTradeByID)
	r.Get("/trades", h.ListTrades)
}

func (h *TradeHandlers) PreviewTrade(w http.ResponseWriter, r *http.Request) {
	var req model.TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	preview, err := h.tradeService.PreviewTrade(r.Context(), req)
	if err != nil {
		respondError(w, "Failed to preview trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, preview, http.StatusOK)
}

func (h *TradeHandlers) ExecuteTrade(w http.ResponseWriter, r *http.Request) {
	var req model.TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	trade, err := h.tradeService.ExecuteTrade(r.Context(), req)
	if err != nil {
		respondError(w, "Failed to execute trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"trade_id":         trade.ID,
			"transaction_hash": trade.TransactionHash,
			"status":           trade.Status,
			"type":             trade.Type,
			"amount":           trade.Amount,
			"coin_id":          trade.CoinID,
			"explorer_url":     "https://explorer.solana.com/tx/" + trade.TransactionHash + "?cluster=devnet",
		},
	}

	respondJSON(w, response, http.StatusOK)
}

func (h *TradeHandlers) GetTradeByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	trade, err := h.tradeService.GetTradeByID(r.Context(), id)
	if err != nil {
		respondError(w, "Trade not found: "+err.Error(), http.StatusNotFound)
		return
	}

	respondJSON(w, trade, http.StatusOK)
}

func (h *TradeHandlers) ListTrades(w http.ResponseWriter, r *http.Request) {
	trades, err := h.tradeService.ListTrades(r.Context())
	if err != nil {
		respondError(w, "Failed to list trades: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, trades, http.StatusOK)
}
