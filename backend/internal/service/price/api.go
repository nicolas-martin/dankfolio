package price

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

// PriceServiceAPI defines the interface for price related operations.
type PriceServiceAPI interface {
	GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error)
	GetPriceHistory(ctx context.Context, address string, config BackendTimeframeConfig, time, addressType string) (*birdeye.PriceHistory, error)
}
