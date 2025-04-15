package rest

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	solanaService "github.com/nicolas-martin/dankfolio/backend/internal/service/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
)

// TradeHandlers handles HTTP requests related to trades
type TradeHandlers struct {
	tradeService  *trade.Service
	solanaService *solanaService.SolanaTradeService
}

// NewTradeHandlers creates a new TradeHandlers instance
func NewTradeHandlers(tradeService *trade.Service, solanaService *solanaService.SolanaTradeService) *TradeHandlers {
	return &TradeHandlers{
		tradeService:  tradeService,
		solanaService: solanaService,
	}
}

// TransferRequest represents a token transfer request
type TransferRequest struct {
	FromAddress string  `json:"fromAddress"`
	ToAddress   string  `json:"toAddress"`
	TokenMint   string  `json:"tokenMint"` // Optional, empty for SOL
	Amount      float64 `json:"amount"`
}

// TransferPrepareResponse represents the response for preparing a transfer
type TransferPrepareResponse struct {
	UnsignedTransaction string `json:"unsignedTransaction"`
}

// TransferSubmitRequest represents a request to submit a signed transfer transaction
type TransferSubmitRequest struct {
	SignedTransaction string `json:"signedTransaction"`
}

// TransferResponse represents a token transfer response
type TransferResponse struct {
	TransactionHash string `json:"transactionHash"`
}

// RegisterRoutes registers all trade-related routes
func (h *TradeHandlers) RegisterRoutes(r chi.Router) {
	r.Get("/trades/quote", h.GetTradeQuote)
	r.Get("/trades/{id}", h.GetTradeByID)
	r.Get("/trades", h.ListTrades)
	r.Post("/trades/submit", h.SubmitTrade)
	r.Get("/trades/status/{txHash}", h.GetTradeStatus)
	r.Get("/tokens/prices", h.GetTokenPrices)
	r.Post("/transfer/prepare", h.PrepareTransfer)
	r.Post("/transfer/submit", h.SubmitTransfer)
}

