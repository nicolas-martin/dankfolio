package api

import (
	"encoding/json"
	"net/http"

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

type DepositRequest struct {
	Amount      float64 `json:"amount"`
	PaymentType string  `json:"payment_type"`
}

type WithdrawRequest struct {
	Amount             float64 `json:"amount"`
	DestinationAddress string  `json:"destination_address"`
}

func (h *WalletHandlers) GetWallet(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	wallet, err := h.walletService.GetWallet(r.Context(), user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, wallet)
}

func (h *WalletHandlers) Deposit(w http.ResponseWriter, r *http.Request) {
	var req DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	depositReq := &model.DepositRequest{
		Amount:      req.Amount,
		PaymentType: req.PaymentType,
	}

	deposit, err := h.walletService.InitiateDeposit(r.Context(), user.ID, depositReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, deposit)
}

func (h *WalletHandlers) Withdraw(w http.ResponseWriter, r *http.Request) {
	var req WithdrawRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	withdrawalReq := &model.WithdrawalRequest{
		Amount:             req.Amount,
		DestinationAddress: req.DestinationAddress,
	}

	withdrawal, err := h.walletService.InitiateWithdrawal(r.Context(), user.ID, withdrawalReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, withdrawal)
}
