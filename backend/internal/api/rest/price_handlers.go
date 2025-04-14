package rest

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

// PriceHandlers handles HTTP requests related to price data
type PriceHandlers struct {
	priceService *price.Service
}

// NewPriceHandlers creates a new PriceHandlers instance
func NewPriceHandlers(priceService *price.Service) *PriceHandlers {
	return &PriceHandlers{
		priceService: priceService,
	}
}

// GetPriceHistory returns price history data for a given token
func (h *PriceHandlers) GetPriceHistory(w http.ResponseWriter, r *http.Request) {
	// Get required parameters
	address := r.URL.Query().Get("address")
	if address == "" {
		respondError(w, "address is required", http.StatusBadRequest)
		return
	}

	// Get optional parameters with defaults
	addressType := r.URL.Query().Get("address_type")
	if addressType == "" {
		addressType = "token" // Default to token type
	}

	historyType := r.URL.Query().Get("type")
	if historyType == "" {
		historyType = "15m" // Default to 15-minute intervals
	}

	validTypes := map[string]string{
		"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m",
		"1h": "1H", "2h": "2H", "4h": "4H", "6h": "6H", "8h": "8H", "12h": "12H",
		"1d": "1D", "3d": "3D", "1w": "1W",
	}
	fixedType, ok := validTypes[strings.ToLower(historyType)]
	if !ok {
		respondError(w, "invalid type parameter. Must be one of: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 3D, 1W, 1M", http.StatusBadRequest)
		return
	}

	fromStr := r.URL.Query().Get("time_from")
	if fromStr == "" {
		respondError(w, "invalid time_from parameter", http.StatusBadRequest)
		return
	}

	toStr := r.URL.Query().Get("time_to")
	if toStr == "" {
		respondError(w, "invalid time_to parameter", http.StatusBadRequest)
		return
	}

	// Get price history from service
	priceHistory, err := h.priceService.GetPriceHistory(r.Context(), address, fixedType, fromStr, toStr, addressType)
	if err != nil {
		respondError(w, "Failed to get price history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, priceHistory, http.StatusOK)
}

// RegisterRoutes registers all price-related routes
func (h *PriceHandlers) RegisterRoutes(r chi.Router) {
	r.Get("/price/history", h.GetPriceHistory)
}
