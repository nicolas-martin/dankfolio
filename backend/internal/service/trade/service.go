package trade

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
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
	jupiterClient *coin.JupiterClient
	mu            sync.RWMutex
	trades        map[string]*model.Trade // In-memory storage using trade ID as key
}

// NewService creates a new TradeService instance
func NewService(ss *solana.SolanaTradeService, cs *coin.Service, jc *coin.JupiterClient) *Service {
	return &Service{
		solanaService: ss,
		coinService:   cs,
		jupiterClient: jc,
		trades:        make(map[string]*model.Trade),
	}
}

// ExecuteTrade executes a trade based on the provided request
func (s *Service) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Check for debug header in context
	// NOTE: Don't forget about this mdoe

	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		// Simulate processing delay
		time.Sleep(2 * time.Second)

		// Create simulated trade
		trade := &model.Trade{
			ID:              fmt.Sprintf("trade_%d", time.Now().UnixNano()),
			FromCoinID:      req.FromCoinID,
			ToCoinID:        req.ToCoinID,
			Type:            "swap",
			Amount:          req.Amount,
			Fee:             CalculateTradeFee(req.Amount, 1.0),
			Status:          "completed",
			CreatedAt:       time.Now(),
			CompletedAt:     time.Now(),
			TransactionHash: "5Bu8arrurLxsP9dEvdXX3kBd5PqP6tNUubSZUmoJNRE7ijGPnKW9MU9QQfUerJaorYQxPAmLCnD3D7gW8CihWJy6",
		}

		s.mu.Lock()
		s.trades[trade.ID] = trade
		s.mu.Unlock()

		log.Printf("🔧 Debug mode: Simulated trade completed")
		return trade, nil
	}

	// Regular trade execution logic
	trade := &model.Trade{
		ID:         fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		FromCoinID: req.FromCoinID,
		ToCoinID:   req.ToCoinID,
		Type:       "swap",
		Amount:     req.Amount,
		Fee:        CalculateTradeFee(req.Amount, 1.0),
		Status:     "pending",
		CreatedAt:  time.Now(),
		UserID:     "",
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

	// Log blockchain explorer URL
	log.Printf("✅ Trade completed! View on Solscan: https://solscan.io/tx/%s", trade.TransactionHash)

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
func (s *Service) GetTradeQuote(ctx context.Context, fromCoinID, toCoinID string, inputAmount string) (*TradeQuote, error) {
	// Convert amount to raw units based on decimals
	fromCoin, err := s.coinService.GetCoinByID(ctx, fromCoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get from coin: %w", err)
	}

	toCoin, err := s.coinService.GetCoinByID(ctx, toCoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get to coin: %w", err)
	}

	// Get quote from Jupiter with enhanced parameters
	quote, err := s.jupiterClient.GetQuote(coin.QuoteParams{
		InputMint:   fromCoinID,
		OutputMint:  toCoinID,
		Amount:      inputAmount, // Amount is already in raw units (lamports for SOL)
		SlippageBps: 100,         // 1% slippage
		SwapMode:    "ExactIn",
		// TODO: Allow indirect routes for better prices
		// OnlyDirectRoutes: true,
		OnlyDirectRoutes: false,
		MaxAccounts:      64,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get Jupiter quote: %w", err)
	}

	// Convert outAmount to float64
	outAmount, err := strconv.ParseFloat(quote.OutAmount, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse out amount: %w", err)
	}

	var totalFeeAmount float64
	var routeSummary []string
	for _, route := range quote.RoutePlan {
		routeSummary = append(routeSummary, route.SwapInfo.Label)

		if route.SwapInfo.FeeMint != model.SolMint {
			log.Printf("unexpected feemint in route found %s, expected %s. Skipping", route.SwapInfo.FeeMint, model.SolMint)
			continue
		}
		feeAmount, err := strconv.ParseFloat(route.SwapInfo.FeeAmount, 64)
		if err != nil {
			log.Printf("Couldn't parse route fee %s. Skipping", err)
			continue
		}
		totalFeeAmount += feeAmount
	}

	if quote.PlatformFee != nil {
		platformFeeFloat, err := strconv.ParseFloat(quote.PlatformFee.Amount, 64)
		if err != nil {
			log.Printf("Couldn't parse platform fee %s", err)
		}
		totalFeeAmount += platformFeeFloat
	}

	// NOTE: if this is unreliable just forward the raw amount to the frontend
	// amount is in the destination currency
	estimatedAmountInCoin := outAmount / math.Pow10(toCoin.Decimals)
	// Fee is in the from currency
	totalFeeInCoin := totalFeeAmount / math.Pow10(fromCoin.Decimals)

	// Calculate exchange rate
	initialAmount, _ := strconv.ParseFloat(inputAmount, 64)
	exchangeRate := outAmount / initialAmount

	// Log detailed quote information
	log.Printf("🔄 Jupiter Quote Details:\n"+
		"Input: %v %s\n"+
		"Output: %v %s\n"+
		"Price Impact: %v%%\n"+
		"Route: %v\n"+
		"Network Fee: %v %s\n",
		initialAmount, fromCoin.Symbol,
		estimatedAmountInCoin, toCoin.Symbol,
		quote.PriceImpactPct,
		routeSummary,
		totalFeeInCoin, fromCoin.Symbol,
	)

	return &TradeQuote{
		EstimatedAmount: strconv.FormatFloat(estimatedAmountInCoin, 'f', -1, 64),
		ExchangeRate:    strconv.FormatFloat(exchangeRate, 'f', -1, 64),
		Fee:             strconv.FormatFloat(totalFeeInCoin, 'f', -1, 64),
		PriceImpact:     quote.PriceImpactPct,
		RoutePlan:       routeSummary,
		InputMint:       quote.InputMint,
		OutputMint:      quote.OutputMint,
	}, nil
}

// GetTokenPrices gets prices for multiple tokens from Jupiter
func (s *Service) GetTokenPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	return s.jupiterClient.GetTokenPrices(tokenAddresses)
}
