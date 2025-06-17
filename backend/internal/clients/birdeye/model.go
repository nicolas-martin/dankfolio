package birdeye

import "time"

// PriceHistory represents the response from the price history API
type PriceHistory struct {
	Data    PriceHistoryData `json:"data"`
	Success bool             `json:"success"`
}

// PriceHistoryData contains the price history items
type PriceHistoryData struct {
	Items []PriceHistoryItem `json:"items"`
}

// PriceHistoryItem represents a single price point
type PriceHistoryItem struct {
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

// PriceHistoryParams contains parameters for the GetPriceHistory request
type PriceHistoryParams struct {
	Address     string    // Token address
	AddressType string    // Address type
	HistoryType string    // History type (e.g., "1H", "1D", etc.)
	TimeFrom    time.Time // Start time
	TimeTo      time.Time // End time
}

// TokenTrendingResponse corresponds to the top-level JSON object from /defi/token_trending
type TokenTrendingResponse struct {
	Data    TokenTrendingData `json:"data"`
	Success bool              `json:"success"`
}

// TokenTrendingData corresponds to the "data" object in the API response
type TokenTrendingData struct {
	UpdateUnixTime int64          `json:"updateUnixTime"`
	UpdateTime     string         `json:"updateTime"`
	Tokens         []TokenDetails `json:"tokens"`
	Total          int            `json:"total"`
}

// TokenDetails corresponds to each object in the "tokens" array
type TokenDetails struct {
	Address                string   `json:"address"`
	Decimals               int      `json:"decimals"`
	Liquidity              float64  `json:"liquidity"`
	LogoURI                string   `json:"logoURI"`
	Name                   string   `json:"name"`
	Symbol                 string   `json:"symbol"`
	Volume24hUSD           float64  `json:"volume24hUSD"`
	Volume24hChangePercent float64  `json:"volume24hChangePercent,omitempty"`
	FDV                    float64  `json:"fdv"`
	MarketCap              float64  `json:"marketcap"`
	Rank                   int      `json:"rank"`
	Price                  float64  `json:"price"`
	Price24hChangePercent  float64  `json:"price24hChangePercent"`
	Tags                   []string `json:"tags,omitempty"`
}

type SortBy string

const (
	SortByVolume24hUSD SortBy = "volume24hUSD"
	SortByRank         SortBy = "rank"
	SortByLiquidity    SortBy = "liquidity"
)

func (s SortBy) String() string {
	return string(s)
}

type SortType string

const (
	SortTypeDesc SortType = "desc"
	SortTypeAsc  SortType = "asc"
)

func (s SortType) String() string {
	return string(s)
}

// TrendingTokensParams contains parameters for the GetTrendingTokens request
// Based on BirdEye API documentation: https://docs.birdeye.so/reference/get-defi-token_trending
type TrendingTokensParams struct {
	SortBy   SortBy   // Sort criteria (e.g., "v24hUSD", "mc", "price24hChangePercent", "volume24hChangePercent")
	SortType SortType // Sort order: "desc" or "asc"
	Offset   int      // Pagination offset (starting point in the token list)
	Limit    int      // Number of results to return (max 50)
}
