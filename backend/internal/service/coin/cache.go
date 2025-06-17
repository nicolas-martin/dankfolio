package coin

import (
	"github.com/nicolas-martin/dankfolio/backend/internal/service"
)

// Re-export the common cache interface and constructor for this package
type CoinCache = service.CoinCache

// NewCoinCache creates a new coin cache instance
var NewCoinCache = service.NewCoinCache
