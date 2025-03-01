package model

import (
	"time"
)

// Trade represents a meme trading transaction
type Trade struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	FromCoinID      string    `json:"from_coin_id"` // Input token mint address
	ToCoinID        string    `json:"to_coin_id"`   // Output token mint address
	CoinSymbol      string    `json:"coin_symbol"`
	Type            string    `json:"type"` // "swap"
	Amount          float64   `json:"amount"`
	Price           float64   `json:"price"`
	Fee             float64   `json:"fee"`
	Status          string    `json:"status"` // "pending", "completed", "failed"
	TransactionHash string    `json:"transaction_hash,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	CompletedAt     time.Time `json:"completed_at,omitempty"`
	PrivateKey      string    `json:"-"` // Private key for signing transactions, not serialized to JSON
}

// TradeRequest represents a request to trade meme coins
type TradeRequest struct {
	FromCoinID string  `json:"from_coin_id" validate:"required"`
	ToCoinID   string  `json:"to_coin_id" validate:"required"`
	Amount     float64 `json:"amount" validate:"required,gt=0"`
	PrivateKey string  `json:"private_key" validate:"required"` // Private key for signing transactions
}
