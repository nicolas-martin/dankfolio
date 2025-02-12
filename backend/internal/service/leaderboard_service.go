package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type LeaderboardService struct {
	db *pgxpool.Pool
}

func NewLeaderboardService(db *pgxpool.Pool) *LeaderboardService {
	return &LeaderboardService{db: db}
}

func (s *LeaderboardService) GetLeaderboard(ctx context.Context, timeframe string, limit int) (*model.Leaderboard, error) {
	startTime := getStartTimeForTimeframe(timeframe)

	query := `
		WITH user_profits AS (
			SELECT 
				u.id as user_id,
				u.username,
				u.avatar_url,
				COUNT(t.id) as total_trades,
				SUM(CASE WHEN t.type = 'sell' THEN t.amount * (t.price - t.average_buy_price)
					ELSE 0 END) as profit_loss,
				SUM(CASE WHEN t.type = 'sell' AND t.price > t.average_buy_price THEN 1
					ELSE 0 END)::float / 
				NULLIF(COUNT(CASE WHEN t.type = 'sell' THEN 1 END), 0) as win_rate
			FROM users u
			LEFT JOIN trades t ON t.user_id = u.id
			WHERE t.created_at >= $1 AND t.status = 'completed'
			GROUP BY u.id, u.username, u.avatar_url
		)
		SELECT 
			ROW_NUMBER() OVER (ORDER BY profit_loss DESC) as rank,
			user_id,
			username,
			avatar_url,
			profit_loss,
			CASE 
				WHEN profit_loss > 0 THEN profit_loss / ABS(profit_loss) * 100
				ELSE 0 
			END as profit_loss_percentage,
			total_trades,
			COALESCE(win_rate, 0) as win_rate
		FROM user_profits
		ORDER BY profit_loss DESC
		LIMIT $2
	`

	rows, err := s.db.Query(ctx, query, startTime, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []model.LeaderboardEntry
	for rows.Next() {
		var entry model.LeaderboardEntry
		err := rows.Scan(
			&entry.Rank,
			&entry.UserID,
			&entry.Username,
			&entry.AvatarURL,
			&entry.ProfitLoss,
			&entry.ProfitLossPercentage,
			&entry.TotalTrades,
			&entry.WinRate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard entry: %w", err)
		}
		entries = append(entries, entry)
	}

	// Get total users count
	var totalUsers int
	err = s.db.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM trades WHERE created_at >= $1`, startTime).Scan(&totalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total users: %w", err)
	}

	return &model.Leaderboard{
		Timeframe:  timeframe,
		Entries:    entries,
		TotalUsers: totalUsers,
		UpdatedAt:  time.Now(),
	}, nil
}

func (s *LeaderboardService) GetUserRank(ctx context.Context, userID string, timeframe string) (*model.UserRank, error) {
	startTime := getStartTimeForTimeframe(timeframe)

	query := `
		WITH user_profits AS (
			SELECT 
				user_id,
				SUM(CASE WHEN type = 'sell' THEN amount * (price - average_buy_price)
					ELSE 0 END) as profit_loss
			FROM trades
			WHERE created_at >= $1 AND status = 'completed'
			GROUP BY user_id
		),
		user_ranks AS (
			SELECT 
				user_id,
				profit_loss,
				CASE 
					WHEN profit_loss > 0 THEN profit_loss / ABS(profit_loss) * 100
					ELSE 0 
				END as profit_loss_percentage,
				ROW_NUMBER() OVER (ORDER BY profit_loss DESC) as rank,
				COUNT(*) OVER () as total_users
			FROM user_profits
		)
		SELECT 
			rank,
			profit_loss,
			profit_loss_percentage,
			total_users,
			(rank::float / total_users * 100) as top_percentile
		FROM user_ranks
		WHERE user_id = $2
	`

	var rank model.UserRank
	err := s.db.QueryRow(ctx, query, startTime, userID).Scan(
		&rank.Rank,
		&rank.ProfitLoss,
		&rank.ProfitLossPercentage,
		&rank.TotalUsers,
		&rank.TopPercentile,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user rank: %w", err)
	}

	return &rank, nil
}

func getStartTimeForTimeframe(timeframe string) time.Time {
	now := time.Now()
	switch timeframe {
	case "24h":
		return now.AddDate(0, 0, -1)
	case "7d":
		return now.AddDate(0, 0, -7)
	case "30d":
		return now.AddDate(0, 0, -30)
	default:
		return now.AddDate(0, 0, -1)
	}
} 