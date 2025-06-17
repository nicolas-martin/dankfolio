package price

import (
	"github.com/nicolas-martin/dankfolio/backend/internal/cache"
)

// Re-export the common cache interface and constructor for this package
type PriceHistoryCache = cache.PriceHistoryCache

// NewPriceHistoryCache creates a new price history cache instance
var NewPriceHistoryCache = cache.NewPriceHistoryCache
