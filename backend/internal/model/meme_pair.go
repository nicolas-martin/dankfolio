package model

// MemePair represents a trading pair for a meme coin
type MemePair struct {
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
	PriceUsd string `json:"priceUsd"`
	Volume   struct {
		H24 float64 `json:"h24"`
	} `json:"volume"`
	PriceChange struct {
		H24 float64 `json:"h24"`
	} `json:"priceChange"`
	Liquidity struct {
		Usd float64 `json:"usd"`
	} `json:"liquidity"`
	PairCreatedAt int64   `json:"pairCreatedAt"`
	MarketCap     float64 `json:"marketCap"`
	ChainId       string  `json:"chainId"`
	DexId         string  `json:"dexId"`
	PairAddress   string  `json:"pairAddress"`
	Info          struct {
		ImageURL string `json:"imageUrl"`
		Websites []struct {
			URL string `json:"url"`
		} `json:"websites"`
		Socials []struct {
			Platform string `json:"platform"`
			Handle   string `json:"handle"`
		} `json:"socials"`
	} `json:"info"`
}
