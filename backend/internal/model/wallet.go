package model

import (
	"time"
)

// Wallet represents a Solana wallet
type Wallet struct {
	ID        string
	PublicKey string `json:"public_key"`
	CreatedAt time.Time
}

func (w Wallet) GetID() string {
	return w.ID
}

// DepositRequest represents a request to deposit funds
type DepositRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	PaymentType string  `json:"payment_type" validate:"required,oneof=crypto"`
}

// WithdrawalRequest represents a request to withdraw funds
type WithdrawalRequest struct {
	Amount             float64 `json:"amount" validate:"required,gt=0"`
	DestinationChain   string  `json:"destination_chain" validate:"required"`
	DestinationAddress string  `json:"destination_address" validate:"required"`
}

// Transaction represents a wallet transaction
type Transaction struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
