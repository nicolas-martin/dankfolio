package model

// Coin represents a cryptocurrency coin
type Coin struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Price       float64  `json:"price"`
	Balance     float64  `json:"balance,omitempty"`
	Change24h   float64  `json:"change_24h,omitempty"`
	MarketCap   float64  `json:"market_cap,omitempty"`
	Volume24h   float64  `json:"volume_24h,omitempty"`
	Description string   `json:"description"`
	IconUrl     string   `json:"icon_url"`
	Decimals    int      `json:"decimals"`
	DailyVolume float64  `json:"daily_volume,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}
