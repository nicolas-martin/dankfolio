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
	Amount      float64 `json:"amount"`
	PaymentType string  `json:"payment_type"` // "crypto", "card", "bank"
}

// DepositInfo represents deposit payment information
type DepositInfo struct {
	ID         string    `json:"id,omitempty"`
	Address    string    `json:"address,omitempty"`
	Amount     float64   `json:"amount"`
	PaymentURL string    `json:"payment_url,omitempty"`
	QRCode     string    `json:"qr_code,omitempty"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// WithdrawalRequest represents a request to withdraw funds
type WithdrawalRequest struct {
	Amount             float64 `json:"amount"`
	DestinationAddress string  `json:"destination_address"`
}

// WithdrawalInfo represents withdrawal information
type WithdrawalInfo struct {
	ID            string  `json:"id"`
	Amount        float64 `json:"amount"`
	Fee           float64 `json:"fee"`
	TotalAmount   float64 `json:"total_amount"`
	Status        string  `json:"status"`
	EstimatedTime string  `json:"estimated_time"`
}
