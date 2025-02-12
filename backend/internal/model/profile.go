package model

import "time"

type Profile struct {
	ID                  string              `json:"id"`
	Username            string              `json:"username"`
	Email               string              `json:"email"`
	AvatarURL           string              `json:"avatar_url"`
	TradingLevel        int                 `json:"trading_level"`
	TotalTrades         int                 `json:"total_trades"`
	SuccessfulTrades    int                 `json:"successful_trades"`
	TotalProfitLoss     float64             `json:"total_profit_loss"`
	NotificationSettings NotificationSettings `json:"notification_settings"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
}

type ProfileUpdateRequest struct {
	Username  string `json:"username" validate:"required,min=3,max=50"`
	AvatarURL string `json:"avatar_url"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

type NotificationSettings struct {
	PriceAlerts    bool `json:"price_alerts"`
	TradeUpdates   bool `json:"trade_updates"`
	NewsAlerts     bool `json:"news_alerts"`
	EmailNotifications bool `json:"email_notifications"`
	PushNotifications  bool `json:"push_notifications"`
} 