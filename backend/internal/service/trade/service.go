package trade

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	solanago "github.com/gagliardetto/solana-go"
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
	solanaClient  solana.ClientAPI
	coinService   coin.CoinServiceAPI     // Use CoinServiceAPI interface from coin package
	priceService  price.PriceServiceAPI   // Use PriceServiceAPI interface from price package
	jupiterClient jupiter.ClientAPI
	store         db.Store
}

// NewService creates a new TradeService instance
func NewService(sc solana.ClientAPI, cs coin.CoinServiceAPI, ps price.PriceServiceAPI, jc jupiter.ClientAPI, store db.Store) *Service {
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
	return s.store.Trades().Get(ctx, id)
}

// ListTrades returns a list of trades, with options for pagination, sorting, and filtering.
func (s *Service) ListTrades(ctx context.Context, opts db.ListOptions) ([]model.Trade, int64, error) {
	trades, total, err := s.store.Trades().ListWithOpts(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list trades with options: %w", err)
	}
	// The method now returns []model.Trade and total count, consistent with ListWithOpts.
	return trades, total, nil
}

// CreateTrade creates a new trade
func (s *Service) CreateTrade(ctx context.Context, trade *model.Trade) error {
	return s.store.Trades().Create(ctx, trade)
}

// UpdateTrade updates an existing trade
func (s *Service) UpdateTrade(ctx context.Context, trade *model.Trade) error {
	return s.store.Trades().Update(ctx, trade)
}

// DeleteTrade deletes a trade by its ID
func (s *Service) DeleteTrade(ctx context.Context, id string) error {
	return s.store.Trades().Delete(ctx, id)
}

// PrepareSwap prepares an unsigned swap transaction and creates a trade record
func (s *Service) PrepareSwap(ctx context.Context, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps, fromAddress string) (string, error) {
	// Parse and validate fromAddress (public key)
	fromPubKey, err := solanago.PublicKeyFromBase58(fromAddress)
	if err != nil {
		return "", fmt.Errorf("invalid from address: %w", err)
	}
	log.Printf("✅ from address parsed: %s", fromPubKey)

	// Fetch coin models to get their PKIDs
	fromCoinModel, err := s.coinService.GetCoinByMintAddress(ctx, fromCoinMintAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get fromCoin details for %s: %w", fromCoinMintAddress, err)
	}
	toCoinModel, err := s.coinService.GetCoinByMintAddress(ctx, toCoinMintAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get toCoin details for %s: %w", toCoinMintAddress, err)
	}

	// 1. Use the TradeService's GetSwapQuote for all conversion and logic
	tradeQuote, err := s.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)
	if err != nil {
		return "", fmt.Errorf("failed to get trade quote: %w", err)
	}

	unsignedTx, err := s.jupiterClient.CreateSwapTransaction(ctx, tradeQuote.Raw, fromPubKey)
	if err != nil {
		return "", fmt.Errorf("failed to create swap transaction: %w", err)
	}

	// Convert price and fee to float64 with error handling
	price, err := strconv.ParseFloat(tradeQuote.ExchangeRate, 64)
	if err != nil {
		return "", fmt.Errorf("failed to parse exchange rate: %w", err)
	}
	fee, err := strconv.ParseFloat(tradeQuote.Fee, 64)
	if err != nil {
		return "", fmt.Errorf("failed to parse fee: %w", err)
	}
	amount, err := strconv.ParseFloat(inputAmount, 64)
	if err != nil {
		return "", fmt.Errorf("failed to parse input amount: %w", err)
	}

	// 3. Create a new Trade record
	trade := &model.Trade{
		ID:                  fmt.Sprintf("trade_%d", time.Now().UnixNano()),
		UserID:              fromPubKey.String(), // Set the user_id to the wallet address
		FromCoinMintAddress: fromCoinMintAddress,
		FromCoinPKID:        fromCoinModel.ID,
		ToCoinMintAddress:   toCoinMintAddress,
		ToCoinPKID:          toCoinModel.ID,
		CoinSymbol:          fromCoinModel.Symbol, // Or determine based on context
		Type:                "swap",
		Amount:              amount,
		Price:               price,
		Fee:                 fee,
		Status:              "prepared",
		UnsignedTransaction: unsignedTx,
		CreatedAt:           time.Now(),
		Confirmations:       0,
		Finalized:           false,
	}
	if err := s.store.Trades().Create(ctx, trade); err != nil {
		return "", fmt.Errorf("failed to create trade record: %w", err)
	}

	return unsignedTx, nil
}

