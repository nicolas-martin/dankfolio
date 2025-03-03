package coin

import (
	"github.com/nicolas-martin/dankfolio/internal/model"
)

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

// JupiterTokenInfoResponse represents the detailed token information from Jupiter API
type JupiterTokenInfoResponse struct {
	Address     string   `json:"address"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	LogoURI     string   `json:"logoURI"`
	Tags        []string `json:"tags,omitempty"`
	DailyVolume float64  `json:"daily_volume,omitempty"`
	CreatedAt   string   `json:"created_at,omitempty"`
}

// ToCoin converts a JupiterTokenInfoResponse to a model.Coin
func (j *JupiterTokenInfoResponse) ToCoin() model.Coin {
	return model.Coin{
		ID:          j.Address,
		Symbol:      j.Symbol,
		Name:        j.Name,
		IconUrl:     j.LogoURI,
		Description: "", // Empty description for now
		Decimals:    j.Decimals,
		Tags:        j.Tags,
		DailyVolume: j.DailyVolume,
	}
}
