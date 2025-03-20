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
	r.Post("/wallets", h.CreateWallet)
	r.Get("/wallets/{address}/balance", h.GetWalletBalance)
}

// CreateWallet handles wallet creation requests
func (h *WalletHandlers) CreateWallet(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement wallet creation
	respondError(w, "Not implemented", http.StatusNotImplemented)
}

// GetWalletBalance returns the balance of a wallet
func (h *WalletHandlers) GetWalletBalance(w http.ResponseWriter, r *http.Request) {
	address := chi.URLParam(r, "address")
	if address == "" {
		respondError(w, "Address parameter is required", http.StatusBadRequest)
		return
	}

	tokens, err := h.walletService.GetTokens(r.Context(), address)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Initialize tokens as empty array if nil
	if tokens == nil {
		tokens = []wallet.TokenInfo{}
	}

	type WalletBalance struct {
		Tokens []wallet.TokenInfo `json:"tokens"`
	}

	balanceInfo := WalletBalance{
		Tokens: tokens,
	}

	respondJSON(w, balanceInfo, http.StatusOK)
}