// ExecuteTrade executes a trade based on the provided request
func (s *Service) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Check for debug header in context
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		// Simulate processing delay
		time.Sleep(2 * time.Second)

		now := time.Now()
		// Generate a unique debug transaction hash
		debugTxHashBytes := make([]byte, 64)
		// Use timestamp for first 8 bytes to ensure uniqueness
		binary.BigEndian.PutUint64(debugTxHashBytes[:8], uint64(time.Now().UnixNano()))
		// Fill rest with random bytes
		if _, err := rand.Read(debugTxHashBytes[8:]); err != nil {
			return nil, fmt.Errorf("failed to generate debug transaction hash: %w", err)
		}
		debugTxHash := solanago.SignatureFromBytes(debugTxHashBytes).String()

		// Create simulated trade
		// Ensure CoinSymbol is populated, e.g., from FromCoinMintAddress if applicable
		// For simplicity, assuming FromCoinMintAddress can be used to derive a symbol or it's not critical for debug mode.
		// Ideally, you'd fetch coin details even in debug mode if CoinSymbol is vital.
		fromCoin, _ := s.coinService.GetCoinByMintAddress(ctx, req.FromCoinMintAddress) // Best effort for symbol, use GetCoinByMintAddress
		
		trade := &model.Trade{
			ID:                  fmt.Sprintf("trade_simulated_%d", time.Now().UnixNano()),
			FromCoinMintAddress: req.FromCoinMintAddress,
			ToCoinMintAddress:   req.ToCoinMintAddress,
			CoinSymbol:          fromCoin.Symbol, // Populate if available
			Type:                "swap",
			Amount:              req.Amount,
			Fee:                 CalculateTradeFee(req.Amount, 1.0), // Placeholder for fee calculation
			Status:          "completed",
			CreatedAt:       now,
			CompletedAt:     &now,
			TransactionHash: debugTxHash,
		}

		err := s.store.Trades().Create(ctx, trade)
		if err != nil {
			return nil, fmt.Errorf("failed to create trade: %w", err)
		}

		log.Printf("🔧 Debug mode: Simulated trade completed")
		return trade, nil
	}

	// Find existing trade record by unsigned transaction
	trade, err := s.store.Trades().GetByField(ctx, "unsigned_transaction", req.UnsignedTransaction)
	if err != nil {
		return nil, fmt.Errorf("failed to find existing trade record: %w", err)
	}
	if trade == nil {
		return nil, fmt.Errorf("no trade record found for the given transaction")
	}

	// Execute signed transaction on blockchain
	txHash, err := s.solanaClient.ExecuteTrade(ctx, trade, req.SignedTransaction)
	if err != nil {
		trade.Status = "failed"
		originalSolanaError := err // Store the original error from solanaClient.ExecuteTrade
		errStr := originalSolanaError.Error()
		trade.Error = &errStr
		if errUpdate := s.store.Trades().Update(ctx, trade); errUpdate != nil {
			log.Printf("Warning: Failed to update failed trade status: %v", errUpdate)
			// Optionally, you could return a combined error here, e.g., by wrapping errUpdate and originalSolanaError
			// For now, returning the original operational error is prioritized.
		}
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", originalSolanaError)
	}

	// Update trade record with transaction hash and status
	trade.Status = "submitted"
	trade.TransactionHash = txHash
	if err := s.store.Trades().Update(ctx, trade); err != nil {
		log.Printf("Warning: Failed to update trade status: %v", err)
	}

	// Log blockchain explorer URL
	log.Printf("✅ Trade submitted! View on Solscan: https://solscan.io/tx/%s", trade.TransactionHash)

	return trade, nil
}

// GetSwapQuote gets a quote for a potential trade
func (s *Service) GetSwapQuote(ctx context.Context, fromCoinMintAddress, toCoinMintAddress string, inputAmount string, slippageBsp string) (*TradeQuote, error) {
	// Parse addresses
	fromCoin, err := s.coinService.GetCoinByMintAddress(ctx, fromCoinMintAddress) // Use new method
	if err != nil {
		return nil, fmt.Errorf("failed to get from coin %s: %w", fromCoinMintAddress, err)
	}

	toCoin, err := s.coinService.GetCoinByMintAddress(ctx, toCoinMintAddress) // Use new method
	if err != nil {
		return nil, fmt.Errorf("failed to get to coin %s: %w", toCoinMintAddress, err)
	}

	slippageBpsInt, err := strconv.Atoi(slippageBsp)
	if err != nil {
		return nil, fmt.Errorf("invalid slippage value: %w", err)
	}

	// Get quote from Jupiter with enhanced parameters
	quote, err := s.jupiterClient.GetQuote(ctx, jupiter.QuoteParams{
		InputMint:   fromCoinMintAddress, // Use mint address
		OutputMint:  toCoinMintAddress,   // Use mint address
		Amount:      inputAmount,         // Amount is already in raw units (lamports for SOL)
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
	prices, err := s.priceService.GetCoinPrices(ctx, feeMintAddresses)
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

	estimatedAmountInCoin := outAmount / math.Pow10(int(toCoin.Decimals))
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
		Raw:             quote.RawPayload,
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
	trade, err := s.store.Trades().GetByField(ctx, "transaction_hash", txHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get trade by transaction hash: %w", err)
	}
	return trade, nil
}

// GetTransactionStatus gets the confirmation status of a transaction
func (s *Service) GetTransactionStatus(ctx context.Context, txHash string) (*rpc.GetSignatureStatusesResult, error) {
	return s.solanaClient.GetTransactionConfirmationStatus(ctx, txHash)
}
