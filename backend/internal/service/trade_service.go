package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type TradeService struct {
	db            db.DB
	coinService   *CoinService
	walletService *WalletService
}

func NewTradeService(db db.DB, cs *CoinService, ws *WalletService) *TradeService {
	return &TradeService{
		db:            db,
		coinService:   cs,
		walletService: ws,
	}
}

func (s *TradeService) PreviewTrade(ctx context.Context, req model.TradeRequest) (*model.TradePreview, error) {
	// Get current coin price
	coin, err := s.coinService.GetCoinByID(ctx, req.CoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}

	// Calculate trade details
	amount := req.Amount
	price := coin.CurrentPrice
	fee := calculateTradeFee(amount, price)
	slippage := calculateSlippage(amount, coin.Volume24h)

	finalAmount := amount
	if req.Type == "buy" {
		finalAmount = amount - fee
	} else {
		finalAmount = amount + fee
	}

	return &model.TradePreview{
		CoinSymbol:  coin.Symbol,
		Type:        req.Type,
		Amount:      amount,
		Price:       price,
		Fee:         fee,
		Slippage:    slippage,
		FinalAmount: finalAmount,
		TotalCost:   amount * price,
	}, nil
}

func (s *TradeService) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current coin price
	coin, err := s.coinService.GetCoinByID(ctx, req.CoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}
	if coin == nil {
		return nil, fmt.Errorf("coin not found: %s", req.CoinID)
	}

	// For sell orders, verify user has enough coins
	if req.Type == "sell" {
		var currentAmount float64
		err := tx.QueryRow(ctx, `
			SELECT COALESCE(amount, 0)
			FROM portfolios
			WHERE user_id = $1 AND coin_id = $2
		`, req.UserID, req.CoinID).Scan(&currentAmount)

		if err != nil && err != pgx.ErrNoRows {
			return nil, fmt.Errorf("failed to check portfolio balance: %w", err)
		}

		if currentAmount < req.Amount {
			return nil, fmt.Errorf("insufficient balance: have %.2f, want %.2f", currentAmount, req.Amount)
		}
	}

	// Create trade record
	trade := &model.Trade{
		ID:          fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		UserID:      req.UserID,
		CoinID:      req.CoinID,
		CoinSymbol:  coin.Symbol,
		Type:        req.Type,
		Amount:      req.Amount,
		Price:       coin.Price,
		Fee:         calculateTradeFee(req.Amount, coin.Price),
		Status:      "completed", // Set status to completed immediately
		CreatedAt:   time.Now(),
		CompletedAt: time.Now(), // Set completed_at timestamp
	}

	// Insert trade record
	err = s.insertTrade(ctx, tx, trade)
	if err != nil {
		return nil, fmt.Errorf("failed to insert trade: %w", err)
	}

	// Update portfolio
	err = s.updatePortfolio(ctx, tx, trade)
	if err != nil {
		return nil, fmt.Errorf("failed to update portfolio: %w", err)
	}

	// Commit transaction
	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return trade, nil
}

func (s *TradeService) GetTradeHistory(ctx context.Context, userID string) ([]model.Trade, error) {
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

	rows, err := s.db.Query(ctx, query, userID)
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

func (s *TradeService) updatePortfolio(ctx context.Context, tx pgx.Tx, trade *model.Trade) error {
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

func calculateTradeFee(amount, price float64) float64 {
	return amount * price * 0.001 // 0.1% fee
}

func calculateSlippage(tradeAmount, volume24h float64) float64 {
	return (tradeAmount / volume24h) * 100
}

func (s *TradeService) insertTrade(ctx context.Context, tx pgx.Tx, trade *model.Trade) error {
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

func (s *TradeService) updateTradeStatus(ctx context.Context, tradeID string, status string, txHash string) error {
	query := `
		UPDATE trades
		SET status = $1::varchar, 
		    transaction_hash = $2,
		    completed_at = CASE WHEN $1::varchar = 'completed' THEN NOW() ELSE NULL END
		WHERE id = $3
	`

	_, err := s.db.Exec(ctx, query, status, txHash, tradeID)
	if err != nil {
		return fmt.Errorf("failed to update trade status: %w", err)
	}

	return nil
}
