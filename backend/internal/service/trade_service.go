package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type TradeService struct {
	solanaService *SolanaTradeService
	mu            sync.RWMutex
	trades        map[string]*model.Trade // In-memory storage using trade ID as key
}

func NewTradeService(ss *SolanaTradeService) *TradeService {
	return &TradeService{
		solanaService: ss,
		trades:        make(map[string]*model.Trade),
	}
}

func (s *TradeService) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Create trade record
	trade := &model.Trade{
		ID:         fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		FromCoinID: req.FromCoinID,
		ToCoinID:   req.ToCoinID,
		Type:       "swap",
		Amount:     req.Amount,
		Fee:        calculateTradeFee(req.Amount, 1.0), // Using 1.0 as default price
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Execute signed transaction on blockchain
	err := s.solanaService.ExecuteTrade(ctx, trade, req.SignedTransaction)
	if err != nil {
		trade.Status = "failed"
		s.mu.Lock()
		s.trades[trade.ID] = trade
		s.mu.Unlock()
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", err)
	}

	// Update trade status and store in memory
	trade.Status = "completed"
	trade.CompletedAt = time.Now()

	s.mu.Lock()
	s.trades[trade.ID] = trade
	s.mu.Unlock()

	return trade, nil
}

// GetTradeByID returns a trade by its ID
func (s *TradeService) GetTradeByID(ctx context.Context, id string) (*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	trade, exists := s.trades[id]
	if !exists {
		return nil, fmt.Errorf("trade not found")
	}
	return trade, nil
}

// ListTrades returns all trades
func (s *TradeService) ListTrades(ctx context.Context) ([]model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var trades []model.Trade
	for _, trade := range s.trades {
		trades = append(trades, *trade)
	}
	return trades, nil
}

func calculateTradeFee(amount, price float64) float64 {
	// Simple 0.1% fee calculation
	return amount * price * 0.001
}
