package birdeye

import "context"

// ClientAPI defines the interface for the BirdEye client.
type ClientAPI interface {
	GetPriceHistory(ctx context.Context, params PriceHistoryParams) (*PriceHistory, error)
	GetTrendingTokens(ctx context.Context, params TrendingTokensParams) (*TokenTrendingResponse, error)
	GetTokenOverview(ctx context.Context, address string) (*TokenOverview, error)
	GetTokensOverviewBatch(ctx context.Context, addresses []string) ([]TokenOverviewData, error)
	GetTokensTradeDataBatch(ctx context.Context, addresses []string) ([]TokenTradeData, error)
	GetNewListingTokens(ctx context.Context, params NewListingTokensParams) (*NewListingTokensResponse, error)
}
