package price

import (
	"context"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

// PriceServiceAPI defines the interface for price related operations.
type PriceServiceAPI interface {
	GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error)
	GetPriceHistory(ctx context.Context, address string, config BackendTimeframeConfig, time, addressType string) (*birdeye.PriceHistory, error)
}

type PriceHistoryCache interface {
	Get(key string) (*birdeye.PriceHistory, bool)
	Set(key string, data *birdeye.PriceHistory, expiration time.Duration)
}
