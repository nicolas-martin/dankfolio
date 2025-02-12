package service

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	db db.DB
}

func NewUserService(db db.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*model.Profile, error) {
	query := `
		WITH trade_stats AS (
			SELECT 
				COUNT(*) as total_trades,
				COUNT(CASE WHEN type = 'sell' AND price > average_buy_price THEN 1 END) as successful_trades,
				COALESCE(SUM(CASE 
					WHEN type = 'sell' THEN amount * (price - average_buy_price)
					ELSE 0 
				END), 0) as total_profit_loss
			FROM trades
			WHERE user_id = $1 AND status = 'completed'
		)
		SELECT 
			u.id,
			u.username,
			u.email,
			u.avatar_url,
			GREATEST(1, FLOOR(LOG(2, GREATEST(1, ts.total_trades)))) as trading_level,
			ts.total_trades,
			ts.successful_trades,
			ts.total_profit_loss,
			u.notification_settings,
			u.created_at,
			u.updated_at
		FROM users u
		CROSS JOIN trade_stats ts
		WHERE u.id = $1
	`

	profile := &model.Profile{}
	err := s.db.QueryRow(ctx, query, userID).Scan(
		&profile.ID,
		&profile.Username,
		&profile.Email,
		&profile.AvatarURL,
		&profile.TradingLevel,
		&profile.TotalTrades,
		&profile.SuccessfulTrades,
		&profile.TotalProfitLoss,
		&profile.NotificationSettings,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	return profile, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, req model.ProfileUpdateRequest) (*model.Profile, error) {
	// Check if username is already taken
	if req.Username != "" {
		var exists bool
		err := s.db.QueryRow(ctx, `
			SELECT EXISTS(SELECT 1 FROM users WHERE username = $1 AND id != $2)
		`, req.Username, userID).Scan(&exists)
		if err != nil {
			return nil, fmt.Errorf("failed to check username: %w", err)
		}
		if exists {
			return nil, fmt.Errorf("username already taken")
		}
	}

	// Update profile
	query := `
		UPDATE users 
		SET 
			username = COALESCE($2, username),
			avatar_url = COALESCE($3, avatar_url),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id
	`

	_, err := s.db.Exec(ctx, query, userID, req.Username, req.AvatarURL)
	if err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return s.GetProfile(ctx, userID)
}

func (s *UserService) ChangePassword(ctx context.Context, userID string, req model.ChangePasswordRequest) error {
	var currentHash string
	err := s.db.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&currentHash)
	if err != nil {
		return fmt.Errorf("failed to get current password: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		return fmt.Errorf("invalid current password")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	_, err = s.db.Exec(ctx, `
		UPDATE users 
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1
	`, userID, string(newHash))
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (s *UserService) UpdateNotificationSettings(ctx context.Context, userID string, settings model.NotificationSettings) (*model.NotificationSettings, error) {
	query := `
		UPDATE users 
		SET 
			notification_settings = $2,
			updated_at = NOW()
		WHERE id = $1
		RETURNING notification_settings
	`

	var updatedSettings model.NotificationSettings
	err := s.db.QueryRow(ctx, query, userID, settings).Scan(&updatedSettings)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification settings: %w", err)
	}

	return &updatedSettings, nil
}
