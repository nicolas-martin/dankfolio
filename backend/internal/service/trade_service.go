package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

// TradeService handles trade-related operations
type TradeService struct {
	solanaService *SolanaTradeService
	mu            sync.RWMutex
	trades        map[string]*model.Trade // In-memory storage using trade ID as key
}

// NewTradeService creates a new TradeService instance
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
		UserID:     "", // Empty for now, would be populated from auth context in a real app
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

// TradeQuote represents the result of a quote request
type TradeQuote struct {
	EstimatedAmount string   `json:"estimatedAmount"`
	ExchangeRate    string   `json:"exchangeRate"`
	Fee             TradeFee `json:"fee"`
}

// TradeFee represents fee information for a trade
type TradeFee struct {
	Total  string `json:"total"`
	Spread string `json:"spread"`
	Gas    string `json:"gas"`
}

// GetTradeQuote estimates the result of a trade without executing it
func (s *TradeService) GetTradeQuote(ctx context.Context, fromCoinID, toCoinID string, amount float64) (*TradeQuote, error) {
	// Get coin data
	// In a real implementation, this would query a database or external API
	fromCoin, toCoin, err := s.getCoins(fromCoinID, toCoinID)
	if err != nil {
		return nil, err
	}

	// Calculate estimated result (simplified simulation)
	// In a real implementation, this would call the Raydium API for proper quotes
	exchangeRate := toCoin.Price / fromCoin.Price
	estimatedAmount := amount * exchangeRate

	// Calculate fees (simplified)
	spreadFee := 0.003                // 0.3%
	gasFee := 0.0005 * fromCoin.Price // Simplified gas fee estimation

	// Total fee in USD
	totalFee := (spreadFee * amount * fromCoin.Price) + gasFee

	// Format values as strings
	spreadPercentage := spreadFee * 100

	return &TradeQuote{
		EstimatedAmount: fmt.Sprintf("%.6f", estimatedAmount),
		ExchangeRate:    fmt.Sprintf("1 %s = %.6f %s", fromCoin.Symbol, exchangeRate, toCoin.Symbol),
		Fee: TradeFee{
			Total:  fmt.Sprintf("%.4f", totalFee),
			Spread: fmt.Sprintf("%.2f", spreadPercentage),
			Gas:    fmt.Sprintf("%.6f", gasFee/fromCoin.Price),
		},
	}, nil
}

// getCoins returns information about two coins (simplified)
// In a real implementation, this would query a database
func (s *TradeService) getCoins(fromCoinID, toCoinID string) (*model.Coin, *model.Coin, error) {
	// Mock coin data for simulation
	coins := map[string]model.Coin{
		"So11111111111111111111111111111111111111112": {
			ID:     "So11111111111111111111111111111111111111112",
			Name:   "Solana",
			Symbol: "SOL",
			Price:  150.0,
		},
		"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
			ID:     "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			Name:   "USD Coin",
			Symbol: "USDC",
			Price:  1.0,
		},
		"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
			ID:     "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
			Name:   "Tether",
			Symbol: "USDT",
			Price:  1.0,
		},
	}

	fromCoin, ok := coins[fromCoinID]
	if !ok {
		return nil, nil, fmt.Errorf("coin with ID %s not found", fromCoinID)
	}

	toCoin, ok := coins[toCoinID]
	if !ok {
		return nil, nil, fmt.Errorf("coin with ID %s not found", toCoinID)
	}

	return &fromCoin, &toCoin, nil
}
