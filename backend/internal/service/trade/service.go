package trade

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

// Service handles trade-related operations
type Service struct {
	solanaClient  *solana.Client
	coinService   *coin.Service
	priceService  *price.Service
	jupiterClient *jupiter.Client
	store         db.Store
}

// NewService creates a new TradeService instance
func NewService(sc *solana.Client, cs *coin.Service, ps *price.Service, jc *jupiter.Client, store db.Store) *Service {
	return &Service{
		solanaClient:  sc,
		coinService:   cs,
		priceService:  ps,
		jupiterClient: jc,
		store:         store,
	}
}

// GetTrade retrieves a trade by its ID
func (s *Service) GetTrade(ctx context.Context, id string) (*model.Trade, error) {
	return s.store.GetTrade(ctx, id)
}

// ListTrades returns all trades
func (s *Service) ListTrades(ctx context.Context) ([]*model.Trade, error) {
	return s.store.ListTrades(ctx)
}

// CreateTrade creates a new trade
func (s *Service) CreateTrade(ctx context.Context, trade *model.Trade) error {
	return s.store.CreateTrade(ctx, trade)
}

// UpdateTrade updates an existing trade
func (s *Service) UpdateTrade(ctx context.Context, trade *model.Trade) error {
	return s.store.UpdateTrade(ctx, trade)
}

// DeleteTrade deletes a trade by its ID
func (s *Service) DeleteTrade(ctx context.Context, id string) error {
	return s.store.DeleteTrade(ctx, id)
}

// ExecuteTrade executes a trade based on the provided request
func (s *Service) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Check for debug header in context
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		// Simulate processing delay
		time.Sleep(2 * time.Second)

		now := time.Now()
		// Create simulated trade
		trade := &model.Trade{
			ID:              fmt.Sprintf("trade_%d", time.Now().UnixNano()),
			FromCoinID:      req.FromCoinID,
			ToCoinID:        req.ToCoinID,
			Type:            "swap",
			Amount:          req.Amount,
			Fee:             CalculateTradeFee(req.Amount, 1.0),
			Status:          "completed",
			CreatedAt:       now,
			CompletedAt:     &now,
			TransactionHash: "5Bu8arrurLxsP9dEvdXX3kBd5PqP6tNUubSZUmoJNRE7ijGPnKW9MU9QQfUerJaorYQxPAmLCnD3D7gW8CihWJy6",
		}

		s.store.CreateTrade(ctx, trade)

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
	err := s.solanaClient.ExecuteTrade(ctx, trade, req.SignedTransaction)
	if err != nil {
		trade.Status = "failed"
		s.store.UpdateTrade(ctx, trade)
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", err)
	}

	// Update trade status and store in memory
	now := time.Now()
	trade.Status = "completed"
	trade.CompletedAt = &now

	s.store.UpdateTrade(ctx, trade)

	// Log blockchain explorer URL
	log.Printf("✅ Trade completed! View on Solscan: https://solscan.io/tx/%s", trade.TransactionHash)

	return trade, nil
}

