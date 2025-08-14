package coin

import (
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/cache"
)

// Re-export the common cache interface and constructor for this package
type CoinCache = cache.CoinCache

const CoinCacheExpiry = 2 * time.Minute

// NewCoinCache creates a new coin cache instance
var NewCoinCache = cache.NewCoinCache
