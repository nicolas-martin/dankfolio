package model

import (
	"time"
)

// Wallet represents a user's wallet for holding meme coins
type Wallet struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	PublicKey   string    `json:"public_key" db:"public_key"`
	PrivateKey  string    `json:"private_key,omitempty" db:"private_key"`
	Balance     float64   `json:"balance" db:"balance"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	LastUpdated time.Time `json:"last_updated" db:"last_updated"`
}
