package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/wallet"
)

// WalletHandlers handles HTTP requests for wallet operations
type WalletHandlers struct{}

// NewWalletHandlers creates a new WalletHandlers instance
func NewWalletHandlers() *WalletHandlers {
	return &WalletHandlers{}
}

func (h *WalletHandlers) RegisterRoutes(r chi.Router) {
	r.Post("/api/v1/wallets", h.CreateWallet)
	r.Get("/api/v1/wallets/{address}", h.GetWalletByAddress)
	r.Get("/api/v1/wallets/{address}/balance", h.GetWalletBalance)
}

// CreateWallet handles wallet creation requests
func (h *WalletHandlers) CreateWallet(w http.ResponseWriter, r *http.Request) {
	wallet, err := wallet.CreateSolanaWallet()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(wallet); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// GetWalletByAddress returns wallet information by address
func (h *WalletHandlers) GetWalletByAddress(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	if address == "" {
		http.Error(w, "Address parameter is required", http.StatusBadRequest)
		return
	}

	// In a real implementation, this would retrieve wallet data from a database
	// For now, we'll return a simplified response
	walletInfo := map[string]interface{}{
		"address":    address,
		"blockchain": "solana",
		"network":    "mainnet",
		"label":      "My Solana Wallet",
	}

	respondJSON(w, walletInfo, http.StatusOK)
}

// GetWalletBalance returns the balance of a wallet
func (h *WalletHandlers) GetWalletBalance(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	if address == "" {
		http.Error(w, "Address parameter is required", http.StatusBadRequest)
		return
	}

	// In a real implementation, this would retrieve the balance from the blockchain
	// For now, we'll return a static balance
	balanceInfo := map[string]interface{}{
		"address": address,
		"balances": []map[string]interface{}{
			{
				"coin_id":   "So11111111111111111111111111111111111111112",
				"symbol":    "SOL",
				"amount":    0.523,
				"usd_value": 78.45,
			},
			{
				"coin_id":   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
				"symbol":    "USDC",
				"amount":    125.0,
				"usd_value": 125.0,
			},
		},
		"total_usd_value": 203.45,
	}

	respondJSON(w, balanceInfo, http.StatusOK)
}
