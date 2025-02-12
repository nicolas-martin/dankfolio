package repository

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	GetProfile(ctx context.Context, userID string) (*model.Profile, error)
	UpdateProfile(ctx context.Context, userID string, req model.ProfileUpdateRequest) error
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByID(ctx context.Context, userID string) (*model.User, error)
	Create(ctx context.Context, user *model.User) error
	CheckExists(ctx context.Context, email string) (bool, error)
	UpdatePassword(ctx context.Context, userID string, hashedPassword string) error
	UpdateNotificationSettings(ctx context.Context, userID string, settings model.NotificationSettings) (*model.NotificationSettings, error)
}

// userRepository implements UserRepository interface
type userRepository struct {
	db db.DB
}

// NewUserRepository creates a new UserRepository instance
func NewUserRepository(db db.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetProfile(ctx context.Context, userID string) (*model.Profile, error) {
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
	err := r.db.QueryRow(ctx, query, userID).Scan(
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

func (r *userRepository) UpdateProfile(ctx context.Context, userID string, req model.ProfileUpdateRequest) error {
	// Check if username is already taken
	if req.Username != "" {
		var exists bool
		err := r.db.QueryRow(ctx, `
			SELECT EXISTS(SELECT 1 FROM users WHERE username = $1 AND id != $2)
		`, req.Username, userID).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check username: %w", err)
		}
		if exists {
			return fmt.Errorf("username already taken")
		}
	}

	query := `
		UPDATE users 
		SET 
			username = COALESCE($2, username),
			avatar_url = COALESCE($3, avatar_url),
			updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID, req.Username, req.AvatarURL)
	if err != nil {
		return fmt.Errorf("failed to update profile: %w", err)
	}

	return nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	user := &model.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, username, password_hash, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *userRepository) GetByID(ctx context.Context, userID string) (*model.User, error) {
	user := &model.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, username, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, username, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, user.Email, user.Username, user.PasswordHash).Scan(&user.ID, &user.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *userRepository) CheckExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
	`, email).Scan(&exists)

	if err != nil {
		return false, fmt.Errorf("failed to check user existence: %w", err)
	}

	return exists, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, userID string, hashedPassword string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users 
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1
	`, userID, hashedPassword)

	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (r *userRepository) UpdateNotificationSettings(ctx context.Context, userID string, settings model.NotificationSettings) (*model.NotificationSettings, error) {
	query := `
		UPDATE users 
		SET 
			notification_settings = $2,
			updated_at = NOW()
		WHERE id = $1
		RETURNING notification_settings
	`

	var updatedSettings model.NotificationSettings
	err := r.db.QueryRow(ctx, query, userID, settings).Scan(&updatedSettings)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification settings: %w", err)
	}

	return &updatedSettings, nil
}
