package model

import (
	"time"
)

type Wallet struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	PublicKey     string    `json:"public_key"`
	Balance       float64   `json:"balance"`
	LastUpdated   time.Time `json:"last_updated"`
}

type DepositRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	PaymentType string  `json:"payment_type" validate:"required,oneof=crypto card applepay"`
}

type WithdrawalRequest struct {
	Amount         float64 `json:"amount" validate:"required,gt=0"`
	DestinationAddress string  `json:"destination_address" validate:"required"`
}

type Transaction struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"` // deposit or withdrawal
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	TxHash    string    `json:"tx_hash,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type DepositInfo struct {
	Address     string `json:"address"`
	Amount      float64 `json:"amount"`
	PaymentURL  string `json:"payment_url,omitempty"`
	QRCode      string `json:"qr_code,omitempty"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type WithdrawalInfo struct {
	ID            string    `json:"id"`
	Amount        float64   `json:"amount"`
	Fee           float64   `json:"fee"`
	TotalAmount   float64   `json:"total_amount"`
	Status        string    `json:"status"`
	EstimatedTime string    `json:"estimated_time"`
} 