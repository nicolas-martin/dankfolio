package api

import (
	"encoding/json"
	"net/http"

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

type TradeRequest struct {
	CoinID string  `json:"coin_id"`
	Type   string  `json:"type"`
	Amount float64 `json:"amount"`
}

func (h *TradeHandlers) PreviewTrade(w http.ResponseWriter, r *http.Request) {
	var req TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("user_id").(string)
	if userID == "" {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	preview, err := h.tradeService.PreviewTrade(r.Context(), model.TradeRequest{
		UserID: userID,
		CoinID: req.CoinID,
		Type:   req.Type,
		Amount: req.Amount,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, preview)
}

func (h *TradeHandlers) ExecuteTrade(w http.ResponseWriter, r *http.Request) {
	var req TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("user_id").(string)
	if userID == "" {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	trade, err := h.tradeService.ExecuteTrade(r.Context(), model.TradeRequest{
		UserID: userID,
		CoinID: req.CoinID,
		Type:   req.Type,
		Amount: req.Amount,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, trade)
}

func (h *TradeHandlers) GetTradeHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	if userID == "" {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	trades, err := h.tradeService.GetTradeHistory(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, trades)
}
