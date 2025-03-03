package trade

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/solana"
)

// Service handles trade-related operations
type Service struct {
	solanaService *solana.SolanaTradeService
	coinService   *coin.Service
	mu            sync.RWMutex
	trades        map[string]*model.Trade // In-memory storage using trade ID as key
}

// NewService creates a new TradeService instance
func NewService(ss *solana.SolanaTradeService, cs *coin.Service) *Service {
	return &Service{
		solanaService: ss,
		coinService:   cs,
		trades:        make(map[string]*model.Trade),
	}
}

// ExecuteTrade executes a trade based on the provided request
func (s *Service) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Create trade record
	trade := &model.Trade{
		ID:         fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		FromCoinID: req.FromCoinID,
		ToCoinID:   req.ToCoinID,
		Type:       "swap",
		Amount:     req.Amount,
		Fee:        CalculateTradeFee(req.Amount, 1.0), // Using 1.0 as default price
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

// GetTradeByID retrieves a trade by its ID
func (s *Service) GetTradeByID(ctx context.Context, id string) (*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	trade, found := s.trades[id]
	if !found {
		return nil, fmt.Errorf("trade not found: %s", id)
	}

	return trade, nil
}

// ListTrades returns a list of all trades
func (s *Service) ListTrades(ctx context.Context) ([]*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	trades := make([]*model.Trade, 0, len(s.trades))
	for _, trade := range s.trades {
		trades = append(trades, trade)
	}

	return trades, nil
}

// GetTradeQuote gets a quote for a potential trade
func (s *Service) GetTradeQuote(ctx context.Context, fromCoinID, toCoinID string, amount float64) (*TradeQuote, error) {
	// Validate input
	if fromCoinID == "" {
		return nil, fmt.Errorf("fromCoinID is required")
	}

	if toCoinID == "" {
		return nil, fmt.Errorf("toCoinID is required")
	}

	if amount <= 0 {
		return nil, fmt.Errorf("amount must be greater than 0")
	}

	// Create a function to get token decimals
	getTokenDecimals := func(tokenID string) int {
		// Default to 6 decimals if we can't find the coin
		defaultDecimals := 6

		// SOL is a special case with 9 decimals
		if tokenID == solana.SolMint {
			return 9
		}

		// Try to get the coin info
		coin, err := s.coinService.GetCoinByID(ctx, tokenID)
		if err != nil {
			log.Printf("Warning: Could not get decimals for coin %s: %v. Using default %d",
				tokenID, err, defaultDecimals)
			return defaultDecimals
		}

		// If we found the coin but decimals is 0, use the default
		if coin.Decimals == 0 {
			log.Printf("Warning: Coin %s has 0 decimals. Using default %d",
				tokenID, defaultDecimals)
			return defaultDecimals
		}

		return coin.Decimals
	}

	// Get quote from Solana service
	estimatedAmount, exchangeRate, err := s.solanaService.GetSwapQuote(ctx, fromCoinID, toCoinID, amount, getTokenDecimals)
	if err != nil {
		log.Printf("Error getting swap quote: %v", err)
		return nil, fmt.Errorf("failed to get swap quote: %w", err)
	}

	// Calculate fees
	fee := CalculateTradeFee(amount, 1.0)

	// Create quote response
	quote := &TradeQuote{
		EstimatedAmount: fmt.Sprintf("%.8f", estimatedAmount),
		ExchangeRate:    fmt.Sprintf("%.8f", exchangeRate),
		Fee: TradeFee{
			Total:  fmt.Sprintf("%.8f", fee),
			Spread: fmt.Sprintf("%.8f", fee*0.8), // 80% of fee is spread
			Gas:    fmt.Sprintf("%.8f", fee*0.2), // 20% of fee is gas
		},
	}

	return quote, nil
}

// getFallbackQuote provides a fallback quote when the real quote service fails
// This is only used in development
func (s *Service) getFallbackQuote(fromCoinID, toCoinID string, amount float64) *TradeQuote {
	var estimatedAmount, exchangeRate float64

	// Use SOL mint address as reference
	solMint := "So11111111111111111111111111111111111111112"

	// Simulate reasonable exchange rates
	if fromCoinID == solMint {
		// SOL -> Token
		estimatedAmount = amount * 15.0
		exchangeRate = 15.0
	} else if toCoinID == solMint {
		// Token -> SOL
		estimatedAmount = amount * 0.066
		exchangeRate = 0.066
	} else {
		// Token -> Token
		estimatedAmount = amount * 1.2
		exchangeRate = 1.2
	}

	// Calculate fees
	fee := CalculateTradeFee(amount, 1.0)

	return &TradeQuote{
		EstimatedAmount: fmt.Sprintf("%.8f", estimatedAmount),
		ExchangeRate:    fmt.Sprintf("%.8f", exchangeRate),
		Fee: TradeFee{
			Total:  fmt.Sprintf("%.8f", fee),
			Spread: fmt.Sprintf("%.8f", fee*0.8),
			Gas:    fmt.Sprintf("%.8f", fee*0.2),
		},
	}
}
