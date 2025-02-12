package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// CoinRepository defines the interface for coin data access
type CoinRepository interface {
	GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error)
	GetPriceHistory(ctx context.Context, coinID string, startTime time.Time) ([]model.PricePoint, error)
	UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error
	GetCoinByID(ctx context.Context, coinID string) (*model.MemeCoin, error)
	GetCoinPriceHistory(ctx context.Context, coinID string, startTime time.Time, endTime time.Time) ([]model.PricePoint, error)
}

// coinRepository implements CoinRepository interface
type coinRepository struct {
	db db.DB
}

// NewCoinRepository creates a new CoinRepository instance
func NewCoinRepository(db db.DB) CoinRepository {
	return &coinRepository{db: db}
}

func (r *coinRepository) GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
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
			COALESCE(mc.logo_url, ''),
			lp.price,
			lp.market_cap,
			lp.volume_24h
		FROM meme_coins mc
		JOIN latest_prices lp ON lp.coin_id = mc.id
		ORDER BY lp.volume_24h DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
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

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating meme coins rows: %w", err)
	}

	return coins, nil
}

func (r *coinRepository) GetPriceHistory(ctx context.Context, coinID string, startTime time.Time) ([]model.PricePoint, error) {
	query := `
		SELECT price, market_cap, volume_24h, timestamp
		FROM price_history
		WHERE coin_id = $1 AND timestamp >= $2
		ORDER BY timestamp ASC
	`

	rows, err := r.db.Query(ctx, query, coinID, startTime.Unix())
	if err != nil {
		return nil, fmt.Errorf("failed to query price history: %w", err)
	}
	defer rows.Close()

	var prices []model.PricePoint
	for rows.Next() {
		var point model.PricePoint
		var timestamp int64
		err := rows.Scan(
			&point.Price,
			&point.MarketCap,
			&point.Volume,
			&timestamp,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan price point row: %w", err)
		}
		point.Time = time.Unix(timestamp, 0)
		point.Timestamp = timestamp
		prices = append(prices, point)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating price history rows: %w", err)
	}

	return prices, nil
}

func (r *coinRepository) UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error {
	tx, err := r.db.Begin(ctx)
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
			update.Timestamp.Unix(),
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

func (r *coinRepository) GetCoinByID(ctx context.Context, coinID string) (*model.MemeCoin, error) {
	query := `
		WITH latest_price AS (
			SELECT DISTINCT ON (coin_id) 
				coin_id, 
				price,
				market_cap,
				volume_24h,
				timestamp
			FROM price_history
			WHERE coin_id = $1
			ORDER BY coin_id, timestamp DESC
		)
		SELECT 
			mc.id,
			mc.symbol,
			mc.name,
			mc.contract_address,
			COALESCE(mc.logo_url, ''),
			COALESCE(lp.price, mc.price) as current_price,
			COALESCE(lp.market_cap, mc.market_cap, 0) as market_cap,
			COALESCE(lp.volume_24h, mc.volume_24h, 0) as volume_24h,
			mc.created_at,
			mc.updated_at
		FROM meme_coins mc
		LEFT JOIN latest_price lp ON lp.coin_id = mc.id
		WHERE mc.id = $1
	`

	coin := &model.MemeCoin{}
	err := r.db.QueryRow(ctx, query, coinID).Scan(
		&coin.ID,
		&coin.Symbol,
		&coin.Name,
		&coin.ContractAddress,
		&coin.LogoURL,
		&coin.CurrentPrice,
		&coin.MarketCap,
		&coin.Volume24h,
		&coin.CreatedAt,
		&coin.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}

	return coin, nil
}

func (r *coinRepository) GetCoinPriceHistory(ctx context.Context, coinID string, startTime time.Time, endTime time.Time) ([]model.PricePoint, error) {
	query := `
		SELECT price, market_cap, volume_24h, timestamp
		FROM price_history
		WHERE coin_id = $1 
		AND timestamp >= $2 
		AND timestamp <= $3
		ORDER BY timestamp ASC
	`

	rows, err := r.db.Query(ctx, query, coinID, startTime.Unix(), endTime.Unix())
	if err != nil {
		return nil, fmt.Errorf("failed to query price history: %w", err)
	}
	defer rows.Close()

	var prices []model.PricePoint
	for rows.Next() {
		var point model.PricePoint
		var timestamp int64
		err := rows.Scan(
			&point.Price,
			&point.MarketCap,
			&point.Volume,
			&timestamp,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan price point row: %w", err)
		}
		point.Time = time.Unix(timestamp, 0)
		point.Timestamp = timestamp
		prices = append(prices, point)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating price history rows: %w", err)
	}

	return prices, nil
}
