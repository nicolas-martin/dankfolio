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
