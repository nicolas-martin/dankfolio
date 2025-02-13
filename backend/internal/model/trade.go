package model

import (
	"time"
)

// Trade represents a meme trading transaction
type Trade struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	CoinID          string    `json:"coin_id"`
	CoinSymbol      string    `json:"coin_symbol"`
	Type            string    `json:"type"` // "buy" or "sell"
	Amount          float64   `json:"amount"`
	Price           float64   `json:"price"`
	Fee             float64   `json:"fee"`
	Status          string    `json:"status"` // "pending", "completed", "failed"
	TransactionHash string    `json:"transaction_hash,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	CompletedAt     time.Time `json:"completed_at,omitempty"`
}

// TradeRequest represents a request to trade meme coins
type TradeRequest struct {
	CoinID string  `json:"coin_id" validate:"required"`
	Type   string  `json:"type" validate:"required,oneof=buy sell"`
	Amount float64 `json:"amount" validate:"required,gt=0"`
}

// TradePreview represents a preview of a trade before execution
type TradePreview struct {
	Type        string  `json:"type"`
	CoinSymbol  string  `json:"coin_symbol"`
	Amount      float64 `json:"amount"`
	Price       float64 `json:"price"`
	TotalCost   float64 `json:"total_cost"`
	Fee         float64 `json:"fee"`
	Slippage    float64 `json:"slippage"`
	FinalAmount float64 `json:"final_amount"`
}

// PriceUpdate represents a real-time price update for a meme
type PriceUpdate struct {
	CoinID          string    `json:"coin_id"`
	MemeID          string    `json:"meme_id"`
	Symbol          string    `json:"symbol"`
	Name            string    `json:"name"`
	ContractAddress string    `json:"contract_address"`
	Price           float64   `json:"price"`
	PriceChange24h  float64   `json:"price_change_24h"`
	Change24h       float64   `json:"change_24h"`
	Volume24h       float64   `json:"volume_24h"`
	MarketCap       float64   `json:"market_cap"`
	Timestamp       time.Time `json:"timestamp"`
	UpdatedAt       time.Time `json:"updated_at"`
}
