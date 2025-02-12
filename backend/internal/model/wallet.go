package model

import (
	"time"
)

// Wallet represents a user's wallet for holding meme coins
type Wallet struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	PublicKey   string    `json:"public_key"`
	Balance     float64   `json:"balance"`
	LastUpdated time.Time `json:"last_updated"`
}
