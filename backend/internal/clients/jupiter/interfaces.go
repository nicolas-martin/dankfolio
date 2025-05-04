package jupiter

import "context"

// ClientAPI defines the interface for Jupiter API interactions
type ClientAPI interface {
	// GetTokenInfo fetches detailed information about a token from Jupiter API
	GetCoinInfo(ctx context.Context, address string) (*CoinListInfo, error)

	// GetTokenPrices fetches prices for one or more tokens from Jupiter API
	GetCoinPrices(ctx context.Context, addresses []string) (map[string]float64, error)

	// GetQuote fetches a swap quote from Jupiter API
	GetQuote(ctx context.Context, params QuoteParams) (*QuoteResponse, error)

	// GetAllCoins fetches all available tokens from Jupiter API
	GetAllCoins(ctx context.Context) (*CoinListResponse, error)
}
