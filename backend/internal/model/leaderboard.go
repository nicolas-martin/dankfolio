package model

type LeaderboardEntry struct {
	Rank            int     `json:"rank"`
	UserID          string  `json:"user_id"`
	Username        string  `json:"username"`
	AvatarURL       string  `json:"avatar_url"`
	ProfitLoss      float64 `json:"profit_loss"`
	ProfitLossPercentage float64 `json:"profit_loss_percentage"`
	TotalTrades     int     `json:"total_trades"`
	WinRate         float64 `json:"win_rate"`
}

type UserRank struct {
	Rank            int     `json:"rank"`
	ProfitLoss      float64 `json:"profit_loss"`
	ProfitLossPercentage float64 `json:"profit_loss_percentage"`
	TotalUsers      int     `json:"total_users"`
	TopPercentile   float64 `json:"top_percentile"`
}

type Leaderboard struct {
	Timeframe string            `json:"timeframe"`
	Entries   []LeaderboardEntry `json:"entries"`
	TotalUsers int              `json:"total_users"`
	UpdatedAt  time.Time        `json:"updated_at"`
} 