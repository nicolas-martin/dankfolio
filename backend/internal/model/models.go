package model

import (
	"time"
)

const (
	SolMint = "So11111111111111111111111111111111111111112"
)

// Coin represents a cryptocurrency coin with all its metadata
type Coin struct {
	// Basic Info (from all sources)
	ID          string   `json:"id"` // Same as Address/Mint
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	Description string   `json:"description"`
	IconUrl     string   `json:"icon_url"`
	Tags        []string `json:"tags,omitempty"`

	// Price and Market Data
	Price       float64 `json:"price"`
	Change24h   float64 `json:"change_24h,omitempty"`
	MarketCap   float64 `json:"market_cap,omitempty"`
	DailyVolume float64 `json:"daily_volume,omitempty"`

	// Social and External Links
	Website  string `json:"website,omitempty"`
	Twitter  string `json:"twitter,omitempty"`
	Telegram string `json:"telegram,omitempty"`
	Discord  string `json:"discord,omitempty"`

	// Metadata
	CreatedAt   string `json:"created_at,omitempty"`
	LastUpdated string `json:"last_updated,omitempty"`

	// Internal state flag
	IsTrending bool `json:"-"` // Flag indicating if loaded from trending file, excluded from JSON
}

// GetID implements the Entity interface
func (c Coin) GetID() string {
	return c.ID
}

// Trade represents a cryptocurrency trade
type Trade struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	FromCoinID      string     `json:"from_coin_id"`
	ToCoinID        string     `json:"to_coin_id"`
	CoinSymbol      string     `json:"coin_symbol"`
	Type            string     `json:"type"`
	Amount          float64    `json:"amount"`
	Price           float64    `json:"price"`
	Fee             float64    `json:"fee"`
	Status          string     `json:"status"`
	TransactionHash string     `json:"transaction_hash"`
	CreatedAt       time.Time  `json:"created_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	Confirmations   int32      `json:"confirmations"`
	Finalized       bool       `json:"finalized"`
	Error           *string    `json:"error,omitempty"`
}

// GetID implements the Entity interface
func (t Trade) GetID() string {
	return t.ID
}

// TradeRequest represents a request to execute a trade
type TradeRequest struct {
	FromCoinID        string  `json:"from_coin_id"`
	ToCoinID          string  `json:"to_coin_id"`
	Amount            float64 `json:"amount"`
	SignedTransaction string  `json:"signed_transaction"`
}
