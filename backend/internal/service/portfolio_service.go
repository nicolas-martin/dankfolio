package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type PortfolioService struct {
	db          *pgxpool.Pool
	coinService *CoinService
}

func NewPortfolioService(db *pgxpool.Pool, cs *CoinService) *PortfolioService {
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
		asset.ProfitLossPercentage = (asset.CurrentPrice - asset.AverageBuyPrice) / asset.AverageBuyPrice * 100

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
	startTime := getStartTimeForTimeframe(timeframe)

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

func getStartTimeForTimeframe(timeframe string) time.Time {
	now := time.Now()
	switch timeframe {
	case "day":
		return now.AddDate(0, 0, -1)
	case "week":
		return now.AddDate(0, 0, -7)
	case "month":
		return now.AddDate(0, -1, 0)
	case "year":
		return now.AddDate(-1, 0, 0)
	default:
		return now.AddDate(0, -1, 0)
	}
} 