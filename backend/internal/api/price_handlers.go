package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/service/price"
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

	// Validate history type
	validTypes := map[string]bool{
		"1m": true, "3m": true, "5m": true, "15m": true, "30m": true,
		"1H": true, "2H": true, "4H": true, "6H": true, "8H": true, "12H": true,
		"1D": true, "3D": true, "1W": true, "1M": true,
	}
	if _, ok := validTypes[historyType]; !ok {
		respondError(w, "invalid type parameter. Must be one of: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 3D, 1W, 1M", http.StatusBadRequest)
		return
	}

	// Get time parameters with defaults
	timeFrom := time.Now().Add(-24 * time.Hour).Unix() // Default to last 24 hours
	timeTo := time.Now().Unix()                        // Default to current time

	if fromStr := r.URL.Query().Get("time_from"); fromStr != "" {
		if tf, err := strconv.ParseInt(fromStr, 10, 64); err == nil {
			timeFrom = tf
		} else {
			respondError(w, "invalid time_from parameter", http.StatusBadRequest)
			return
		}
	}

	if toStr := r.URL.Query().Get("time_to"); toStr != "" {
		if tt, err := strconv.ParseInt(toStr, 10, 64); err == nil {
			timeTo = tt
		} else {
			respondError(w, "invalid time_to parameter", http.StatusBadRequest)
			return
		}
	}

	// Validate time range
	if timeFrom >= timeTo {
		respondError(w, "time_from must be less than time_to", http.StatusBadRequest)
		return
	}

	// Get price history from service
	priceHistory, err := h.priceService.GetPriceHistory(r.Context(), address, historyType, timeFrom, timeTo, addressType)
	if err != nil {
		respondError(w, "Failed to get price history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, priceHistory, http.StatusOK)
}
