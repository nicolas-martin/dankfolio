package model

import "time"

// Transaction represents a wallet transaction (deposit or withdrawal)
type Transaction struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "deposit" or "withdrawal"
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	TxHash    string    `json:"tx_hash,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DepositRequest represents a request to deposit funds
type DepositRequest struct {
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	PaymentType string  `json:"payment_type" validate:"required,oneof=crypto card bank"`
}

// DepositInfo represents deposit payment information
type DepositInfo struct {
	ID          string    `json:"id" db:"id"`
	Address     string    `json:"address" db:"address"`
	Amount      float64   `json:"amount" db:"amount"`
	Status      string    `json:"status" db:"status"`
	PaymentType string    `json:"payment_type" db:"payment_type"`
	PaymentURL  string    `json:"payment_url,omitempty" db:"payment_url"`
	QRCode      string    `json:"qr_code,omitempty" db:"qr_code"`
	ExpiresAt   time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// WithdrawalRequest represents a request to withdraw funds
type WithdrawalRequest struct {
	Amount             float64 `json:"amount" validate:"required,gt=0"`
	DestinationChain   string  `json:"destination_chain" validate:"required"`
	DestinationAddress string  `json:"destination_address" validate:"required"`
}

// WithdrawalInfo represents withdrawal information
type WithdrawalInfo struct {
	ID               string    `json:"id" db:"id"`
	Amount           float64   `json:"amount" db:"amount"`
	Fee              float64   `json:"fee" db:"fee"`
	TotalAmount      float64   `json:"total_amount" db:"total_amount"`
	Status           string    `json:"status" db:"status"`
	EstimatedTime    string    `json:"estimated_time" db:"estimated_time"`
	DestinationChain string    `json:"destination_chain" db:"destination_chain"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}
