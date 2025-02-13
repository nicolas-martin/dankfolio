package api

import (
	"net/http"

	"github.com/nicolas-martin/dankfolio/internal/service"
)

type SolanaHandlers struct {
	solanaService service.SolanaService
}

func NewSolanaHandlers(solanaService service.SolanaService) *SolanaHandlers {
	return &SolanaHandlers{
		solanaService: solanaService,
	}
}

func (h *SolanaHandlers) GetTradingPairs(w http.ResponseWriter, r *http.Request) {
	pairs, err := h.solanaService.GetTradingPairs(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, pairs)
}

func (h *SolanaHandlers) FundTestnetWallet(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserID(r.Context())
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	err := h.solanaService.FundTestnetWallet(r.Context(), user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "success"})
}