// SubmitTrade handles a trade submission request, returning the tx hash immediately
func (h *TradeHandlers) SubmitTrade(w http.ResponseWriter, r *http.Request) {
	var req model.TradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.FromCoinID == "" {
		respondError(w, "from_coin_id is required", http.StatusBadRequest)
		return
	}
	if req.ToCoinID == "" {
		respondError(w, "to_coin_id is required", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		respondError(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}
	if req.SignedTransaction == "" {
		respondError(w, "signed_transaction is required", http.StatusBadRequest)
		return
	}

	// Check for debug header
	ctx := r.Context()
	if r.Header.Get("x-debug-mode") == "true" {
		ctx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	trade, err := h.tradeService.ExecuteTrade(ctx, req)
	if err != nil {
		log.Printf("Error submitting trade: %v", err)
		respondError(w, "Failed to submit trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Trade submitted successfully: ID=%s, Status=%s, TxHash=%s", trade.ID, trade.Status, trade.TransactionHash)
	log.Printf("🔍 View transaction on Solscan: https://solscan.io/tx/%s?cluster=devnet", trade.TransactionHash)

	response := map[string]interface{}{
		"trade_id":         trade.ID,
		"transaction_hash": trade.TransactionHash,
	}

	respondJSON(w, response, http.StatusOK)
}

// GetTradeStatus handles requests to check the confirmation status of a transaction
func (h *TradeHandlers) GetTradeStatus(w http.ResponseWriter, r *http.Request) {
	txHash := chi.URLParam(r, "txHash")
	if txHash == "" {
		respondError(w, "Transaction hash is required", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 Checking status for transaction hash: %s", txHash)
	ctx := r.Context()
	if r.Header.Get("x-debug-mode") == "true" {
		ctx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	statusResult, err := h.solanaService.GetTransactionConfirmationStatus(ctx, txHash)
	if err != nil {
		log.Printf("Error checking transaction status for %s: %v", txHash, err)
		respondError(w, fmt.Sprintf("Failed to get transaction status: %v", err), http.StatusInternalServerError)
		return
	}

	if statusResult == nil || len(statusResult.Value) == 0 || statusResult.Value[0] == nil {
		log.Printf("⏳ Transaction %s status: Not found or pending", txHash)
		response := map[string]interface{}{
			"transaction_hash": txHash,
			"status":           "Pending",
			"confirmations":    0,
		}
		respondJSON(w, response, http.StatusOK)
		return
	}

	status := statusResult.Value[0]
	confirmations := uint64(0)
	if status.Confirmations != nil {
		confirmations = *status.Confirmations
	}
	confirmationStatus := status.ConfirmationStatus

	log.Printf("✅ Transaction %s status: %s, Confirmations: %d", txHash, confirmationStatus, confirmations)

	// Only include error field if there's an actual error
	var errorValue interface{} = nil
	if status.Err != nil {
		errorStr := fmt.Sprintf("%v", status.Err)
		if errorStr != "<nil>" {
			errorValue = errorStr
		}
	}

	response := map[string]interface{}{
		"transaction_hash": txHash,
		"status":           confirmationStatus,
		"confirmations":    confirmations,
		"finalized":        confirmationStatus == rpc.ConfirmationStatusFinalized,
		"error":            errorValue,
	}

	respondJSON(w, response, http.StatusOK)
}

// GetTradeByID returns a trade by its ID
func (h *TradeHandlers) GetTradeByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	trade, err := h.tradeService.GetTradeByID(r.Context(), id)
	if err != nil {
		respondError(w, "Trade not found", http.StatusNotFound)
		return
	}

	respondJSON(w, trade, http.StatusOK)
}

// ListTrades returns all trades
func (h *TradeHandlers) ListTrades(w http.ResponseWriter, r *http.Request) {
	trades, err := h.tradeService.ListTrades(r.Context())
	if err != nil {
		respondError(w, "Failed to list trades", http.StatusInternalServerError)
		return
	}

	respondJSON(w, trades, http.StatusOK)
}

// GetTradeQuote returns a quote for a trade
func (h *TradeHandlers) GetTradeQuote(w http.ResponseWriter, r *http.Request) {
	// Extract and validate query parameters
	fromCoinID := r.URL.Query().Get("from_coin_id")
	toCoinID := r.URL.Query().Get("to_coin_id")
	amountStr := r.URL.Query().Get("amount")

	if fromCoinID == "" || toCoinID == "" || amountStr == "" {
		respondError(w, "Missing required parameters: from_coin_id, to_coin_id, amount", http.StatusBadRequest)
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		respondError(w, "Invalid amount parameter", http.StatusBadRequest)
		return
	}

	if amount <= 0 {
		respondError(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	// Check for debug header
	ctx := r.Context()
	if r.Header.Get("x-debug-mode") == "true" {
		ctx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	// Get quote from service
	quote, err := h.tradeService.GetTradeQuote(ctx, fromCoinID, toCoinID, amountStr, "0.05")
	if err != nil {
		respondError(w, fmt.Sprintf("Failed to get trade quote: %v", err), http.StatusInternalServerError)
		return
	}

	respondJSON(w, quote, http.StatusOK)
}

// GetTokenPrices returns prices for multiple tokens
func (h *TradeHandlers) GetTokenPrices(w http.ResponseWriter, r *http.Request) {
	tokenIDs := r.URL.Query()["token_ids"]
	if len(tokenIDs) == 0 {
		respondError(w, "No token IDs provided", http.StatusBadRequest)
		return
	}

	prices, err := h.tradeService.GetTokenPrices(r.Context(), tokenIDs)
	if err != nil {
		respondError(w, fmt.Sprintf("Failed to get token prices: %v", err), http.StatusInternalServerError)
		return
	}

	respondJSON(w, prices, http.StatusOK)
}

// PrepareTransfer prepares an unsigned transfer transaction
func (h *TradeHandlers) PrepareTransfer(w http.ResponseWriter, r *http.Request) {
	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.FromAddress == "" || req.ToAddress == "" {
		respondError(w, "From and To addresses are required", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		respondError(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	// Call service to prepare transfer
	unsignedTx, err := h.solanaService.CreateTransferTransaction(r.Context(), req.FromAddress, req.ToAddress, req.TokenMint, req.Amount)
	if err != nil {
		respondError(w, fmt.Sprintf("Failed to prepare transfer: %v", err), http.StatusInternalServerError)
		return
	}

	response := TransferPrepareResponse{
		UnsignedTransaction: unsignedTx,
	}
	respondJSON(w, response, http.StatusOK)
}

// SubmitTransfer submits a signed transfer transaction
func (h *TradeHandlers) SubmitTransfer(w http.ResponseWriter, r *http.Request) {
	var req TransferSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SignedTransaction == "" {
		respondError(w, "Signed transaction is required", http.StatusBadRequest)
		return
	}

	// Submit the signed transaction
	sig, err := h.solanaService.ExecuteSignedTransaction(r.Context(), req.SignedTransaction)
	if err != nil {
		respondError(w, fmt.Sprintf("Failed to submit transfer: %v", err), http.StatusInternalServerError)
		return
	}

	response := TransferResponse{
		TransactionHash: sig.String(),
	}
	respondJSON(w, response, http.StatusOK)
}
