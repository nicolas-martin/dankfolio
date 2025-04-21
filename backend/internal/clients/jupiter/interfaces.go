package jupiter

// ClientAPI defines the interface for Jupiter API interactions
type ClientAPI interface {
	// GetTokenInfo fetches detailed information about a token from Jupiter API
	GetTokenInfo(tokenAddress string) (*TokenInfoResponse, error)

	// GetTokenPrices fetches prices for one or more tokens from Jupiter API
	GetTokenPrices(tokenAddresses []string) (map[string]float64, error)

	// GetQuote fetches a swap quote from Jupiter API
	GetQuote(params QuoteParams) (*QuoteResponse, error)
}
