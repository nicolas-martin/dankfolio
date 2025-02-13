package model

import "time"

// SocialLink represents a social media link for a meme coin
type SocialLink struct {
	Platform string `json:"platform"`
	Handle   string `json:"handle"`
	URL      string `json:"url"`
}

// MemeCoin represents a tradeable meme coin asset
type MemeCoin struct {
	ID              string       `json:"id"`
	Symbol          string       `json:"symbol"`
	Name            string       `json:"name"`
	Description     string       `json:"description"`
	ImageURL        string       `json:"image_url"`
	LogoURL         string       `json:"logo_url"`
	WebsiteURL      string       `json:"website_url"`
	ContractAddress string       `json:"contract_address"`
	Price           float64      `json:"price"`
	CurrentPrice    float64      `json:"current_price"`
	Change24h       float64      `json:"change_24h"`
	Volume24h       float64      `json:"volume_24h"`
	MarketCap       float64      `json:"market_cap"`
	Supply          float64      `json:"supply"`
	Labels          []string     `json:"labels"`
	Socials         []SocialLink `json:"socials"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

// PricePoint represents a single price data point for historical data
type PricePoint struct {
	Time      time.Time `json:"time"`
	Timestamp int64     `json:"timestamp"`
	Price     float64   `json:"price"`
	Volume    float64   `json:"volume"`
	MarketCap float64   `json:"market_cap"`
}
