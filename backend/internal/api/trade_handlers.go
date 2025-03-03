package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
)

// TradeHandlers handles HTTP requests related to trades
type TradeHandlers struct {
	tradeService *trade.Service
}

// NewTradeHandlers creates a new TradeHandlers instance
func NewTradeHandlers(tradeService *trade.Service) *TradeHandlers {
	return &TradeHandlers{tradeService: tradeService}
}

// RegisterRoutes registers all trade-related routes
func (h *TradeHandlers) RegisterRoutes(r chi.Router) {
	r.Post("/api/v1/trades/execute", h.ExecuteTrade)
	r.Get("/api/v1/trades/{id}", h.GetTradeByID)
	r.Get("/api/v1/trades", h.ListTrades)
	r.Get("/api/v1/trades/quote", h.GetTradeQuote)
}

// ExecuteTrade handles a trade execution request
func (h *TradeHandlers) ExecuteTrade(w http.ResponseWriter, r *http.Request) {
	var req model.TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.FromCoinID == "" || req.ToCoinID == "" {
		http.Error(w, "Both from_coin_id and to_coin_id are required", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	trade, err := h.tradeService.ExecuteTrade(r.Context(), req)
	if err != nil {
		log.Printf("Error executing trade: %v", err)
		http.Error(w, "Failed to execute trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"trade_id":         trade.ID,
		"status":           trade.Status,
		"transaction_hash": trade.TransactionHash,
	}

	// Use respondJSON helper
	respondJSON(w, response, http.StatusCreated)
}

// GetTradeByID returns a trade by its ID
func (h *TradeHandlers) GetTradeByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	trade, err := h.tradeService.GetTradeByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Trade not found", http.StatusNotFound)
		return
	}

	respondJSON(w, trade, http.StatusOK)
}

// ListTrades returns all trades
func (h *TradeHandlers) ListTrades(w http.ResponseWriter, r *http.Request) {
	trades, err := h.tradeService.ListTrades(r.Context())
	if err != nil {
		http.Error(w, "Failed to list trades", http.StatusInternalServerError)
		return
	}

	respondJSON(w, trades, http.StatusOK)
}

// GetTradeQuote returns a quote for a trade with estimated amount and fees
func (h *TradeHandlers) GetTradeQuote(w http.ResponseWriter, r *http.Request) {
	fromCoinID := r.URL.Query().Get("from_coin_id")
	toCoinID := r.URL.Query().Get("to_coin_id")
	amountStr := r.URL.Query().Get("amount")

	if fromCoinID == "" || toCoinID == "" || amountStr == "" {
		http.Error(w, "Missing required parameters", http.StatusBadRequest)
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		http.Error(w, "Invalid amount parameter", http.StatusBadRequest)
		return
	}

	// Get quote from service
	quote, err := h.tradeService.GetTradeQuote(r.Context(), fromCoinID, toCoinID, amount)
	if err != nil {
		log.Printf("Error getting trade quote: %v", err)
		http.Error(w, "Failed to get trade quote: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, quote, http.StatusOK)
}
