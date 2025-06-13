package birdeye

import "context"

// ClientAPI defines the interface for the BirdEye client.
type ClientAPI interface {
	GetPriceHistory(ctx context.Context, params PriceHistoryParams) (*PriceHistory, error)
	GetTrendingTokens(ctx context.Context) (*TokenTrendingResponse, error)
}
