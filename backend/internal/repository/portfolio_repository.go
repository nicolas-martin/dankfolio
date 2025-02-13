package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// PortfolioRepository defines the interface for portfolio data access
type PortfolioRepository interface {
	GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error)
	GetPortfolioHistory(ctx context.Context, userID string, startTime time.Time) ([]model.PortfolioSnapshot, error)
	GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error)
	GetUserRank(ctx context.Context, userID string) (*model.UserRank, error)
	GetLeaderboard(ctx context.Context, startTime time.Time, limit int) (*model.Leaderboard, error)
}

// portfolioRepository implements PortfolioRepository interface
type portfolioRepository struct {
	db db.DB
}

// NewPortfolioRepository creates a new PortfolioRepository instance
func NewPortfolioRepository(db db.DB) PortfolioRepository {
	return &portfolioRepository{db: db}
}

func (r *portfolioRepository) GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error) {
	query := `
		SELECT 
			h.coin_id,
			h.amount,
			h.average_buy_price,
			COALESCE(h.amount, 0) as quantity,
			COALESCE(h.amount * h.average_buy_price, 0) as value,
			h.updated_at
		FROM portfolios h
		WHERE h.user_id = $1
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query portfolio: %w", err)
	}
	defer rows.Close()

	var holdings []model.MemeHolding
	for rows.Next() {
		var holding model.MemeHolding
		err := rows.Scan(
			&holding.CoinID,
			&holding.Amount,
			&holding.AverageBuyPrice,
			&holding.Quantity,
			&holding.Value,
			&holding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan portfolio row: %w", err)
		}
		holdings = append(holdings, holding)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating portfolio rows: %w", err)
	}

	return &model.Portfolio{
		UserID:   userID,
		Holdings: holdings,
	}, nil
}

func (r *portfolioRepository) GetPortfolioHistory(ctx context.Context, userID string, startTime time.Time) ([]model.PortfolioSnapshot, error) {
	query := `
		SELECT 
			timestamp,
			total_value,
			daily_change,
			daily_change_percent
		FROM portfolio_history
		WHERE user_id = $1 AND timestamp >= $2
		ORDER BY timestamp ASC
	`

	rows, err := r.db.Query(ctx, query, userID, startTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query portfolio history: %w", err)
	}
	defer rows.Close()

	var snapshots []model.PortfolioSnapshot
	for rows.Next() {
		var snapshot model.PortfolioSnapshot
		err := rows.Scan(
			&snapshot.Timestamp,
			&snapshot.TotalValue,
			&snapshot.DailyChange,
			&snapshot.DailyChangePercent,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan portfolio history row: %w", err)
		}
		snapshots = append(snapshots, snapshot)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating portfolio history rows: %w", err)
	}

	return snapshots, nil
}

func (r *portfolioRepository) GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error) {
	query := `
		SELECT 
			total_value,
			total_cost,
			total_profit,
			total_profit_percent,
			daily_profit,
			daily_profit_percent,
			weekly_profit,
			weekly_profit_percent,
			monthly_profit,
			monthly_profit_percent
		FROM portfolio_stats
		WHERE user_id = $1
	`

	stats := &model.PortfolioStats{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&stats.TotalValue,
		&stats.TotalCost,
		&stats.TotalProfit,
		&stats.TotalProfitPercent,
		&stats.DailyProfit,
		&stats.DailyProfitPercent,
		&stats.WeeklyProfit,
		&stats.WeeklyProfitPercent,
		&stats.MonthlyProfit,
		&stats.MonthlyProfitPercent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get portfolio stats: %w", err)
	}

	return stats, nil
}

func (r *portfolioRepository) GetUserRank(ctx context.Context, userID string) (*model.UserRank, error) {
	query := `
		WITH user_stats AS (
			SELECT 
				total_value,
				total_profit_percent,
				ROW_NUMBER() OVER (ORDER BY total_value DESC) as rank
			FROM portfolio_stats
		)
		SELECT 
			rank,
			total_value,
			total_profit_percent
		FROM user_stats
		WHERE user_id = $1
	`

	rank := &model.UserRank{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&rank.Rank,
		&rank.TotalValue,
		&rank.TotalProfitPercent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user rank: %w", err)
	}

	return rank, nil
}

func (r *portfolioRepository) GetLeaderboard(ctx context.Context, startTime time.Time, limit int) (*model.Leaderboard, error) {
	query := `
		SELECT 
			u.username,
			ps.total_value,
			ps.total_profit_percent,
			ROW_NUMBER() OVER (ORDER BY ps.total_value DESC) as rank
		FROM portfolio_stats ps
		JOIN users u ON u.id = ps.user_id
		ORDER BY ps.total_value DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []model.LeaderboardEntry
	for rows.Next() {
		var entry model.LeaderboardEntry
		err := rows.Scan(
			&entry.Username,
			&entry.TotalValue,
			&entry.TotalProfitPercent,
			&entry.Rank,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard row: %w", err)
		}
		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating leaderboard rows: %w", err)
	}

	return &model.Leaderboard{
		Entries:    entries,
		UpdatedAt:  time.Now(),
		StartTime:  startTime,
		TotalUsers: len(entries),
	}, nil
}
