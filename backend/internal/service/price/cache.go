package price

import (
	"github.com/nicolas-martin/dankfolio/backend/internal/cache"
)

type PriceHistoryCache = cache.PriceHistoryCache

// NewPriceHistoryCache creates a new price history cache instance
var NewPriceHistoryCache = cache.NewPriceHistoryCache
