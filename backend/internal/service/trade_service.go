package service

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
)

type TradeService struct {
	coinService   *CoinService
	solanaService *SolanaTradeService
	tradeRepo     repository.TradeRepository
}

func NewTradeService(cs *CoinService, ss *SolanaTradeService, tr repository.TradeRepository) *TradeService {
	return &TradeService{
		coinService:   cs,
		solanaService: ss,
		tradeRepo:     tr,
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
		_ = s.tradeRepo.ExecuteTradeTransaction(ctx, trade)
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", err)
	}

	// Update trade status and execute database transaction
	trade.Status = "completed"
	trade.CompletedAt = time.Now()
	err = s.tradeRepo.ExecuteTradeTransaction(ctx, trade)
	if err != nil {
		return nil, fmt.Errorf("failed to save trade: %w", err)
	}

	return trade, nil
}

func calculateTradeFee(amount, price float64) float64 {
	// Simple 0.1% fee calculation
	return amount * price * 0.001
}

func calculateSlippage(amount, volume24h float64) float64 {
	// Simple slippage calculation based on trade size vs 24h volume
	return (amount / volume24h) * 100
}
