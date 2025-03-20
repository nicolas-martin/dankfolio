package model

// Coin represents a cryptocurrency coin with all its metadata
type Coin struct {
	// Basic Info (from all sources)
	ID          string   `json:"id"` // Same as Address/Mint
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	Description string   `json:"description"`
	IconUrl     string   `json:"icon_url"` // Same as LogoURI/LogoURL
	Tags        []string `json:"tags,omitempty"`

	// Price and Market Data
	Price       float64 `json:"price"`
	Balance     float64 `json:"balance,omitempty"`
	Change24h   float64 `json:"change_24h,omitempty"`
	MarketCap   float64 `json:"market_cap,omitempty"`
	Volume24h   float64 `json:"volume_24h,omitempty"`
	DailyVolume float64 `json:"daily_volume,omitempty"`

	// Social and External Links
	Website     string `json:"website,omitempty"`
	Twitter     string `json:"twitter,omitempty"`
	Telegram    string `json:"telegram,omitempty"`
	Discord     string `json:"discord,omitempty"`
	CoingeckoID string `json:"coingecko_id,omitempty"`

	// Metadata
	CreatedAt   string `json:"created_at,omitempty"`
	LastUpdated string `json:"last_updated,omitempty"`
}
