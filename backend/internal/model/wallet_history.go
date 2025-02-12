package model

import "time"

// WalletHistory represents a historical record of wallet transactions and balance changes
type WalletHistory struct {
	ID              string    `json:"id"`
	WalletID        string    `json:"wallet_id"`
	UserID          string    `json:"user_id"`
	TransactionType string    `json:"transaction_type"` // deposit, withdrawal, trade
	Amount          float64   `json:"amount"`
	Balance         float64   `json:"balance"`               // balance after transaction
	Currency        string    `json:"currency"`              // e.g., USD, BTC, ETH
	Method          string    `json:"method,omitempty"`      // payment/withdrawal method
	Source          string    `json:"source,omitempty"`      // source of funds
	Destination     string    `json:"destination,omitempty"` // destination of funds
	Status          string    `json:"status"`
	Timestamp       time.Time `json:"timestamp"`
	Metadata        string    `json:"metadata,omitempty"` // additional JSON data
}
