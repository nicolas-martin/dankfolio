package model

import "time"

// MemeCoin represents a tradeable meme coin asset
type MemeCoin struct {
	ID              string    `json:"id"`
	Symbol          string    `json:"symbol"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	ImageURL        string    `json:"image_url"`
	LogoURL         string    `json:"logo_url"`
	ContractAddress string    `json:"contract_address"`
	Price           float64   `json:"price"`
	CurrentPrice    float64   `json:"current_price"`
	Change24h       float64   `json:"change_24h"`
	Volume24h       float64   `json:"volume_24h"`
	MarketCap       float64   `json:"market_cap"`
	Supply          float64   `json:"supply"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// PricePoint represents a single price data point for historical data
type PricePoint struct {
	Time      time.Time `json:"time"`
	Timestamp int64     `json:"timestamp"`
	Price     float64   `json:"price"`
	Volume    float64   `json:"volume"`
	MarketCap float64   `json:"market_cap"`
}
