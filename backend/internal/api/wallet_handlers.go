package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type WalletHandlers struct {
	walletService *service.WalletService
}

func NewWalletHandlers(walletService *service.WalletService) *WalletHandlers {
	return &WalletHandlers{
		walletService: walletService,
	}
}

func (h *WalletHandlers) RegisterRoutes(r chi.Router) {
	r.Route("/wallets", func(r chi.Router) {
		r.Post("/", h.CreateWallet)
		r.Get("/{userID}", h.GetWallet)
		r.Post("/{userID}/deposit", h.CreateDeposit)
		r.Post("/{userID}/withdraw", h.RequestWithdrawal)
		r.Get("/{userID}/transactions", h.GetTransactionHistory)
	})
}

func (h *WalletHandlers) CreateWallet(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	wallet, err := h.walletService.CreateWallet(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, wallet, http.StatusCreated)
}

func (h *WalletHandlers) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	wallet, err := h.walletService.GetWallet(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	respondJSON(w, wallet, http.StatusOK)
}

func (h *WalletHandlers) CreateDeposit(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	var req model.DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := h.walletService.CreateDeposit(r.Context(), userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, tx, http.StatusCreated)
}

func (h *WalletHandlers) RequestWithdrawal(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	var req model.WithdrawalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.walletService.RequestWithdrawal(r.Context(), userID, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

func (h *WalletHandlers) GetTransactionHistory(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	txType := r.URL.Query().Get("type")
	limit := 50 // Default limit

	transactions, err := h.walletService.GetTransactionHistory(r.Context(), userID, txType, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, transactions, http.StatusOK)
}
