package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// TradeRepository defines the interface for trade data access
type TradeRepository interface {
	ExecuteTradeTransaction(ctx context.Context, trade *model.Trade) error
	GetTradeByID(ctx context.Context, id string) (*model.Trade, error)
	ListTrades(ctx context.Context) ([]model.Trade, error)
}

// PostgresTradeRepository implements TradeRepository interface
type PostgresTradeRepository struct {
	db db.DB
}

// NewTradeRepository creates a new TradeRepository instance
func NewTradeRepository(db db.DB) TradeRepository {
	return &PostgresTradeRepository{db: db}
}

func (r *PostgresTradeRepository) ExecuteTradeTransaction(ctx context.Context, trade *model.Trade) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert trade record
	query := `
		INSERT INTO trades (id, coin_id, type, amount, price, fee, status, tx_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id`

	err = tx.QueryRow(ctx,
		query,
		trade.ID,
		trade.CoinID,
		trade.Type,
		trade.Amount,
		trade.Price,
		trade.Fee,
		trade.Status,
		trade.TransactionHash,
		trade.CreatedAt,
	).Scan(&trade.ID)

	if err != nil {
		return fmt.Errorf("failed to insert trade: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *PostgresTradeRepository) GetTradeByID(ctx context.Context, id string) (*model.Trade, error) {
	query := `
		SELECT id, coin_id, type, amount, price, fee, status, tx_hash, created_at, completed_at
		FROM trades
		WHERE id = $1`

	trade := &model.Trade{}
	var completedAt interface{}

	err := r.db.QueryRow(ctx, query, id).Scan(
		&trade.ID,
		&trade.CoinID,
		&trade.Type,
		&trade.Amount,
		&trade.Price,
		&trade.Fee,
		&trade.Status,
		&trade.TransactionHash,
		&trade.CreatedAt,
		&completedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get trade: %w", err)
	}

	if completedAt != nil {
		trade.CompletedAt = completedAt.(time.Time)
	}

	return trade, nil
}

func (r *PostgresTradeRepository) ListTrades(ctx context.Context) ([]model.Trade, error) {
	query := `
		SELECT id, coin_id, type, amount, price, fee, status, tx_hash, created_at, completed_at
		FROM trades
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query trades: %w", err)
	}
	defer rows.Close()

	var trades []model.Trade
	for rows.Next() {
		var t model.Trade
		var completedAt interface{}

		err := rows.Scan(
			&t.ID,
			&t.CoinID,
			&t.Type,
			&t.Amount,
			&t.Price,
			&t.Fee,
			&t.Status,
			&t.TransactionHash,
			&t.CreatedAt,
			&completedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan trade: %w", err)
		}

		if completedAt != nil {
			t.CompletedAt = completedAt.(time.Time)
		}

		trades = append(trades, t)
	}

	return trades, nil
}
