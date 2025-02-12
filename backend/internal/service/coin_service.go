package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type CoinService struct {
	db *pgxpool.Pool
}

func NewCoinService(db *pgxpool.Pool) *CoinService {
	return &CoinService{db: db}
}

func (s *CoinService) GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
	query := `
		WITH latest_prices AS (
			SELECT DISTINCT ON (coin_id) 
				coin_id, 
				price,
				market_cap,
				volume_24h,
				timestamp
			FROM price_history
			ORDER BY coin_id, timestamp DESC
		)
		SELECT 
			mc.id,
			mc.symbol,
			mc.name,
			mc.contract_address,
			mc.logo_url,
			lp.price,
			lp.market_cap,
			lp.volume_24h
		FROM meme_coins mc
		JOIN latest_prices lp ON lp.coin_id = mc.id
		ORDER BY lp.volume_24h DESC
		LIMIT $1
	`

	rows, err := s.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query top meme coins: %w", err)
	}
	defer rows.Close()

	var coins []model.MemeCoin
	for rows.Next() {
		var coin model.MemeCoin
		err := rows.Scan(
			&coin.ID,
			&coin.Symbol,
			&coin.Name,
			&coin.ContractAddress,
			&coin.LogoURL,
			&coin.CurrentPrice,
			&coin.MarketCap,
			&coin.Volume24h,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan meme coin row: %w", err)
		}
		coins = append(coins, coin)
	}

	return coins, nil
}

func (s *CoinService) GetPriceHistory(
	ctx context.Context,
	coinID string,
	startTime time.Time,
) ([]model.PricePoint, error) {
	query := `
		SELECT price, market_cap, volume_24h, timestamp
		FROM price_history
		WHERE coin_id = $1 AND timestamp >= $2
		ORDER BY timestamp ASC
	`

	rows, err := s.db.Query(ctx, query, coinID, startTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query price history: %w", err)
	}
	defer rows.Close()

	var prices []model.PricePoint
	for rows.Next() {
		var point model.PricePoint
		err := rows.Scan(
			&point.Price,
			&point.MarketCap,
			&point.Volume,
			&point.Timestamp,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan price point row: %w", err)
		}
		prices = append(prices, point)
	}

	return prices, nil
}

func (s *CoinService) UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, update := range updates {
		_, err := tx.Exec(ctx, `
			INSERT INTO price_history (
				coin_id, price, market_cap, volume_24h, timestamp
			) VALUES ($1, $2, $3, $4, $5)
		`,
			update.CoinID,
			update.Price,
			update.MarketCap,
			update.Volume24h,
			update.Timestamp,
		)
		if err != nil {
			return fmt.Errorf("failed to insert price update: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit price updates: %w", err)
	}

	return nil
} 