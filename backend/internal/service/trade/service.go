package trade

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"

	// "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana" // To be replaced

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/util" // Import the new util package
)

// Service handles trade-related operations
type Service struct {
	chainClient               clients.GenericClientAPI // Changed from solanaClient
	coinService               coin.CoinServiceAPI      // Use CoinServiceAPI interface from coin package
	priceService              price.PriceServiceAPI    // Use PriceServiceAPI interface from price package
	jupiterClient             jupiter.ClientAPI
	store                     db.Store
	platformFeeBps            int    // Platform fee in basis points
	platformFeeAccountAddress string // Solana address for collecting platform fees
}

// NewService creates a new TradeService instance
func NewService(
	chainClient clients.GenericClientAPI, // Changed parameter
	cs coin.CoinServiceAPI,
	ps price.PriceServiceAPI,
	jc jupiter.ClientAPI,
	store db.Store,
	configuredPlatformFeeBps int, // New parameter
	configuredPlatformFeeAccountAddress string, // New parameter
) *Service {
	return &Service{
		chainClient:               chainClient, // Changed assignment
		coinService:               cs,
		priceService:              ps,
		jupiterClient:             jc,
		store:                     store,
		platformFeeBps:            configuredPlatformFeeBps,            // Store configured value
		platformFeeAccountAddress: configuredPlatformFeeAccountAddress, // Store configured value
	}
}

// GetTrade retrieves a trade by its ID
func (s *Service) GetTrade(ctx context.Context, id string) (*model.Trade, error) {
	// TODO: If trade IDs have a known format (e.g., UUID), add validation.
	if id == "" {
		return nil, fmt.Errorf("trade id cannot be empty")
	}
	return s.store.Trades().Get(ctx, id)
}

