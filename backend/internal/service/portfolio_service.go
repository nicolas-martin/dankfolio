package service

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/util"
)

type PortfolioService struct {
	db          db.DB
	coinService *CoinService
}

func NewPortfolioService(db db.DB, cs *CoinService) *PortfolioService {
	return &PortfolioService{
		db:          db,
		coinService: cs,
	}
}

func (s *PortfolioService) GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error) {
	query := `
		SELECT 
			p.coin_id,
			mc.symbol,
			mc.name,
			p.amount,
			p.average_buy_price,
			COALESCE(ph.price, 0) as current_price
		FROM portfolios p
		JOIN meme_coins mc ON mc.id = p.coin_id
		LEFT JOIN LATERAL (
			SELECT price
			FROM price_history
			WHERE coin_id = p.coin_id
			ORDER BY timestamp DESC
			LIMIT 1
		) ph ON true
		WHERE p.user_id = $1 AND p.amount > 0
	`

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query portfolio: %w", err)
	}
	defer rows.Close()

	portfolio := &model.Portfolio{
		UserID: userID,
		Assets: make([]model.PortfolioAsset, 0),
	}

	for rows.Next() {
		var asset model.PortfolioAsset
		err := rows.Scan(
			&asset.CoinID,
			&asset.Symbol,
			&asset.Name,
			&asset.Amount,
			&asset.AverageBuyPrice,
			&asset.CurrentPrice,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan portfolio row: %w", err)
		}

		asset.Value = asset.Amount * asset.CurrentPrice
		asset.ProfitLoss = asset.Value - (asset.Amount * asset.AverageBuyPrice)
		asset.ProfitLossPerc = (asset.CurrentPrice - asset.AverageBuyPrice) / asset.AverageBuyPrice * 100

		portfolio.Assets = append(portfolio.Assets, asset)
		portfolio.TotalValue += asset.Value
		portfolio.TotalProfitLoss += asset.ProfitLoss
	}

	if len(portfolio.Assets) > 0 {
		portfolio.TotalProfitLossPercentage = portfolio.TotalProfitLoss / portfolio.TotalValue * 100
	}

	return portfolio, nil
}

func (s *PortfolioService) GetPortfolioHistory(
	ctx context.Context,
	userID string,
	timeframe string,
) ([]model.PortfolioSnapshot, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)

	query := `
		WITH daily_prices AS (
			SELECT 
				coin_id,
				date_trunc('day', timestamp) as date,
				last(price, timestamp) as price
			FROM price_history
			WHERE timestamp >= $2
			GROUP BY coin_id, date_trunc('day', timestamp)
		)
		SELECT 
			dp.date,
			SUM(p.amount * dp.price) as total_value
		FROM portfolios p
		JOIN daily_prices dp ON dp.coin_id = p.coin_id
		WHERE p.user_id = $1
		GROUP BY dp.date
		ORDER BY dp.date ASC
	`

	rows, err := s.db.Query(ctx, query, userID, startTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query portfolio history: %w", err)
	}
	defer rows.Close()

	var history []model.PortfolioSnapshot
	for rows.Next() {
		var snapshot model.PortfolioSnapshot
		err := rows.Scan(&snapshot.Timestamp, &snapshot.Value)
		if err != nil {
			return nil, fmt.Errorf("failed to scan portfolio history row: %w", err)
		}
		history = append(history, snapshot)
	}

	return history, nil
}

func (s *PortfolioService) GetLeaderboard(ctx context.Context, timeframe string, limit int) (*model.Leaderboard, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)

	query := `
		WITH user_stats AS (
			SELECT 
				u.id as user_id,
				u.username,
				u.avatar_url,
				SUM(CASE 
					WHEN t.type = 'sell' THEN t.amount * (t.price - t.average_buy_price)
					ELSE 0 
				END) as profit_loss,
				COUNT(*) as total_trades,
				COUNT(CASE WHEN t.type = 'sell' AND t.price > t.average_buy_price THEN 1 END) as winning_trades
			FROM users u
			JOIN trades t ON t.user_id = u.id
			WHERE t.created_at >= $1
			GROUP BY u.id, u.username, u.avatar_url
		)
		SELECT 
			ROW_NUMBER() OVER (ORDER BY profit_loss DESC) as rank,
			user_id,
			username,
			avatar_url,
			profit_loss,
			CASE WHEN total_trades > 0 
				THEN (winning_trades::float / total_trades::float) * 100 
				ELSE 0 
			END as win_rate,
			total_trades
		FROM user_stats
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
			&entry.WinRate,
			&entry.TotalTrades,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard entry: %w", err)
		}
		entries = append(entries, entry)
	}

	// Get total users for the timeframe
	var totalUsers int
	err = s.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT user_id) 
		FROM trades 
		WHERE created_at >= $1
	`, startTime).Scan(&totalUsers)
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

