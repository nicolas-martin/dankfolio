package coin

// TokenInfo represents a token from the Raydium API
type TokenInfo struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Mint     string `json:"mint"` // This is the ID we'll use
	Decimals int    `json:"decimals"`
	LogoURI  string `json:"logoURI"`
}

// RaydiumPool represents a liquidity pool from the Raydium API
type RaydiumPool struct {
	ID            string `json:"id"`
	BaseMint      string `json:"baseMint"`
	QuoteMint     string `json:"quoteMint"`
	BaseDecimals  int    `json:"baseDecimals"`
	QuoteDecimals int    `json:"quoteDecimals"`
	MarketID      string `json:"marketId"`
}

// TokenPoolInfo combines token information with its pools
type TokenPoolInfo struct {
	Token TokenInfo     `json:"token"`
	Pools []RaydiumPool `json:"pools"`
}

// TokenPoolInfoList represents the JSON structure of our token data file
type TokenPoolInfoList struct {
	Tokens []TokenPoolInfo `json:"tokens"`
}

// RaydiumTokenResponse represents the token list API response
type RaydiumTokenResponse struct {
	Official   []TokenInfo `json:"official"`
	Unofficial []TokenInfo `json:"unOfficial"`
}

// RaydiumPoolsResponse represents the pools API response
type RaydiumPoolsResponse struct {
	Name       string        `json:"name"`
	Official   []RaydiumPool `json:"official"`
	Unofficial []RaydiumPool `json:"unOfficial"`
}

// JupiterPriceResponse represents the response from Jupiter Price API V2
type JupiterPriceResponse struct {
	Data      map[string]JupiterTokenData `json:"data"`
	TimeTaken float64                     `json:"timeTaken"`
}

// JupiterTokenData represents price data for a specific token
type JupiterTokenData struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Price     string            `json:"price"`
	ExtraInfo *JupiterExtraInfo `json:"extraInfo,omitempty"`
}

// JupiterExtraInfo contains additional price information like confidence levels
type JupiterExtraInfo struct {
	LastSwappedPrice *JupiterLastSwappedPrice `json:"lastSwappedPrice,omitempty"`
	QuotedPrice      *JupiterQuotedPrice      `json:"quotedPrice,omitempty"`
	ConfidenceLevel  string                   `json:"confidenceLevel,omitempty"`
}

// JupiterLastSwappedPrice contains info about the last swap transaction
type JupiterLastSwappedPrice struct {
	LastJupiterSellAt    int64  `json:"lastJupiterSellAt,omitempty"`
	LastJupiterSellPrice string `json:"lastJupiterSellPrice,omitempty"`
	LastJupiterBuyAt     int64  `json:"lastJupiterBuyAt,omitempty"`
	LastJupiterBuyPrice  string `json:"lastJupiterBuyPrice,omitempty"`
}

// JupiterQuotedPrice contains current buy and sell price information
type JupiterQuotedPrice struct {
	BuyPrice  string `json:"buyPrice,omitempty"`
	BuyAt     int64  `json:"buyAt,omitempty"`
	SellPrice string `json:"sellPrice,omitempty"`
	SellAt    int64  `json:"sellAt,omitempty"`
}

// TokenList represents the structure of trimmed_mainnet.json
type TokenList struct {
	Tokens []struct {
		Token struct {
			Symbol   string `json:"symbol"`
			Name     string `json:"name"`
			Mint     string `json:"mint"`
			Decimals int    `json:"decimals"`
		} `json:"token"`
		Pools []struct {
			ID string `json:"id"`
		} `json:"pools"`
	} `json:"tokens"`
}

// Jupiter API endpoints
const (
	jupiterSwapBaseURL   = "https://api.jup.ag/swap/v1"
	jupiterTokenInfoURL  = "https://api.jup.ag/tokens/v1/token"
	jupiterV6APIPriceURL = "https://price.jup.ag/v4/price?ids=%s"
	jupiterQuoteURL      = jupiterSwapBaseURL + "/quote"
)

// JupiterTokenInfoResponse represents the response from Jupiter's token info API
type JupiterTokenInfoResponse struct {
	Address           string                 `json:"address"`
	Name              string                 `json:"name"`
	Symbol            string                 `json:"symbol"`
	Decimals          int                    `json:"decimals"`
	LogoURI           string                 `json:"logoURI"`
	Tags              []string               `json:"tags"`
	DailyVolume       float64                `json:"daily_volume"`
	CreatedAt         string                 `json:"created_at"`
	FreezeAuthority   *string                `json:"freeze_authority"`
	MintAuthority     *string                `json:"mint_authority"`
	PermanentDelegate *string                `json:"permanent_delegate"`
	MintedAt          string                 `json:"minted_at"`
	Extensions        map[string]interface{} `json:"extensions"`
}

// CoinGeckoMetadata represents the raw response from CoinGecko API
type CoinGeckoMetadata struct {
	ID     string `json:"id"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
	Links  struct {
		Homepage                  []string `json:"homepage"`
		TwitterScreenName         string   `json:"twitter_screen_name"`
		TelegramChannelIdentifier string   `json:"telegram_channel_identifier"`
	} `json:"links"`
	Image struct {
		Large string `json:"large"`
	} `json:"image"`
	LastUpdated string `json:"last_updated"`
}

// JupiterQuoteResponse represents the response from Jupiter's quote endpoint
type JupiterQuoteResponse struct {
	InputMint            string `json:"inputMint"`
	InAmount             string `json:"inAmount"`
	OutputMint           string `json:"outputMint"`
	OutAmount            string `json:"outAmount"`
	OtherAmountThreshold string `json:"otherAmountThreshold"`
	SwapMode             string `json:"swapMode"`
	SlippageBps          int    `json:"slippageBps"`
	PlatformFee          *struct {
		Amount string `json:"amount"`
		FeeBps int    `json:"feeBps"`
	} `json:"platformFee"`
	PriceImpactPct string `json:"priceImpactPct"`
	RoutePlan      []struct {
		SwapInfo struct {
			AmmKey     string `json:"ammKey"`
			Label      string `json:"label"`
			InputMint  string `json:"inputMint"`
			OutputMint string `json:"outputMint"`
			InAmount   string `json:"inAmount"`
			OutAmount  string `json:"outAmount"`
			FeeAmount  string `json:"feeAmount"`
			FeeMint    string `json:"feeMint"`
		} `json:"swapInfo"`
		Percent int `json:"percent"`
	} `json:"routePlan"`
	ContextSlot int64   `json:"contextSlot"`
	TimeTaken   float64 `json:"timeTaken"`
}

// QuoteParams represents all possible parameters for the Jupiter quote endpoint
type QuoteParams struct {
	InputMint                  string
	OutputMint                 string
	Amount                     string
	SlippageBps                int
	SwapMode                   string // "ExactIn" or "ExactOut"
	Dexes                      []string
	ExcludeDexes               []string
	RestrictIntermediateTokens bool
	OnlyDirectRoutes           bool
	AsLegacyTransaction        bool
	PlatformFeeBps             int
	MaxAccounts                int
}
