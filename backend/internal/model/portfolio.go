package model

import (
	"time"
)

// Portfolio represents a user's portfolio of meme coins
type Portfolio struct {
	UserID   string        `json:"user_id"`
	Holdings []MemeHolding `json:"holdings"`
}

// MemeHolding represents a user's holding of a specific meme coin
type MemeHolding struct {
	CoinID          string    `json:"coin_id"`
	Amount          float64   `json:"amount"`
	AverageBuyPrice float64   `json:"average_buy_price"`
	Quantity        float64   `json:"quantity"`
	Value           float64   `json:"value"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// PortfolioAsset represents a portfolio asset with current market value and profit/loss calculations
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

// PortfolioSnapshot represents a point-in-time snapshot of a portfolio's value
type PortfolioSnapshot struct {
	Timestamp          time.Time `json:"timestamp"`
	TotalValue         float64   `json:"total_value"`
	DailyChange        float64   `json:"daily_change"`
	DailyChangePercent float64   `json:"daily_change_percent"`
}

// PortfolioStats represents detailed statistics about a portfolio's performance
type PortfolioStats struct {
	TotalValue           float64 `json:"total_value"`
	TotalCost            float64 `json:"total_cost"`
	TotalProfit          float64 `json:"total_profit"`
	TotalProfitPercent   float64 `json:"total_profit_percent"`
	DailyProfit          float64 `json:"daily_profit"`
	DailyProfitPercent   float64 `json:"daily_profit_percent"`
	WeeklyProfit         float64 `json:"weekly_profit"`
	WeeklyProfitPercent  float64 `json:"weekly_profit_percent"`
	MonthlyProfit        float64 `json:"monthly_profit"`
	MonthlyProfitPercent float64 `json:"monthly_profit_percent"`
}
