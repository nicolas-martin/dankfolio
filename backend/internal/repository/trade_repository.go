package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// TradeRepository defines the interface for trade data access
type TradeRepository interface {
	InsertTrade(ctx context.Context, tx pgx.Tx, trade *model.Trade) error
	UpdateTradeStatus(ctx context.Context, tx pgx.Tx, tradeID string, status string, txHash string) error
	UpdatePortfolio(ctx context.Context, tx pgx.Tx, trade *model.Trade) error
	GetTradeHistory(ctx context.Context, userID string) ([]model.Trade, error)
	ExecuteTradeTransaction(ctx context.Context, trade *model.Trade) error
}

// tradeRepository implements TradeRepository interface
type tradeRepository struct {
	db db.DB
}

// NewTradeRepository creates a new TradeRepository instance
func NewTradeRepository(db db.DB) TradeRepository {
	return &tradeRepository{db: db}
}

func (r *tradeRepository) InsertTrade(ctx context.Context, tx pgx.Tx, trade *model.Trade) error {
	query := `
		INSERT INTO trades (
			id, user_id, coin_id, coin_symbol, type, amount, price,
			fee, status, transaction_hash, created_at, completed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := tx.Exec(ctx, query,
		trade.ID,
		trade.UserID,
		trade.CoinID,
		trade.CoinSymbol,
		trade.Type,
		trade.Amount,
		trade.Price,
		trade.Fee,
		trade.Status,
		trade.TransactionHash,
		trade.CreatedAt,
		trade.CompletedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to insert trade: %w", err)
	}

	return nil
}

func (r *tradeRepository) UpdateTradeStatus(ctx context.Context, tx pgx.Tx, tradeID string, status string, txHash string) error {
	var completedAt *time.Time
	if status == "completed" {
		now := time.Now()
		completedAt = &now
	}

	_, err := tx.Exec(ctx, `
		UPDATE trades 
		SET status = $2, transaction_hash = $3, completed_at = $4
		WHERE id = $1
	`, tradeID, status, txHash, completedAt)

	if err != nil {
		return fmt.Errorf("failed to update trade status: %w", err)
	}

	return nil
}

func (r *tradeRepository) UpdatePortfolio(ctx context.Context, tx pgx.Tx, trade *model.Trade) error {
	if trade.Type == "buy" {
		query := `
			INSERT INTO portfolios (id, user_id, coin_id, amount, average_buy_price)
			SELECT 
				'portfolio_' || $1 || '_' || $2,  -- Generate ID
				$1,  -- user_id
				$2,  -- coin_id
				$3,  -- amount
				$4   -- price
			ON CONFLICT (user_id, coin_id) DO UPDATE
			SET amount = portfolios.amount + $3,
				average_buy_price = (portfolios.amount * portfolios.average_buy_price + $3 * $4) / (portfolios.amount + $3)
		`
		_, err := tx.Exec(ctx, query,
			trade.UserID,
			trade.CoinID,
			trade.Amount,
			trade.Price,
		)
		if err != nil {
			return fmt.Errorf("failed to update portfolio: %w", err)
		}
	} else {
		query := `
			UPDATE portfolios
			SET amount = amount - $3
			WHERE user_id = $1 AND coin_id = $2
		`
		_, err := tx.Exec(ctx, query,
			trade.UserID,
			trade.CoinID,
			trade.Amount,
		)
		if err != nil {
			return fmt.Errorf("failed to update portfolio: %w", err)
		}
	}

	return nil
}

func (r *tradeRepository) GetTradeHistory(ctx context.Context, userID string) ([]model.Trade, error) {
	query := `
		SELECT 
			t.id, t.user_id, t.coin_id, t.type, t.amount, 
			t.price, t.fee, t.transaction_hash, t.status, 
			t.created_at, mc.symbol
		FROM trades t
		JOIN meme_coins mc ON mc.id = t.coin_id
		WHERE t.user_id = $1
		ORDER BY t.created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query trade history: %w", err)
	}
	defer rows.Close()

	var trades []model.Trade
	for rows.Next() {
		var t model.Trade
		err := rows.Scan(
			&t.ID, &t.UserID, &t.CoinID, &t.Type, &t.Amount,
			&t.Price, &t.Fee, &t.TransactionHash, &t.Status,
			&t.CreatedAt, &t.CoinSymbol,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan trade row: %w", err)
		}
		trades = append(trades, t)
	}

	return trades, nil
}

func (r *tradeRepository) ExecuteTradeTransaction(ctx context.Context, trade *model.Trade) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert trade record
	err = r.InsertTrade(ctx, tx, trade)
	if err != nil {
		return err
	}

	// Update portfolio
	err = r.UpdatePortfolio(ctx, tx, trade)
	if err != nil {
		return err
	}

	// Update trade status
	err = r.UpdateTradeStatus(ctx, tx, trade.ID, trade.Status, trade.TransactionHash)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
