package jupiter

import (
	"context"

	solanago "github.com/gagliardetto/solana-go"
)

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

	// CreateSwapTransaction requests an unsigned swap transaction from Jupiter
	CreateSwapTransaction(ctx context.Context, quoteResp SwapQuoteRequestBody, userPublicKey solanago.PublicKey) (string, error)
}
