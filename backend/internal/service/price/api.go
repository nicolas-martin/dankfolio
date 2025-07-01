package price

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

// PriceServiceAPI defines the interface for price related operations.
type PriceServiceAPI interface {
	GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error)
	GetPriceHistory(ctx context.Context, address string, config BackendTimeframeConfig, time, addressType string) (*birdeye.PriceHistory, error)
	GetPriceHistoriesByAddresses(ctx context.Context, requests []PriceHistoryBatchRequest) (map[string]*PriceHistoryBatchResult, error)
}

// PriceHistoryBatchRequest represents a single price history request within a batch
type PriceHistoryBatchRequest struct {
	Address     string
	Config      BackendTimeframeConfig
	Time        string
	AddressType string
}

// PriceHistoryBatchResult contains the price history data and error information for a single address
type PriceHistoryBatchResult struct {
	Data         *birdeye.PriceHistory
	Success      bool
	ErrorMessage string
}