func (s *PortfolioService) GetUserRank(ctx context.Context, userID string, timeframe string) (*model.UserRank, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)

	query := `
		WITH user_profits AS (
			SELECT 
				user_id,
				SUM(CASE 
					WHEN type = 'sell' THEN amount * (price - average_buy_price)
					ELSE 0 
				END) as profit_loss
			FROM trades
			WHERE created_at >= $1
			GROUP BY user_id
		),
		user_ranks AS (
			SELECT 
				user_id,
				profit_loss,
				ROW_NUMBER() OVER (ORDER BY profit_loss DESC) as rank,
				COUNT(*) OVER () as total_users
			FROM user_profits
		)
		SELECT rank, profit_loss, total_users
		FROM user_ranks
		WHERE user_id = $2
	`

	var rank model.UserRank
	err := s.db.QueryRow(ctx, query, startTime, userID).Scan(
		&rank.Rank,
		&rank.ProfitLoss,
		&rank.TotalUsers,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user rank: %w", err)
	}

	// Calculate percentile
	rank.TopPercentile = (float64(rank.Rank) / float64(rank.TotalUsers)) * 100

	return &rank, nil
}

func (s *PortfolioService) GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error) {
	query := `
		WITH trade_stats AS (
			SELECT 
				COUNT(*) as total_trades,
				COUNT(CASE WHEN type = 'sell' AND price > average_buy_price THEN 1 END) as winning_trades,
				SUM(CASE 
					WHEN type = 'sell' THEN amount * (price - average_buy_price)
					ELSE 0 
				END) as total_profit_loss
			FROM trades
			WHERE user_id = $1 AND status = 'completed'
		)
		SELECT 
			total_trades,
			winning_trades,
			total_profit_loss,
			CASE WHEN total_trades > 0 
				THEN (winning_trades::float / total_trades::float) * 100 
				ELSE 0 
			END as win_rate
		FROM trade_stats
	`

	stats := &model.PortfolioStats{}
	err := s.db.QueryRow(ctx, query, userID).Scan(
		&stats.TotalTrades,
		&stats.WinningTrades,
		&stats.TotalProfitLoss,
		&stats.WinRate,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get portfolio stats: %w", err)
	}

	return stats, nil
}

func (s *PortfolioService) calculatePortfolioAssets(ctx context.Context, holdings []model.MemeHolding) ([]model.PortfolioAsset, error) {
	var assets []model.PortfolioAsset
	for _, holding := range holdings {
		coin, err := s.coinService.GetCoinByID(ctx, holding.CoinID)
		if err != nil {
			return nil, fmt.Errorf("failed to get coin %s: %w", holding.CoinID, err)
		}

		value := holding.Amount * coin.CurrentPrice
		profitLoss := value - (holding.Amount * holding.AverageBuyPrice)
		profitLossPerc := (profitLoss / (holding.Amount * holding.AverageBuyPrice)) * 100

		asset := model.PortfolioAsset{
			CoinID:          coin.ID,
			Symbol:          coin.Symbol,
			Name:            coin.Name,
			Amount:          holding.Amount,
			CurrentPrice:    coin.CurrentPrice,
			Value:           value,
			AverageBuyPrice: holding.AverageBuyPrice,
			ProfitLoss:      profitLoss,
			ProfitLossPerc:  profitLossPerc,
			LastUpdated:     time.Now(),
		}
		assets = append(assets, asset)
	}
	return assets, nil
}