// ListTrades returns a list of trades, with options for pagination, sorting, and filtering.
func (s *Service) ListTrades(ctx context.Context, opts db.ListOptions) ([]model.Trade, int32, error) {
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
func (s *Service) PrepareSwap(ctx context.Context, params model.PrepareSwapRequestData) (*PrepareSwapResponse, error) {
	if !util.IsValidSolanaAddress(params.UserWalletAddress) {
		return nil, fmt.Errorf("invalid user_wallet_address: %s", params.UserWalletAddress)
	}
	if !util.IsValidSolanaAddress(params.FromCoinMintAddress) {
		return nil, fmt.Errorf("invalid from_coin_mint_address: %s", params.FromCoinMintAddress)
	}
	if !util.IsValidSolanaAddress(params.ToCoinMintAddress) {
		return nil, fmt.Errorf("invalid to_coin_mint_address: %s", params.ToCoinMintAddress)
	}

	amountFloat, err := strconv.ParseFloat(params.Amount, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount: %w", err)
	}
	if amountFloat <= 0 {
		return nil, fmt.Errorf("amount must be positive: %s", params.Amount)
	}

	slippageBpsInt, err := strconv.Atoi(params.SlippageBps) // Atoi implies base 10
	if err != nil {
		return nil, fmt.Errorf("invalid slippage_bps: %w", err)
	}
	if slippageBpsInt < 0 || slippageBpsInt > 5000 { // 5000 bps = 50%
		return nil, fmt.Errorf("slippage_bps out of range (0-5000): %d", slippageBpsInt)
	}

	// Parse and validate fromAddress (public key)
	fromPubKey, err := solanago.PublicKeyFromBase58(params.UserWalletAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid from address: %w", err) // Should be caught by IsValidSolanaAddress, but good to keep for specific parsing error
	}
	// Fetch coin models to get their PKIDs
	fromCoinModel, err := s.coinService.GetCoinByAddress(ctx, params.FromCoinMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get fromCoin details for %s: %w", params.FromCoinMintAddress, err)
	}
	toCoinModel, err := s.coinService.GetCoinByAddress(ctx, params.ToCoinMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get toCoin details for %s: %w", params.ToCoinMintAddress, err)
	}

	// 1. Use the TradeService's GetSwapQuote for all conversion and logic
	tradeQuote, err := s.GetSwapQuote(ctx, params.FromCoinMintAddress, params.ToCoinMintAddress, params.Amount, params.SlippageBps)
	if err != nil {
		return nil, fmt.Errorf("failed to get trade quote: %w", err)
	}
	slog.Debug("tradeQuote.Raw after GetSwapQuote", "trade_quote", string(tradeQuote.Raw))

	swapResponse, err := s.jupiterClient.CreateSwapTransaction(ctx, tradeQuote.Raw, fromPubKey, s.platformFeeAccountAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to create swap transaction: %w", err)
	}

	// Calculate comprehensive SOL fee breakdown using both quote and swap responses
	feeBreakdown, totalSolRequired, tradingFeeSol, err := s.calculateSolFeeBreakdown(tradeQuote, swapResponse)
	if err != nil {
		slog.Warn("Failed to calculate SOL fee breakdown", "error", err)
		// Use fallback values
		feeBreakdown = nil
		totalSolRequired = "0"
		tradingFeeSol = "0"
	}

	// Convert basic trade values
	price, err := strconv.ParseFloat(tradeQuote.ExchangeRate, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse exchange rate: %w", err)
	}
	fee, err := strconv.ParseFloat(tradeQuote.Fee, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse fee: %w", err)
	}
	amount, err := strconv.ParseFloat(params.Amount, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse input amount: %w", err)
	}

	// Create trade record with essential information
	trade := &model.Trade{
		UserID:              fromPubKey.String(),
		FromCoinMintAddress: params.FromCoinMintAddress,
		FromCoinPKID:        fromCoinModel.ID,
		ToCoinMintAddress:   params.ToCoinMintAddress,
		ToCoinPKID:          toCoinModel.ID,
		CoinSymbol:          fromCoinModel.Symbol,
		Type:                "swap",
		Amount:              amount,
		Price:               price,
		Fee:                 fee,
		Status:              "prepared",
		UnsignedTransaction: swapResponse.SwapTransaction,
		CreatedAt:           time.Now(),
		Confirmations:       0,
		Finalized:           false,
	}

	// Set platform fee fallback
	if trade.PlatformFeePercent == 0 && s.platformFeeBps > 0 {
		trade.PlatformFeePercent = float64(s.platformFeeBps) / 100.0
		slog.Debug("Using configured platform fee", "fee_bps", s.platformFeeBps)
	}

	// Set platform fee destination
	if s.platformFeeAccountAddress != "" {
		trade.PlatformFeeDestination = s.platformFeeAccountAddress
	}

	// Log comprehensive fee breakdown
	slog.Info("Trade prepared with SOL fee breakdown",
		"total_sol_required", totalSolRequired,
		"trading_fee_sol", tradingFeeSol,
		"fee_breakdown", feeBreakdown)

	if err := s.store.Trades().Create(ctx, trade); err != nil {
		return nil, fmt.Errorf("failed to create trade record: %w", err)
	}

	// Return structured response with fee breakdown
	return &PrepareSwapResponse{
		UnsignedTransaction: swapResponse.SwapTransaction,
		SolFeeBreakdown:     feeBreakdown,
		TotalSolRequired:    totalSolRequired,
		TradingFeeSol:       tradingFeeSol,
	}, nil
}

// ExecuteTrade executes a trade based on the provided request
func (s *Service) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Check for debug header in context
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		if !util.IsValidSolanaAddress(req.FromCoinMintAddress) {
			return nil, fmt.Errorf("invalid from_coin_mint_address for debug path: %s", req.FromCoinMintAddress)
		}
		if !util.IsValidSolanaAddress(req.ToCoinMintAddress) {
			return nil, fmt.Errorf("invalid to_coin_mint_address for debug path: %s", req.ToCoinMintAddress)
		}
		if req.Amount <= 0 { // Assuming req.Amount is float64
			return nil, fmt.Errorf("amount must be positive for debug path: %f", req.Amount)
		}
		// SignedTransaction can be empty in debug mode as it's simulated
		// UnsignedTransaction can be empty in debug mode as it's simulated

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
		fromCoin, _ := s.coinService.GetCoinByAddress(ctx, req.FromCoinMintAddress) // Best effort for symbol, use GetCoinByMintAddress

		trade := &model.Trade{
			FromCoinMintAddress: req.FromCoinMintAddress,
			ToCoinMintAddress:   req.ToCoinMintAddress,
			CoinSymbol:          fromCoin.Symbol, // Populate if available
			Type:                "swap",
			Amount:              req.Amount,
			Fee:                 CalculateTradeFee(req.Amount, 1.0), // Placeholder for fee calculation
			Status:              "Finalized",                        // Changed from "completed" to match database status
			UnsignedTransaction: req.UnsignedTransaction,            // Fix: Include unsigned transaction for data integrity
			TransactionHash:     debugTxHash,
			CreatedAt:           now,
			CompletedAt:         now,
			Finalized:           true, // Mark as finalized since it's completed
		}

		err := s.store.Trades().Create(ctx, trade)
		if err != nil {
			return nil, fmt.Errorf("failed to create trade: %w", err)
		}

		slog.Info("Simulated trade completed")
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

	if req.UnsignedTransaction == "" {
		return nil, fmt.Errorf("unsigned_transaction cannot be empty")
	}
	if req.SignedTransaction == "" {
		return nil, fmt.Errorf("signed_transaction cannot be empty")
	}

	// Decode the signed transaction if it's base64 encoded
	rawTxBytes, err := base64.StdEncoding.DecodeString(req.SignedTransaction)
	if err != nil {
		// Handle error: maybe the transaction is not encoded, or encoding is invalid
		// For now, assume it might not be encoded and use as is, or return error
		// This depends on how SignedTransaction is consistently formatted.
		// If it should always be base64, this is an error.
		// If it could be raw bytes already, then this step is conditional.
		// Let's assume for now it should be base64 encoded.
		return nil, fmt.Errorf("failed to decode base64 signed transaction: %w", err)
	}

	// Execute signed transaction on blockchain using SendRawTransaction
	opts := bmodel.TransactionOptions{
		SkipPreflight:       false,       // Default, or from config/req
		PreflightCommitment: "confirmed", // Default, or from config/req
		// MaxRetries can be set if needed, e.g. 3
	}
	sig, err := s.chainClient.SendRawTransaction(ctx, rawTxBytes, opts)
	if err != nil {
		trade.Status = "failed"
		originalChainError := err // Store the original error
		errStr := originalChainError.Error()
		trade.Error = errStr
		if errUpdate := s.store.Trades().Update(ctx, trade); errUpdate != nil {
			slog.Warn("Failed to update failed trade status", "error", errUpdate)
		}
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", originalChainError)
	}

	// Update trade record with transaction hash and status "submitted"
	trade.Status = "submitted"
	trade.TransactionHash = string(sig) // sig is bmodel.Signature
	trade.Error = ""                    // Clear any previous error as submission was successful
	trade.CompletedAt = time.Time{}     // Not completed yet
	trade.Finalized = false             // Not finalized yet

	if errUpdate := s.store.Trades().Update(ctx, trade); errUpdate != nil {
		// Log the warning but proceed to return the trade and nil error,
		// as the transaction was successfully submitted to the chain.
		slog.Warn("Failed to update trade status to 'submitted'", "error", errUpdate, "trade_id", trade.ID, "tx_hash", trade.TransactionHash)
	}

	// Log blockchain explorer URL
	slog.Info("Trade submitted", "tx_hash", trade.TransactionHash, "solscan_url", fmt.Sprintf("https://solscan.io/tx/%s", trade.TransactionHash))

	return trade, nil
}

