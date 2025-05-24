package price

import (
	"context"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

// PriceServiceAPI defines the interface for price related operations.
type PriceServiceAPI interface {
	GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error)
	GetPriceHistory(ctx context.Context, address, historyType, timeFromStr, timeToStr, addressType string) (*birdeye.PriceHistory, error)
	// Add other methods used by other services if necessary.
}
