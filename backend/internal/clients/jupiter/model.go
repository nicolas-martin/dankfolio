package jupiter

import (
	"time"
)

// PriceResponse represents the response from Jupiter Price API V2
type PriceResponse struct {
	Data map[string]TokenData `json:"data"`
}

// TokenData represents price data for a specific token
type TokenData struct {
	Price     string     `json:"price"`
	ExtraInfo *ExtraInfo `json:"extraInfo,omitempty"`
}

// ExtraInfo contains additional price information like confidence levels
type ExtraInfo struct {
	LastSwappedPrice *LastSwappedPrice `json:"lastSwappedPrice,omitempty"`
	QuotedPrice      *QuotedPrice      `json:"quotedPrice,omitempty"`
}

// LastSwappedPrice contains info about the last swap transaction
type LastSwappedPrice struct {
	LastJupiterSellAt    int64  `json:"lastJupiterSellAt,omitempty"`
	LastJupiterSellPrice string `json:"lastJupiterSellPrice,omitempty"`
	LastJupiterBuyAt     int64  `json:"lastJupiterBuyAt,omitempty"`
	LastJupiterBuyPrice  string `json:"lastJupiterBuyPrice,omitempty"`
}

// QuotedPrice contains current buy and sell price information
type QuotedPrice struct {
	BuyPrice  string `json:"buyPrice,omitempty"`
	SellPrice string `json:"sellPrice,omitempty"`
}

// TokenInfoResponse represents the response from Jupiter's token info API
type TokenInfoResponse struct {
	Address     string                 `json:"address"`
	ChainID     int                    `json:"chainId"`
	Decimals    int                    `json:"decimals"`
	Name        string                 `json:"name"`
	Symbol      string                 `json:"symbol"`
	LogoURI     string                 `json:"logoURI"`
	Extensions  map[string]interface{} `json:"extensions"`
	DailyVolume float64                `json:"dailyVolume"`
	Tags        []string               `json:"tags"`
	CreatedAt   time.Time              `json:"createdAt"`
}

// SwapInfo represents information about a swap in a route
type SwapInfo struct {
	Label     string `json:"label"`
	FeeMint   string `json:"feeMint"`
	FeeAmount string `json:"feeAmount"`
}

// RoutePlan represents a step in the swap route
type RoutePlan struct {
	SwapInfo SwapInfo `json:"swapInfo"`
}

// QuoteResponse represents the response from Jupiter's quote endpoint
type QuoteResponse struct {
	InputMint            string       `json:"inputMint"`
	OutputMint           string       `json:"outputMint"`
	InAmount             string       `json:"inAmount"`
	OutAmount            string       `json:"outAmount"`
	OtherAmountThreshold string       `json:"otherAmountThreshold"`
	SwapMode             string       `json:"swapMode"`
	SlippageBps          int          `json:"slippageBps"`
	PriceImpactPct       string       `json:"priceImpactPct"`
	RoutePlan            []RoutePlan  `json:"routePlan"`
	ContextSlot          int64        `json:"contextSlot"`
	TimeTaken            float64      `json:"timeTaken"`
	PlatformFee          *PlatformFee `json:"platformFee,omitempty"`
}

// PlatformFee represents the platform fee information in a quote
type PlatformFee struct {
	Amount   string `json:"amount"`
	FeeBps   int    `json:"feeBps"`
	FeeMint  string `json:"feeMint"`
	FeeToken string `json:"feeToken"`
}

// QuoteParams represents all possible parameters for the Jupiter quote endpoint
type QuoteParams struct {
	InputMint           string `json:"inputMint"`
	OutputMint          string `json:"outputMint"`
	Amount              string `json:"amount"`
	SwapMode            string `json:"swapMode,omitempty"`
	SlippageBps         int    `json:"slippageBps,omitempty"`
	FeeBps              int    `json:"feeBps,omitempty"`
	OnlyDirectRoutes    bool   `json:"onlyDirectRoutes,omitempty"`
	AsLegacyTransaction bool   `json:"asLegacyTransaction,omitempty"`
}
