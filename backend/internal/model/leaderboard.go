package model

import "time"

// LeaderboardEntry represents a single entry in the leaderboard
type LeaderboardEntry struct {
	Rank                 int     `json:"rank"`
	UserID               string  `json:"user_id"`
	Username             string  `json:"username"`
	AvatarURL            string  `json:"avatar_url"`
	TotalValue           float64 `json:"total_value"`
	TotalProfitPercent   float64 `json:"total_profit_percent"`
	ProfitLoss           float64 `json:"profit_loss"`
	ProfitLossPercentage float64 `json:"profit_loss_percentage"`
	TotalTrades          int     `json:"total_trades"`
	WinRate              float64 `json:"win_rate"`
}

// UserRank represents a user's position in the leaderboard
type UserRank struct {
	Rank                 int     `json:"rank"`
	TotalValue           float64 `json:"total_value"`
	TotalProfitPercent   float64 `json:"total_profit_percent"`
	ProfitLoss           float64 `json:"profit_loss"`
	ProfitLossPercentage float64 `json:"profit_loss_percentage"`
	TotalUsers           int     `json:"total_users"`
	TopPercentile        float64 `json:"top_percentile"`
}

// Leaderboard represents the overall leaderboard data
type Leaderboard struct {
	Timeframe  string             `json:"timeframe"`
	Entries    []LeaderboardEntry `json:"entries"`
	TotalUsers int                `json:"total_users"`
	StartTime  time.Time          `json:"start_time"`
	UpdatedAt  time.Time          `json:"updated_at"`
}
