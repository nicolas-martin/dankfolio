package api

import (
	"context"
	"encoding/json"
	"fmt"
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
	r.Get("/trades/quote", h.GetTradeQuote)
	r.Post("/trades/execute", h.ExecuteTrade)
	r.Get("/trades/{id}", h.GetTradeByID)
	r.Get("/trades", h.ListTrades)
}

// ExecuteTrade handles a trade execution request
func (h *TradeHandlers) ExecuteTrade(w http.ResponseWriter, r *http.Request) {
	var req model.TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.FromCoinID == "" {
		http.Error(w, "from_coin_id is required", http.StatusBadRequest)
		return
	}
	if req.ToCoinID == "" {
		http.Error(w, "to_coin_id is required", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		http.Error(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}
	if req.SignedTransaction == "" {
		http.Error(w, "signed_transaction is required", http.StatusBadRequest)
		return
	}

	// Check for debug header
	ctx := r.Context()
	if r.Header.Get("X-Debug-Mode") == "true" {
		ctx = context.WithValue(ctx, "debug_mode", true)
	}

	trade, err := h.tradeService.ExecuteTrade(ctx, req)
	if err != nil {
		log.Printf("Error executing trade: %v", err)
		http.Error(w, "Failed to execute trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Log the trade details for debugging
	log.Printf("Trade executed successfully: ID=%s, Status=%s", trade.ID, trade.Status)
	log.Printf("🔍 View transaction on Solscan: https://solscan.io/tx/%s", trade.TransactionHash)
	log.Printf("✅ Transaction verified and stored in trade record")

	response := map[string]interface{}{
		"status":           trade.Status,
		"trade_id":         trade.ID,
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
	log.Printf("GetTradeQuote handler called with URL: %s", r.URL.String())
	fromCoinID := r.URL.Query().Get("from_coin_id")
	toCoinID := r.URL.Query().Get("to_coin_id")
	amountStr := r.URL.Query().Get("amount")

	log.Printf("Quote request params: fromCoinID=%s, toCoinID=%s, amount=%s", fromCoinID, toCoinID, amountStr)

	// SOL is the default currency if not specified
	if fromCoinID == "" {
		fromCoinID = "So11111111111111111111111111111111111111112" // SOL mint address
		log.Printf("Using default currency SOL for from_coin_id")
	}

	if toCoinID == "" || amountStr == "" {
		log.Printf("Missing required parameters: toCoinID=%s, amount=%s", toCoinID, amountStr)
		http.Error(w, "Missing required parameters. from_coin_id=SOL by default, but to_coin_id and amount are required", http.StatusBadRequest)
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		log.Printf("Invalid amount parameter: %s, error: %v", amountStr, err)
		http.Error(w, "Invalid amount parameter", http.StatusBadRequest)
		return
	}

	// Get quote from service
	quote, err := h.tradeService.GetTradeQuote(r.Context(), fromCoinID, toCoinID, amount)
	if err != nil {
		log.Printf("Error getting trade quote: %v", err)
		respondError(w, fmt.Sprintf("Failed to get trade quote: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully retrieved quote: %+v", quote)
	respondJSON(w, quote, http.StatusOK)
}