// GetSwapQuote gets a quote for a potential trade
func (s *Service) GetSwapQuote(ctx context.Context, fromCoinMintAddress, toCoinMintAddress string, inputAmount string, slippageBsp string) (*TradeQuote, error) {
	if !util.IsValidSolanaAddress(fromCoinMintAddress) {
		return nil, fmt.Errorf("invalid from_coin_mint_address: %s", fromCoinMintAddress)
	}
	if !util.IsValidSolanaAddress(toCoinMintAddress) {
		return nil, fmt.Errorf("invalid to_coin_mint_address: %s", toCoinMintAddress)
	}

	amountFloat, err := strconv.ParseFloat(inputAmount, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid input_amount: %w", err)
	}
	if amountFloat <= 0 {
		return nil, fmt.Errorf("input_amount must be positive: %s", inputAmount)
	}

	slippageBpsInt, err := strconv.Atoi(slippageBsp)
	if err != nil {
		return nil, fmt.Errorf("invalid slippage_bsp: %w", err)
	}
	if slippageBpsInt < 0 || slippageBpsInt > 5000 { // 5000 bps = 50%
		return nil, fmt.Errorf("slippage_bsp out of range (0-5000): %d", slippageBpsInt)
	}

	// Parse addresses
	fromCoin, err := s.coinService.GetCoinByAddress(ctx, fromCoinMintAddress) // Use new method
	if err != nil {
		return nil, fmt.Errorf("failed to get from coin %s: %w", fromCoinMintAddress, err)
	}

	toCoin, err := s.coinService.GetCoinByAddress(ctx, toCoinMintAddress) // Use new method
	if err != nil {
		return nil, fmt.Errorf("failed to get to coin %s: %w", toCoinMintAddress, err)
	}

	// Get quote from Jupiter with enhanced parameters
	quote, err := s.jupiterClient.GetQuote(ctx, jupiter.QuoteParams{
		InputMint:   fromCoinMintAddress, // Use mint address
		OutputMint:  toCoinMintAddress,   // Use mint address
		Amount:      inputAmount,         // Amount is already in raw units (lamports for SOL)
		SlippageBps: slippageBpsInt,
		FeeBps:      s.platformFeeBps, // Use configured platform fee BPS
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
			slog.Warn("Couldn't parse route fee", "error", err)
			continue
		}

		// Get the price of the feeMint in USD
		price, exists := prices[route.SwapInfo.FeeMint]
		if !exists {
			slog.Warn("Price for feeMint not found", "fee_mint", route.SwapInfo.FeeMint)
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
			slog.Warn("Couldn't parse platform fee", "error", err)
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
	slog.Info("Jupiter Quote Details", "input", fmt.Sprintf("%v %s", initialAmount, fromCoin.Symbol), "output", fmt.Sprintf("%v %s", estimatedAmountInCoin, toCoin.Symbol), "price_impact", quote.PriceImpactPct, "route", routeSummary, "total_fee", totalFeeInUSD)

	return &TradeQuote{
		EstimatedAmount:  TruncateAndFormatFloat(estimatedAmountInCoin, 6),
		ExchangeRate:     TruncateAndFormatFloat(exchangeRate, 6),
		Fee:              TruncateAndFormatFloat(totalFeeInUSDCoin, 9),
		PriceImpact:      truncatedPriceImpact,
		RoutePlan:        routeSummary,
		InputMint:        quote.InputMint,
		OutputMint:       quote.OutputMint,
		Raw:              quote.RawPayload,
		SolFeeBreakdown:  nil, // Will be calculated later when we have swap transaction
		TotalSolRequired: "0", // Will be calculated later when we have swap transaction
		TradingFeeSol:    "0", // Will be calculated later when we have swap transaction
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
	if txHash == "" {
		return nil, fmt.Errorf("transaction hash cannot be empty")
	}
	// Basic check for Solana transaction hash format (Base58 encoded signature)
	// Typically 64 to 88 characters for Base58 encoded signatures.
	if len(txHash) < 64 || len(txHash) > 88 { // Max length for Ed25519 signature in base58 is 88
		return nil, fmt.Errorf("invalid transaction hash length: %s", txHash)
	}
	// Re-using IsValidSolanaAddress's regex logic, but this is a simplification.
	// A dedicated regex for tx signatures (which are just base58 strings of a certain length) would be `^[1-9A-HJ-NP-Za-km-z]{64,88}$`
	// For simplicity, we can use a modified check or assume IsValidSolanaAddress is "good enough" if lengths were similar.
	// However, txhash is not a Solana account address. So a direct check is better.
	if !util.IsValidBase58(txHash) { // Assuming IsValidBase58 is a new function in util for general base58 check
		return nil, fmt.Errorf("transaction hash contains invalid characters: %s", txHash)
	}

	trade, err := s.store.Trades().GetByField(ctx, "transaction_hash", txHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get trade by transaction hash %s: %w", txHash, err)
	}
	if trade == nil {
		return nil, fmt.Errorf("no trade found with transaction hash %s", txHash)
	}

	// If trade status is already final, return it as is.
	if trade.Status == model.TradeStatusFinalized || trade.Status == model.TradeStatusFailed {
		return trade, nil
	}

	// If trade has a transaction hash and is not in a final state, check on-chain status.
	// This includes "submitted", "Processed", "Confirmed", and any other non-final statuses.
	if trade.TransactionHash != "" {
		chainStatus, statusErr := s.chainClient.GetTransactionStatus(ctx, bmodel.Signature(txHash))
		if statusErr != nil {
			// If there's an error fetching the status (e.g., network, RPC down),
			// log it and return the trade as is from the DB. Don't alter its status.
			slog.Error("Error getting transaction status", "tx_hash", txHash, "error", statusErr, "current_status", trade.Status)
			strErr := statusErr.Error()
			trade.Error = strErr
			return trade, nil
		}

		// Update trade based on detailed blockchain status
		statusChanged := false
		now := time.Now()

		// Update confirmations if available (do this for ALL statuses)
		if chainStatus.Confirmations != nil && trade.Confirmations != int32(*chainStatus.Confirmations) {
			trade.Confirmations = int32(*chainStatus.Confirmations)
			statusChanged = true
			slog.Info("Updated confirmations for trade", "trade_id", trade.ID, "confirmations", trade.Confirmations)
		}
		if chainStatus.Status != trade.Status {
			slog.Info("Updating trade status", "trade_id", trade.ID, "from", trade.Status, "to", chainStatus.Status)
			trade.Status = chainStatus.Status // Update status based on blockchain
			statusChanged = true
		}

		// Handle different blockchain statuses
		switch chainStatus.Status {
		case "Failed":
			// Set error details and completion info for failed transactions
			errMsg := "Transaction failed on-chain."
			if chainStatus.Error != "" {
				errMsg = fmt.Sprintf("Transaction failed on-chain: %s", chainStatus.Error)
			} else if chainStatus.Err != nil {
				errMsg = fmt.Sprintf("Transaction failed on-chain: %v", chainStatus.Err)
			}
			if trade.Error != errMsg {
				slog.Info("Transaction failed on-chain", "trade_id", trade.ID, "error", errMsg)
				trade.Error = errMsg
				trade.CompletedAt = now
				trade.Finalized = true
				statusChanged = true
			}

		case "Finalized":
			// Set completion info for finalized transactions
			if trade.CompletedAt.IsZero() || !trade.Finalized {
				slog.Info("Transaction finalized on-chain", "trade_id", trade.ID)
				trade.CompletedAt = now
				trade.Finalized = true
				trade.Error = "" // Clear any previous error
				statusChanged = true
			}

		case "Confirmed":
			// For highly confirmed transactions, set completion info
			if chainStatus.Confirmations != nil && *chainStatus.Confirmations >= 31 {
				if trade.CompletedAt.IsZero() {
					slog.Info("Transaction highly confirmed", "trade_id", trade.ID, "confirmations", *chainStatus.Confirmations)
					trade.CompletedAt = now
					trade.Finalized = false // Not technically finalized yet, but practically complete
					trade.Error = ""
					statusChanged = true
				}
			} else {
				slog.Info("Transaction confirmed on-chain", "trade_id", trade.ID, "confirmations", trade.Confirmations)
			}

		case "Processed":
			// Transaction is processed but not yet confirmed - just log progress
			slog.Info("Transaction processed on-chain", "trade_id", trade.ID, "confirmations", trade.Confirmations)

		case "Unknown", "Pending":
			// Transaction status is unknown or still pending - log for monitoring
			slog.Info("Transaction status is unknown or still pending", "trade_id", trade.ID, "status", chainStatus.Status, "confirmations", trade.Confirmations)

		default:
			// Unexpected status - log for monitoring
			slog.Info("Transaction has unexpected status", "trade_id", trade.ID, "status", chainStatus.Status, "confirmations", trade.Confirmations)
		}

		// Update database if any changes were made
		if statusChanged {
			if errUpdate := s.store.Trades().Update(ctx, trade); errUpdate != nil {
				slog.Warn("Failed to update trade", "trade_id", trade.ID, "error", errUpdate)
			} else {
				slog.Info("Successfully updated trade", "trade_id", trade.ID, "status", trade.Status, "confirmations", trade.Confirmations, "finalized", trade.Finalized)
			}
		}
	}

	return trade, nil
}

// GetTransactionStatus gets the confirmation status of a transaction
func (s *Service) GetTransactionStatus(ctx context.Context, txHash string) (*bmodel.TransactionStatus, error) {
	return s.chainClient.GetTransactionStatus(ctx, bmodel.Signature(txHash))
}

// GetFeeForMessage gets the fee estimate for a transaction message
func (s *Service) GetFeeForMessage(ctx context.Context, message solanago.Message) (*rpc.GetFeeForMessageResult, error) {
	// Cast to SolanaRPCClientAPI to access the method
	if solanaClient, ok := s.chainClient.(solana.SolanaRPCClientAPI); ok {
		return solanaClient.GetFeeForMessage(ctx, message)
	}
	return nil, fmt.Errorf("chain client does not support GetFeeForMessage")
}

// calculateSolFeeBreakdown sums all SOL lamport needs and returns formatted breakdown
func (s *Service) calculateSolFeeBreakdown(
	quote *TradeQuote,
	swapTx *jupiter.SwapResponse,
) (*SolFeeBreakdown, string, string, error) {
	const (
		solMint          = "So11111111111111111111111111111111111111112"
		ataRentLamports  = 2_039_280 // rent-exempt minimum
		priorityLamports = 1_000_000 // tip per tx
	)

	// 1. Extract SOL route & platform fees from the raw Jupiter quote response
	var routeFee, platformFee uint64

	if quote.Raw != nil {
		var jupiterQuote jupiter.QuoteResponse
		if err := json.Unmarshal(quote.Raw, &jupiterQuote); err == nil {
			// Extract route fees from the quote
			for _, route := range jupiterQuote.RoutePlan {
				if route.SwapInfo.FeeMint == solMint && route.SwapInfo.FeeAmount != "" {
					if feeAmount, err := strconv.ParseUint(route.SwapInfo.FeeAmount, 10, 64); err == nil {
						routeFee += feeAmount
					}
				}
			}

			// Extract platform fees from the quote
			if jupiterQuote.PlatformFee != nil && jupiterQuote.PlatformFee.FeeMint == solMint {
				if platformAmount, err := strconv.ParseUint(jupiterQuote.PlatformFee.Amount, 10, 64); err == nil {
					platformFee = platformAmount
				}
			}
		} else {
			slog.Warn("Failed to unmarshal quote raw payload for fee extraction", "error", err)
		}
	}

	// 2. Assume ATA creation (simplified approach)
	// Most swaps require 1-2 ATA creations, so we'll conservatively assume 2
	const assumedATACount = 2
	ataCount := uint64(assumedATACount)
	netRent := ataCount * ataRentLamports

	// 3. Estimate transaction count and fees
	txCount := uint64(1) // Main swap transaction
	if swapTx.SetupTransaction != "" {
		txCount++
	}
	if swapTx.CleanupTransaction != "" {
		txCount++
	}

	// 4. Use priority fee from swap response if available, otherwise use default
	prioFeePerTx := uint64(priorityLamports)
	if swapTx.PrioritizationFeeLamports > 0 {
		prioFeePerTx = uint64(swapTx.PrioritizationFeeLamports)
	}

	// 5. Estimate base transaction fees (conservative estimate)
	const baseTransactionFee = 5000 // lamports per transaction
	baseFee := uint64(baseTransactionFee) * txCount
	prioFee := prioFeePerTx * txCount
	totalLam := routeFee + platformFee + baseFee + prioFee + netRent

	// 6. Format lamports to SOL strings
	fmtSol := func(v uint64) string {
		return TruncateAndFormatFloat(float64(v)/1e9, 9)
	}

	bd := &SolFeeBreakdown{
		TradingFee:         fmtSol(routeFee),
		TransactionFee:     fmtSol(baseFee),
		AccountCreationFee: fmtSol(netRent),
		PriorityFee:        fmtSol(prioFee),
		Total:              fmtSol(totalLam),
		AccountsToCreate:   int(ataCount),
	}

	slog.Info("SOL Fee Breakdown",
		"trading_fee", bd.TradingFee,
		"transaction_fee", bd.TransactionFee,
		"account_creation_fee", bd.AccountCreationFee,
		"priority_fee", bd.PriorityFee,
		"total_sol_required", bd.Total,
		"accounts_to_create", bd.AccountsToCreate,
	)

	return bd, bd.Total, bd.TradingFee, nil
}
