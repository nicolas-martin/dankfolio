package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/errors"
)

type TradeService struct {
	db           *pgxpool.Pool
	coinService  *CoinService
	walletService *WalletService
}

func NewTradeService(db *pgxpool.Pool, cs *CoinService, ws *WalletService) *TradeService {
	return &TradeService{
		db:           db,
		coinService:  cs,
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
		CoinSymbol:    coin.Symbol,
		Type:          req.Type,
		Amount:        amount,
		Price:         price,
		Fee:           fee,
		Slippage:      slippage,
		FinalAmount:   finalAmount,
		TotalCost:     amount * price,
	}, nil
}

func (s *TradeService) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create trade record
	trade := &model.Trade{
		UserID:    req.UserID,
		CoinID:    req.CoinID,
		Type:      req.Type,
		Amount:    req.Amount,
		Price:     req.Price,
		Fee:       calculateTradeFee(req.Amount, req.Price),
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	// Insert trade record
	err = s.insertTrade(ctx, tx, trade)
	if err != nil {
		return nil, err
	}

	// Update portfolio
	err = s.updatePortfolio(ctx, tx, trade)
	if err != nil {
		return nil, err
	}

	// Execute blockchain transaction
	txHash, err := s.walletService.ExecuteTradeTransaction(ctx, trade)
	if err != nil {
		trade.Status = "failed"
		s.updateTradeStatus(ctx, tx, trade.ID, "failed")
		return nil, fmt.Errorf("blockchain transaction failed: %w", err)
	}

	trade.TransactionHash = txHash
	trade.Status = "completed"
	
	err = s.updateTradeStatus(ctx, tx, trade.ID, "completed")
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
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
	var query string
	if trade.Type == "buy" {
		query = `
			INSERT INTO portfolios (user_id, coin_id, amount, average_buy_price)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id, coin_id) DO UPDATE
			SET amount = portfolios.amount + $3,
				average_buy_price = (portfolios.amount * portfolios.average_buy_price + $3 * $4) / (portfolios.amount + $3)
		`
	} else {
		query = `
			UPDATE portfolios
			SET amount = amount - $3
			WHERE user_id = $1 AND coin_id = $2
		`
	}

	_, err := tx.Exec(ctx, query, trade.UserID, trade.CoinID, trade.Amount, trade.Price)
	if err != nil {
		return fmt.Errorf("failed to update portfolio: %w", err)
	}

	return nil
}

func calculateTradeFee(amount, price float64) float64 {
	return amount * price * 0.001 // 0.1% fee
}

func calculateSlippage(tradeAmount, volume24h float64) float64 {
	return (tradeAmount / volume24h) * 100
} 