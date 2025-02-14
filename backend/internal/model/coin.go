package model

import "time"

// SocialLink represents a social media link for a meme coin
type SocialLink struct {
	Platform string `json:"platform"`
	Handle   string `json:"handle"`
	URL      string `json:"url"`
}

// Website represents a website link for a meme coin
type Website struct {
	URL string `json:"url"`
}

// TransactionStats represents buy/sell transaction statistics
type TransactionStats struct {
	Buys  int `json:"buys"`
	Sells int `json:"sells"`
}

// VolumeStats represents volume statistics for different time periods
type VolumeStats struct {
	H24 float64 `json:"h24,omitempty"`
	H6  float64 `json:"h6,omitempty"`
	H1  float64 `json:"h1,omitempty"`
	M5  float64 `json:"m5,omitempty"`
}

// PriceChangeStats represents price change statistics for different time periods
type PriceChangeStats struct {
	H24 float64 `json:"h24,omitempty"`
	H6  float64 `json:"h6,omitempty"`
	H1  float64 `json:"h1,omitempty"`
	M5  float64 `json:"m5,omitempty"`
}

// LiquidityStats represents liquidity information
type LiquidityStats struct {
	USD   float64 `json:"usd"`
	Base  float64 `json:"base"`
	Quote float64 `json:"quote"`
}

// MemeCoin represents a tradeable meme coin asset
type MemeCoin struct {
	ID              string           `json:"id"`
	Symbol          string           `json:"symbol"`
	Name            string           `json:"name"`
	Description     string           `json:"description"`
	ImageURL        string           `json:"image_url"`
	LogoURL         string           `json:"logo_url"`
	WebsiteURL      string           `json:"website_url"`
	ContractAddress string           `json:"contract_address"`
	Price           float64          `json:"price"`
	PriceNative     string           `json:"price_native"`
	CurrentPrice    float64          `json:"current_price"`
	Change24h       float64          `json:"change_24h"`
	Volume24h       float64          `json:"volume_24h"`
	MarketCap       float64          `json:"market_cap"`
	Supply          float64          `json:"supply"`
	Labels          []string         `json:"labels"`
	Socials         []SocialLink     `json:"socials"`
	Websites        []Website        `json:"websites"`
	DexID           string           `json:"dex_id"`
	PairAddress     string           `json:"pair_address"`
	PairCreatedAt   int64            `json:"pair_created_at"`
	Volume          VolumeStats      `json:"volume"`
	PriceChange     PriceChangeStats `json:"price_change"`
	Liquidity       LiquidityStats   `json:"liquidity"`
	Transactions    struct {
		H24 *TransactionStats `json:"h24,omitempty"`
		H6  *TransactionStats `json:"h6,omitempty"`
		H1  *TransactionStats `json:"h1,omitempty"`
		M5  *TransactionStats `json:"m5,omitempty"`
	} `json:"transactions"`
	BoostActive int       `json:"boost_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PricePoint represents a single price data point for historical data
type PricePoint struct {
	Time      time.Time `json:"time"`
	Timestamp int64     `json:"timestamp"`
	Price     float64   `json:"price"`
	Volume    float64   `json:"volume"`
	MarketCap float64   `json:"market_cap"`
}
