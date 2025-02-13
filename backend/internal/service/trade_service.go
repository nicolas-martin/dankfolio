package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type TradeService struct {
	coinService   *CoinService
	solanaService *SolanaTradeService
	mu            sync.RWMutex
	trades        map[string]*model.Trade // In-memory storage using trade ID as key
}

func NewTradeService(cs *CoinService, ss *SolanaTradeService) *TradeService {
	return &TradeService{
		coinService:   cs,
		solanaService: ss,
		trades:        make(map[string]*model.Trade),
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

	// Calculate final amount
	totalCost := amount * price
	amount = amount - fee

	return &model.TradePreview{
		CoinSymbol:  coin.Symbol,
		Type:        req.Type,
		Amount:      amount,
		Price:       price,
		Fee:         fee,
		Slippage:    slippage,
		FinalAmount: amount,
		TotalCost:   totalCost,
	}, nil
}

func (s *TradeService) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Get coin details
	coin, err := s.coinService.GetCoinByID(ctx, req.CoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}

	// Create trade record
	trade := &model.Trade{
		ID:         fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		CoinID:     req.CoinID,
		CoinSymbol: coin.Symbol,
		Type:       req.Type,
		Amount:     req.Amount,
		Price:      coin.CurrentPrice,
		Fee:        calculateTradeFee(req.Amount, coin.CurrentPrice),
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Execute trade on blockchain
	err = s.solanaService.ExecuteTrade(ctx, trade)
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

func calculateSlippage(amount, volume24h float64) float64 {
	// Simple slippage calculation based on trade size vs 24h volume
	return (amount / volume24h) * 100
}
