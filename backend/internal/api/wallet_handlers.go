package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/service/wallet"
)

// WalletHandlers handles HTTP requests for wallet operations
type WalletHandlers struct {
	walletService *wallet.Service
}

// NewWalletHandlers creates a new WalletHandlers instance
func NewWalletHandlers(walletService *wallet.Service) *WalletHandlers {
	return &WalletHandlers{
		walletService: walletService,
	}
}

// RegisterRoutes registers the wallet routes
func (h *WalletHandlers) RegisterRoutes(r chi.Router) {
	r.Post("/api/v1/wallets", h.CreateWallet)
	r.Get("/api/v1/wallets/{address}/balance", h.GetWalletBalance)
}

// CreateWallet handles wallet creation requests
func (h *WalletHandlers) CreateWallet(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement wallet creation
	http.Error(w, "Not implemented", http.StatusNotImplemented)
}

// GetWalletBalance returns the balance of a wallet
func (h *WalletHandlers) GetWalletBalance(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	if address == "" {
		http.Error(w, "Address parameter is required", http.StatusBadRequest)
		return
	}

	tokens, err := h.walletService.GetTokens(r.Context(), address)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	balanceInfo := struct {
		Tokens []wallet.TokenInfo `json:"tokens"`
	}{
		Tokens: tokens,
	}

	respondJSON(w, balanceInfo, http.StatusOK)
}
