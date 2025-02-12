package model

import "time"

// Portfolio represents a user's portfolio of meme coins
type Portfolio struct {
	UserID                    string           `json:"user_id"`
	Balance                   float64          `json:"balance"`
	Holdings                  []MemeHolding    `json:"holdings"`
	Assets                    []PortfolioAsset `json:"assets"`
	TotalValue                float64          `json:"total_value"`
	TotalProfitLoss           float64          `json:"total_profit_loss"`
	TotalProfitLossPercentage float64          `json:"total_profit_loss_percentage"`
	UpdatedAt                 time.Time        `json:"updated_at"`
}

// MemeHolding represents a user's holdings of a specific meme coin
type MemeHolding struct {
	CoinID          string    `json:"coin_id"`
	Amount          float64   `json:"amount"`
	Quantity        float64   `json:"quantity"`
	Value           float64   `json:"value"`
	AverageBuyPrice float64   `json:"average_buy_price"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// PortfolioAsset represents an asset in a user's portfolio
type PortfolioAsset struct {
	CoinID          string    `json:"coin_id"`
	Symbol          string    `json:"symbol"`
	Name            string    `json:"name"`
	Amount          float64   `json:"amount"`
	CurrentPrice    float64   `json:"current_price"`
	Value           float64   `json:"value"`
	AverageBuyPrice float64   `json:"average_buy_price"`
	ProfitLoss      float64   `json:"profit_loss"`
	ProfitLossPerc  float64   `json:"profit_loss_percentage"`
	LastUpdated     time.Time `json:"last_updated"`
}

// PortfolioSnapshot represents a point-in-time snapshot of a user's portfolio
type PortfolioSnapshot struct {
	ID         string        `json:"id"`
	UserID     string        `json:"user_id"`
	Balance    float64       `json:"balance"`
	Holdings   []MemeHolding `json:"holdings"`
	TotalValue float64       `json:"total_value"`
	Value      float64       `json:"value"`
	Timestamp  time.Time     `json:"timestamp"`
}

// PortfolioStats represents statistics about a user's trading performance
type PortfolioStats struct {
	TotalTrades     int     `json:"total_trades"`
	WinningTrades   int     `json:"winning_trades"`
	TotalProfitLoss float64 `json:"total_profit_loss"`
	WinRate         float64 `json:"win_rate"`
}
