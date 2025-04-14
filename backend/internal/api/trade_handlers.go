package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gagliardetto/solana-go/rpc" // Added for ConfirmationStatusFinalized
	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/model"
	solanaService "github.com/nicolas-martin/dankfolio/internal/service/solana" // Renamed import for clarity
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
)

// TODO: Confirm if SolanaTradeService needs to be injected separately or if trade.Service exposes it.
// Assuming trade.Service provides access for now.

// TradeHandlers handles HTTP requests related to trades
type TradeHandlers struct {
	tradeService  *trade.Service
	solanaService *solanaService.SolanaTradeService // Added Solana service
}

// NewTradeHandlers creates a new TradeHandlers instance
func NewTradeHandlers(tradeService *trade.Service, solanaService *solanaService.SolanaTradeService) *TradeHandlers {
	return &TradeHandlers{
		tradeService:  tradeService,
		solanaService: solanaService, // Inject Solana service
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
	r.Post("/trades/submit", h.SubmitTrade)            // Renamed route and handler
	r.Get("/trades/status/{txHash}", h.GetTradeStatus) // New route for status check
	r.Get("/tokens/prices", h.GetTokenPrices)
	r.Post("/transfer/prepare", h.PrepareTransfer) // New route for preparing transfers
	r.Post("/transfer/submit", h.SubmitTransfer)   // New route for submitting signed transfers
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
	if r.Header.Get("X-Debug-Mode") == "true" {
		ctx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	// Assuming tradeService.SubmitTrade now only submits and returns the hash
	// Or potentially call a Solana-specific method if tradeService doesn't wrap it directly
	// Let's assume tradeService is updated or we call solana service method here.
	// For now, let's modify the call to reflect the expected behavior (returning hash)
	// This might require adjusting the trade.Service interface/implementation
	trade, err := h.tradeService.ExecuteTrade(ctx, req) // Keep existing call for now, assuming it's adapted
	if err != nil {
		log.Printf("Error submitting trade: %v", err)
		respondError(w, "Failed to submit trade: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Log the submission details
	log.Printf("Trade submitted successfully: ID=%s, Status=%s, TxHash=%s", trade.ID, trade.Status, trade.TransactionHash)
	log.Printf("🔍 View transaction on Solscan: https://solscan.io/tx/%s?cluster=devnet", trade.TransactionHash) // Add cluster if needed

	response := map[string]interface{}{
		// Return only the necessary info for immediate feedback
		"trade_id":         trade.ID, // Optional, maybe just return hash
		"transaction_hash": trade.TransactionHash,
	}

	// Use respondJSON helper
	respondJSON(w, response, http.StatusOK) // Changed status to OK as it's just submission ack
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
	if r.Header.Get("X-Debug-Mode") == "true" {
		ctx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	// Assuming tradeService provides access to the Solana service's status check method
	// This might require adding GetTransactionConfirmationStatus to the trade.Service interface
	// or injecting SolanaTradeService directly into TradeHandlers.
	// Call the method directly on the injected Solana service
	statusResult, err := h.solanaService.GetTransactionConfirmationStatus(ctx, txHash)
	if err != nil {
		// Distinguish between 'not found yet' and actual errors
		// The service layer returns (nil, nil) if not found yet.
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

	// Extract relevant info from the status result
	status := statusResult.Value[0]
	confirmations := uint64(0)
	if status.Confirmations != nil {
		confirmations = *status.Confirmations
	}
	confirmationStatus := status.ConfirmationStatus

	log.Printf("✅ Transaction %s status: %s, Confirmations: %d", txHash, confirmationStatus, confirmations)

	response := map[string]interface{}{
		"transaction_hash": txHash,
		"status":           confirmationStatus,
		"confirmations":    confirmations,
		"finalized":        confirmationStatus == rpc.ConfirmationStatusFinalized, // Use imported rpc package constant
		"error":            status.Err,                                            // Include error if present
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

// GetTradeQuote returns a quote for a trade with estimated amount and fees
func (h *TradeHandlers) GetTradeQuote(w http.ResponseWriter, r *http.Request) {
	log.Printf("GetTradeQuote handler called with URL: %s", r.URL.String())
	fromCoinID := r.URL.Query().Get("from_coin_id")
	toCoinID := r.URL.Query().Get("to_coin_id")
	amountStr := r.URL.Query().Get("amount")
	slippageBspStr := r.URL.Query().Get("slippageBps")

	log.Printf("Quote request params: fromCoinID=%s, toCoinID=%s, amount=%s, slippageBsp=%s", fromCoinID, toCoinID, amountStr, slippageBspStr)

	var slippageBsp int64
	if slippageBspStr != "" {
		var err error
		slippageBsp, err = strconv.ParseInt(slippageBspStr, 10, 64)
		if err != nil {
			respondError(w, "Invalid bsp parameter", http.StatusBadRequest)
			return
		}
	}
	if slippageBsp <= 0 {
		slippageBspStr = "100"
	}

	// SOL is the default currency if not specified
	if fromCoinID == "" {
		fromCoinID = "So11111111111111111111111111111111111111112" // SOL mint address
		log.Printf("Using default currency SOL for from_coin_id")
	}

	if toCoinID == "" || amountStr == "" {
		log.Printf("Missing required parameters: toCoinID=%s, amount=%s", toCoinID, amountStr)
		respondError(w, "Missing required parameters. from_coin_id=SOL by default, but to_coin_id and amount are required", http.StatusBadRequest)
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		respondError(w, "Invalid amount parameter", http.StatusBadRequest)
		return
	}
	if amount <= 0 {
		respondError(w, "Amount cannot be 0", http.StatusBadRequest)
		return
	}

	// Get quote from service
	quote, err := h.tradeService.GetTradeQuote(r.Context(), fromCoinID, toCoinID, amountStr, slippageBspStr)
	if err != nil {
		log.Printf("Error getting trade quote: %v", err)
		respondError(w, fmt.Sprintf("Failed to get trade quote: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully retrieved quote: %+v", quote)
	respondJSON(w, quote, http.StatusOK)
}

// GetTokenPrices returns prices for multiple tokens
// NOTE: This handler remains unchanged by the refactoring.
func (h *TradeHandlers) GetTokenPrices(w http.ResponseWriter, r *http.Request) {
	// Parse token addresses from query param
	tokenAddresses := r.URL.Query()["ids"]
	if len(tokenAddresses) == 0 {
		respondError(w, "No ids provided", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 Getting prices for tokens: %v", tokenAddresses)

	// Get prices from Jupiter
	prices, err := h.tradeService.GetTokenPrices(r.Context(), tokenAddresses)
	if err != nil {
		log.Printf("❌ Error getting token prices: %v", err)
		respondError(w, fmt.Sprintf("Failed to get token prices: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Successfully retrieved prices for %d tokens", len(prices))
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
	if req.FromAddress == "" || req.ToAddress == "" || req.Amount <= 0 {
		respondError(w, "Missing required fields or invalid amount", http.StatusBadRequest)
		return
	}

	// Create unsigned transaction
	unsignedTx, err := h.solanaService.CreateTransferTransaction(r.Context(), solanaService.TransferParams{
		FromAddress: req.FromAddress,
		ToAddress:   req.ToAddress,
		TokenMint:   req.TokenMint,
		Amount:      req.Amount,
	})
	if err != nil {
		log.Printf("Failed to create transfer transaction: %v", err)
		respondError(w, fmt.Sprintf("Failed to create transfer transaction: %v", err), http.StatusInternalServerError)
		return
	}

	respondJSON(w, TransferPrepareResponse{
		UnsignedTransaction: unsignedTx,
	}, http.StatusOK)
}

// SubmitTransfer submits a signed transfer transaction
func (h *TradeHandlers) SubmitTransfer(w http.ResponseWriter, r *http.Request) {
	var req TransferSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.SignedTransaction == "" {
		respondError(w, "Signed transaction is required", http.StatusBadRequest)
		return
	}

	// Execute the signed transaction
	sig, err := h.solanaService.ExecuteSignedTransaction(r.Context(), req.SignedTransaction)
	if err != nil {
		log.Printf("Failed to execute transfer: %v", err)
		respondError(w, fmt.Sprintf("Failed to execute transfer: %v", err), http.StatusInternalServerError)
		return
	}

	respondJSON(w, TransferResponse{
		TransactionHash: sig.String(),
	}, http.StatusOK)
}
