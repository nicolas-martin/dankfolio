package jupiter

import "context"

// ClientAPI defines the interface for Jupiter API interactions
type ClientAPI interface {
	// GetTokenInfo fetches detailed information about a token from Jupiter API
	GetTokenInfo(ctx context.Context, tokenAddress string) (*TokenListInfo, error)

	// GetTokenPrices fetches prices for one or more tokens from Jupiter API
	GetTokenPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error)

	// GetQuote fetches a swap quote from Jupiter API
	GetQuote(ctx context.Context, params QuoteParams) (*QuoteResponse, error)

	// GetAllTokens fetches all available tokens from Jupiter API
	GetAllTokens(ctx context.Context) (*TokenListResponse, error)
}
