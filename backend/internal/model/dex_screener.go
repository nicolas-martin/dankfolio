package model

// DexScreenerPair represents a trading pair from the DexScreener API
type DexScreenerPair struct {
	ChainId       string   `json:"chainId"`
	DexId         string   `json:"dexId"`
	URL           string   `json:"url"`
	PairAddress   string   `json:"pairAddress"`
	PriceNative   string   `json:"priceNative"`
	PriceUsd      string   `json:"priceUsd"`
	FDV           float64  `json:"fdv"`
	MarketCap     float64  `json:"marketCap"`
	PairCreatedAt int64    `json:"pairCreatedAt"`
	Labels        []string `json:"labels"`
	Volume        struct {
		H24 float64 `json:"h24"`
	} `json:"volume"`
	PriceChange struct {
		H24 float64 `json:"h24"`
	} `json:"priceChange"`
	BaseToken struct {
		Address string `json:"address"`
		Name    string `json:"name"`
		Symbol  string `json:"symbol"`
	} `json:"baseToken"`
	QuoteToken struct {
		Address string `json:"address"`
		Name    string `json:"name"`
		Symbol  string `json:"symbol"`
	} `json:"quoteToken"`
	Liquidity struct {
		Usd   float64 `json:"usd"`
		Base  float64 `json:"base"`
		Quote float64 `json:"quote"`
	} `json:"liquidity"`
}

// DexScreenerResponse represents the response from the DexScreener API
type DexScreenerResponse struct {
	SchemaVersion string            `json:"schemaVersion"`
	Pairs         []DexScreenerPair `json:"pairs"`
}

// TokenProfile represents the response from DexScreener token profiles API
type TokenProfile struct {
	ChainId      string `json:"chainId"`
	TokenAddress string `json:"tokenAddress"`
	Icon         string `json:"icon"`
	Description  string `json:"description"`
	Links        []struct {
		Type  string `json:"type"`
		Label string `json:"label"`
		URL   string `json:"url"`
	} `json:"links"`
}
