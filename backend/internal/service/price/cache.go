package price

import (
	"github.com/nicolas-martin/dankfolio/backend/internal/service"
)

// Re-export the common cache interface and constructor for this package
type PriceHistoryCache = service.PriceHistoryCache

// NewPriceHistoryCache creates a new price history cache instance
var NewPriceHistoryCache = service.NewPriceHistoryCache