// GetSwapQuote gets a quote for a potential trade
func (s *Service) GetSwapQuote(ctx context.Context, fromCoinID, toCoinID string, inputAmount string, slippageBsp string) (*TradeQuote, error) {
	// Parse addresses
	fromCoin, err := s.coinService.GetCoinByID(ctx, fromCoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get from coin: %w", err)
	}

	toCoin, err := s.coinService.GetCoinByID(ctx, toCoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get to coin: %w", err)
	}

	slippageBpsInt, err := strconv.Atoi(slippageBsp)
	if err != nil {
		return nil, fmt.Errorf("invalid slippage value: %w", err)
	}

	// Get quote from Jupiter with enhanced parameters
	quote, err := s.jupiterClient.GetQuote(jupiter.QuoteParams{
		InputMint:   fromCoinID,
		OutputMint:  toCoinID,
		Amount:      inputAmount, // Amount is already in raw units (lamports for SOL)
		SlippageBps: slippageBpsInt,
		SwapMode:    "ExactIn",
		// NOTE: Allow indirect routes for better prices
		// NOTE: Indirect routes will have different feeMints
		// I'm not sure how the indirect route will affect the transaction submission
		OnlyDirectRoutes: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get Jupiter quote: %w", err)
	}

	// Collect all unique feeMint addresses
	feeMints := make(map[string]bool)
	for _, route := range quote.RoutePlan {
		feeMints[route.SwapInfo.FeeMint] = true
	}

	// Convert map keys to slice
	feeMintAddresses := make([]string, 0, len(feeMints))
	for mint := range feeMints {
		feeMintAddresses = append(feeMintAddresses, mint)
	}

	// Retrieve token prices using price service
	prices, err := s.priceService.GetTokenPrices(ctx, feeMintAddresses)
	if err != nil {
		return nil, fmt.Errorf("failed to get token prices: %w", err)
	}

	var totalFeeInUSD float64
	var routeSummary []string
	for _, route := range quote.RoutePlan {
		routeSummary = append(routeSummary, route.SwapInfo.Label)

		feeAmount, err := strconv.ParseFloat(route.SwapInfo.FeeAmount, 64)
		if err != nil {
			log.Printf("Couldn't parse route fee %s. Skipping", err)
			continue
		}

		// Get the price of the feeMint in USD
		price, exists := prices[route.SwapInfo.FeeMint]
		if !exists {
			log.Printf("Price for feeMint %s not found. Skipping", route.SwapInfo.FeeMint)
			continue
		}

		// Convert fee to USD
		feeInUSD := feeAmount * price
		totalFeeInUSD += feeInUSD
	}

	// Add platform fee if present
	if quote.PlatformFee != nil {
		platformFeeAmount, err := strconv.ParseFloat(quote.PlatformFee.Amount, 64)
		if err != nil {
			log.Printf("Couldn't parse platform fee %s. Skipping", err)
		} else {
			if price, exists := prices[quote.PlatformFee.FeeMint]; exists {
				platformFeeInUSD := platformFeeAmount * price
				totalFeeInUSD += platformFeeInUSD
			}
		}
	}

	// Convert outAmount to float64
	outAmount, err := strconv.ParseFloat(quote.OutAmount, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse out amount: %w", err)
	}

	estimatedAmountInCoin := outAmount / math.Pow10(toCoin.Decimals)
	totalFeeInUSDCoin := totalFeeInUSD / math.Pow10(9)

	// Calculate exchange rate
	initialAmount, _ := strconv.ParseFloat(inputAmount, 64)
	exchangeRate := outAmount / initialAmount

	truncatedPriceImpact := truncateDecimals(quote.PriceImpactPct, 6)

	// Log detailed quote information
	log.Printf("🔄 Jupiter Quote Details:\n"+
		"Input: %v %s\n"+
		"Output: %v %s\n"+
		"Price Impact: %v%%\n"+
		"Route: %v\n"+
		"Total Fee: %v USD\n",
		initialAmount, fromCoin.Symbol,
		estimatedAmountInCoin, toCoin.Symbol,
		quote.PriceImpactPct,
		routeSummary,
		totalFeeInUSD,
	)

	return &TradeQuote{
		EstimatedAmount: TruncateAndFormatFloat(estimatedAmountInCoin, 6),
		ExchangeRate:    TruncateAndFormatFloat(exchangeRate, 6),
		Fee:             TruncateAndFormatFloat(totalFeeInUSDCoin, 9),
		PriceImpact:     truncatedPriceImpact,
		RoutePlan:       routeSummary,
		InputMint:       quote.InputMint,
		OutputMint:      quote.OutputMint,
	}, nil
}

// Helper functions for string manipulation
func truncateDecimals(input string, digits int) string {
	i := strings.IndexByte(input, '.')
	if i == -1 || len(input) < i+digits+1 {
		return input // no dot or not enough digits
	}
	return input[:i+digits+1] // keep dot + digits
}

func TruncateAndFormatFloat(value float64, decimalPlaces int) string {
	if decimalPlaces < 0 {
		return strconv.FormatFloat(value, 'f', -1, 64)
	}
	factor := math.Pow(10, float64(decimalPlaces))
	truncatedValue := math.Trunc(value*factor) / factor
	return strconv.FormatFloat(truncatedValue, 'f', decimalPlaces, 64)
}

// GetTradeByTransactionHash retrieves a trade by its transaction hash
func (s *Service) GetTradeByTransactionHash(ctx context.Context, txHash string) (*model.Trade, error) {
	trades, err := s.ListTrades(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list trades: %w", err)
	}

	for _, trade := range trades {
		if trade.TransactionHash == txHash {
			return trade, nil
		}
	}

	return nil, fmt.Errorf("trade not found for transaction hash: %s", txHash)
}

// GetTransactionStatus gets the confirmation status of a transaction
func (s *Service) GetTransactionStatus(ctx context.Context, txHash string) (*rpc.GetSignatureStatusesResult, error) {
	return s.solanaClient.GetTransactionConfirmationStatus(ctx, txHash)
}
