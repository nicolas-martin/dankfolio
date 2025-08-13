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
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/rpc"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/trademetrics"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

// Service handles trade-related operations
type Service struct {
	chainClient               clients.GenericClientAPI // Changed from solanaClient
	coinService               coin.CoinServiceAPI      // Use CoinServiceAPI interface from coin package
	priceService              price.PriceServiceAPI    // Use PriceServiceAPI interface from price package
	jupiterClient             jupiter.ClientAPI
	store                     db.Store
	platformFeeBps            int                        // Platform fee in basis points
	platformFeeAccountAddress string                     // Solana address for collecting platform fees
	platformPrivateKey        *solanago.PrivateKey       // Platform private key for ATA creation
	feeMintSelector           *FeeMintSelector           // Handles fee mint selection logic
	metrics                   *trademetrics.TradeMetrics // Trade-related metrics
	showDetailedBreakdown     bool                       // Feature flag for detailed trade breakdown
}

// NewService creates a new TradeService instance
func NewService(
	chainClient clients.GenericClientAPI, // Changed parameter
	cs coin.CoinServiceAPI,
	ps price.PriceServiceAPI,
	jc jupiter.ClientAPI,
	store db.Store,
	configuredPlatformFeeBps int, // Platform fee in basis points
	configuredPlatformFeeAccountAddress string, // Platform fee account address
	platformPrivateKeyBase64 string, // Platform private key for ATA creation
	metrics *trademetrics.TradeMetrics,
	showDetailedBreakdown bool, // Feature flag for detailed trade breakdown
) *Service {
	// Parse platform private key
	var platformKey *solanago.PrivateKey
	if platformPrivateKeyBase64 != "" {
		keyBytes, err := base64.StdEncoding.DecodeString(platformPrivateKeyBase64)
		if err != nil {
			slog.Error("Failed to decode platform private key", "error", err)
		} else if len(keyBytes) != 64 {
			slog.Error("Invalid platform private key length", "expected", 64, "got", len(keyBytes))
		} else {
			key := solanago.PrivateKey(keyBytes)
			platformKey = &key
		}
	}

	service := &Service{
		chainClient:               chainClient,
		coinService:               cs,
		priceService:              ps,
		jupiterClient:             jc,
		store:                     store,
		platformFeeBps:            configuredPlatformFeeBps,
		platformFeeAccountAddress: configuredPlatformFeeAccountAddress,
		platformPrivateKey:        platformKey,
		metrics:                   metrics,
		showDetailedBreakdown:     showDetailedBreakdown,
	}

	// Initialize fee mint selector with ATA checker and creator
	ataChecker := func(ctx context.Context, ata solanago.PublicKey) bool {
		return service.ataExists(ctx, ata)
	}

	ataCreator := func(ctx context.Context, owner, mint solanago.PublicKey, signerKey *solanago.PrivateKey) error {
		return service.createATA(ctx, owner, mint, signerKey)
	}

	service.feeMintSelector = NewFeeMintSelector(
		configuredPlatformFeeAccountAddress,
		platformKey,
		ataChecker,
		ataCreator,
	)

	return service
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

	// Fetch coin models to get their PKIDs and decimals for conversion
	fromCoinModel, err := s.coinService.GetCoinByAddress(ctx, params.FromCoinMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get fromCoin details for %s: %w", params.FromCoinMintAddress, err)
	}
	toCoinModel, err := s.coinService.GetCoinByAddress(ctx, params.ToCoinMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get toCoin details for %s: %w", params.ToCoinMintAddress, err)
	}

	// Frontend already sends raw amounts (lamports for SOL), so use directly
	rawAmount := params.Amount

	// Validate that amount is a positive integer
	amountInt, err := strconv.ParseUint(rawAmount, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount (must be positive integer in raw units): %w", err)
	}
	if amountInt == 0 {
		return nil, fmt.Errorf("amount must be positive: %s", rawAmount)
	}

	slog.Debug("Using raw amount from frontend",
		"raw_amount", rawAmount,
		"token_decimals", fromCoinModel.Decimals)

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

	// 1. Use the TradeService's GetSwapQuote with converted raw amount
	// For PrepareSwap, we don't need fee breakdown since we'll calculate it from the actual swap transaction
	tradeQuote, err := s.GetSwapQuote(ctx, params.FromCoinMintAddress, params.ToCoinMintAddress, rawAmount, params.SlippageBps, false, "", params.AllowMultiHop)
	if err != nil {
		return nil, fmt.Errorf("failed to get trade quote: %w", err)
	}
	slog.Debug("tradeQuote.Raw after GetSwapQuote", "trade_quote", string(tradeQuote.Raw))

	// Use FeeMintSelector to determine optimal fee collection setup
	var feeAccount string
	var actualFeeMint string // Track the actual mint used for fee collection

	if s.platformFeeAccountAddress != "" {
		// Parse Jupiter quote to extract swap mode and other info
		var jupiterQuote *jupiter.QuoteResponse
		swapMode := "ExactIn" // Default
		if tradeQuote.Raw != nil {
			var quoteData map[string]any
			if err := json.Unmarshal(tradeQuote.Raw, &quoteData); err == nil {
				if mode, ok := quoteData["swapMode"].(string); ok {
					swapMode = mode
				}
			}

			// Parse full quote for fee mint selector
			var fullQuote jupiter.QuoteResponse
			if err := json.Unmarshal(tradeQuote.Raw, &fullQuote); err == nil {
				jupiterQuote = &fullQuote
			}
		}

		// Normalize native SOL to wSOL for fee mint selection (Jupiter only works with wSOL)
		normalizedFromMint := params.FromCoinMintAddress
		if params.FromCoinMintAddress == model.NativeSolMint {
			normalizedFromMint = model.SolMint
		}

		normalizedToMint := params.ToCoinMintAddress
		if params.ToCoinMintAddress == model.NativeSolMint {
			normalizedToMint = model.SolMint
		}

		// Use fee mint selector to determine optimal fee collection
		feeAccountATA, selectedFeeMint, err := s.feeMintSelector.SelectFeeMint(
			ctx,
			normalizedFromMint,
			normalizedToMint,
			swapMode,
			jupiterQuote,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to select fee mint: %w", err)
		}

		if feeAccountATA != "" && selectedFeeMint != "" {
			feeAccount = feeAccountATA
			actualFeeMint = selectedFeeMint
			slog.Info("Platform fee collection enabled",
				"platform_account", s.platformFeeAccountAddress,
				"fee_ata", feeAccount,
				"fee_mint", selectedFeeMint,
				"fee_bps", s.platformFeeBps,
				"swap_mode", swapMode)
		} else {
			slog.Info("Platform fee collection disabled - no suitable ATA found",
				"platform_account", s.platformFeeAccountAddress,
				"input_mint", params.FromCoinMintAddress,
				"output_mint", params.ToCoinMintAddress,
				"swap_mode", swapMode)
		}
	}

	swapResponse, err := s.jupiterClient.CreateSwapTransaction(ctx, tradeQuote.Raw, fromPubKey, feeAccount)
	if err != nil {
		return nil, fmt.Errorf("failed to create swap transaction: %w", err)
	}

	// Calculate comprehensive SOL fee breakdown only if feature flag is enabled
	var feeBreakdown *SolFeeBreakdown
	var totalSolRequired, tradingFeeSol string

	if s.showDetailedBreakdown {
		feeBreakdown, totalSolRequired, tradingFeeSol, err = s.calculateSolFeeBreakdown(ctx, tradeQuote, swapResponse, params.UserWalletAddress, params.FromCoinMintAddress, params.ToCoinMintAddress)
		if err != nil {
			slog.Warn("Failed to calculate SOL fee breakdown", "error", err)
			// Use fallback values
			feeBreakdown = nil
			totalSolRequired = "0"
			tradingFeeSol = "0"
		}
	} else {
		// When detailed breakdown is disabled, use minimal values
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
	// Calculate input amount in decimal form
	inputAmountDecimal := float64(amountInt) / math.Pow(10, float64(fromCoinModel.Decimals))

	// For swaps, we need to get the output amount from the quote
	// The input amount is what we're spending, but we store what we're receiving
	outputAmount := 0.0
	if tradeQuote.EstimatedAmount != "" {
		outputAmount, err = strconv.ParseFloat(tradeQuote.EstimatedAmount, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse estimated output amount: %w", err)
		}
	} else {
		// Fallback: calculate from exchange rate if EstimatedAmount is not available
		outputAmount = inputAmountDecimal * price
	}

	// Calculate USD values for the trade
	// For swaps, use the output value as the cost basis to account for slippage
	// This ensures PnL starts at ~0% immediately after the trade
	totalUSDCost := outputAmount * toCoinModel.Price

	slog.Info("Trade amount tracking",
		"from_token", fromCoinModel.Symbol,
		"to_token", toCoinModel.Symbol,
		"input_amount", inputAmountDecimal,
		"output_amount", outputAmount,
		"from_market_price", fromCoinModel.Price,
		"to_market_price", toCoinModel.Price,
		"input_value_usd", inputAmountDecimal * fromCoinModel.Price,
		"output_value_usd", totalUSDCost,
		"slippage_cost_usd", (inputAmountDecimal * fromCoinModel.Price) - totalUSDCost)

	// Create trade record with essential information
	trade := &model.Trade{
		UserID:              fromPubKey.String(),
		FromCoinMintAddress: params.FromCoinMintAddress,
		FromCoinPKID:        fromCoinModel.ID,
		ToCoinMintAddress:   params.ToCoinMintAddress,
		ToCoinPKID:          toCoinModel.ID,
		CoinSymbol:          fromCoinModel.Symbol,
		Type:                "swap",
		Amount:              outputAmount,        // Store the output amount (what we receive)
		FromUSDPrice:        fromCoinModel.Price, // USD price of FROM token at trade time
		ToUSDPrice:          toCoinModel.Price,   // USD price of TO token at trade time
		TotalUSDCost:        totalUSDCost,        // Total USD cost of the trade
		Fee:                 fee,
		Status:              "prepared",
		UnsignedTransaction: swapResponse.SwapTransaction,
		CreatedAt:           time.Now(),
		Confirmations:       0,
		Finalized:           false,
	}

	// Apply comprehensive fee breakdown if available
	if feeBreakdown != nil {
		// Extract fee information from Jupiter quote response
		var platformFeeMint, totalFeeMint string
		var actualPlatformFee float64
		routeFeeMintsMap := make(map[string]bool) // Track unique route fee mints

		if tradeQuote.Raw != nil {
			var jupiterQuote jupiter.QuoteResponse
			if err := json.Unmarshal(tradeQuote.Raw, &jupiterQuote); err == nil {
				// Extract platform fee information
				if jupiterQuote.PlatformFee != nil {
					platformFeeMint = jupiterQuote.PlatformFee.FeeMint
					if platformAmount, err := strconv.ParseUint(jupiterQuote.PlatformFee.Amount, 10, 64); err == nil {
						// Get decimals for the fee mint token
						decimals := 9.0 // Default to SOL decimals
						// NOTE: Shortcut
						// if platformFeeMint != "" {
						// 	if feeTokenModel, err := s.coinService.GetCoinByAddress(ctx, platformFeeMint); err == nil && feeTokenModel != nil {
						// 		decimals = float64(feeTokenModel.Decimals)
						// 	}
						// }
						actualPlatformFee = float64(platformAmount) / math.Pow(10, decimals)
					}
				}

				// Extract route fee mints from all routes
				for _, route := range jupiterQuote.RoutePlan {
					if route.SwapInfo.FeeMint != "" {
						routeFeeMintsMap[route.SwapInfo.FeeMint] = true
					}
				}

				// Determine the total fee mint - prioritize platform fee mint, then most common route mint, then SOL
				if platformFeeMint != "" {
					totalFeeMint = platformFeeMint
				} else if len(routeFeeMintsMap) > 0 {
					// Use the first route fee mint (could be enhanced to find most common)
					for mint := range routeFeeMintsMap {
						totalFeeMint = mint
						break
					}
				} else {
					totalFeeMint = "So11111111111111111111111111111111111111112" // Fallback to SOL
				}
			}
		}

		// Set total fee amount and mint
		if totalSolFee, err := strconv.ParseFloat(totalSolRequired, 64); err == nil {
			trade.TotalFeeAmount = totalSolFee
			trade.TotalFeeMint = totalFeeMint

			slog.Info("Applied dynamic fee mints to trade",
				"total_fee_mint", totalFeeMint,
				"platform_fee_mint", platformFeeMint,
				"platform_fee_amount", actualPlatformFee,
				"route_fee_mints", len(routeFeeMintsMap))
		}

		// Set platform fee information
		trade.PlatformFeeAmount = actualPlatformFee
		// Use the actual fee mint we determined above (either SOL if available, or input mint)
		if actualPlatformFee > 0 && actualFeeMint != "" {
			trade.PlatformFeeMint = actualFeeMint
			slog.Debug("Setting platform fee mint from actual fee collection",
				"platform_fee_mint", actualFeeMint,
				"platform_fee_amount", actualPlatformFee)
		} else if actualPlatformFee > 0 && platformFeeMint != "" {
			// Fallback to Jupiter's platform fee mint if we didn't set one
			trade.PlatformFeeMint = platformFeeMint
			slog.Debug("Setting platform fee mint from Jupiter response",
				"platform_fee_mint", platformFeeMint,
				"platform_fee_amount", actualPlatformFee)
		}

		// Set route fee (trading fee minus platform fee) and route fee mints
		if tradingFee, err := strconv.ParseFloat(feeBreakdown.TradingFee, 64); err == nil {
			routeFee := tradingFee - actualPlatformFee
			if routeFee > 0 {
				trade.RouteFeeAmount = routeFee

				// Convert route fee mints map to slice
				routeFeeMintsSlice := make([]string, 0, len(routeFeeMintsMap))
				for mint := range routeFeeMintsMap {
					routeFeeMintsSlice = append(routeFeeMintsSlice, mint)
				}

				// Use route fee mints if available, otherwise fall back to total fee mint
				if len(routeFeeMintsSlice) > 0 {
					trade.RouteFeeMints = routeFeeMintsSlice
				} else if totalFeeMint != "" {
					trade.RouteFeeMints = []string{totalFeeMint}
				}
			}
		}

		// Store detailed fee breakdown as JSON
		if feeBreakdownJSON, err := json.Marshal(feeBreakdown); err == nil {
			trade.RouteFeeDetails = string(feeBreakdownJSON)
		}

		// Set price impact if available from the quote
		if priceImpact, err := strconv.ParseFloat(tradeQuote.PriceImpact, 64); err == nil {
			trade.PriceImpactPercent = priceImpact
		}
	}

	// Set platform fee fallback
	if trade.PlatformFeeBps == 0 && s.platformFeeBps > 0 {
		trade.PlatformFeeBps = s.platformFeeBps
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
		originalChainError := err // Store the original error
		errStr := originalChainError.Error()

		// Check if error is due to insufficient funds
		insufficientFundsError := strings.Contains(strings.ToLower(errStr), "insufficient") ||
			strings.Contains(strings.ToLower(errStr), "0x1") // Solana error code for insufficient funds

		if insufficientFundsError && !s.showDetailedBreakdown {
			// Hard delete the trade record for insufficient funds errors since the transaction was never executed
			if deleteErr := s.store.Trades().HardDelete(ctx, fmt.Sprintf("%d", trade.ID)); deleteErr != nil {
				slog.Warn("Failed to hard delete trade record after insufficient funds error",
					"error", deleteErr,
					"trade_id", trade.ID,
					"original_error", errStr)
			} else {
				slog.Info("Hard deleted trade record due to insufficient funds error (transaction never executed)",
					"trade_id", trade.ID,
					"error", errStr)
			}
		} else {
			// For other errors or when detailed breakdown is enabled, update the trade as failed
			trade.Status = "failed"
			trade.Error = errStr
			if errUpdate := s.store.Trades().Update(ctx, trade); errUpdate != nil {
				slog.Warn("Failed to update failed trade status", "error", errUpdate)
			}
		}

		// Check for insufficient funds error and provide user-friendly message
		if isInsufficientFundsError(originalChainError) {
			return nil, fmt.Errorf("insufficient SOL balance to complete this transaction. Please add more SOL to your wallet to cover network fees and try again")
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
func (s *Service) GetSwapQuote(ctx context.Context, fromCoinMintAddress, toCoinMintAddress string, inputAmount string, slippageBsp string, includeFeeBreakdown bool, userPublicKey string, allowMultiHop bool) (*TradeQuote, error) {
	if !util.IsValidSolanaAddress(fromCoinMintAddress) {
		return nil, fmt.Errorf("invalid from_coin_mint_address: %s", fromCoinMintAddress)
	}
	if !util.IsValidSolanaAddress(toCoinMintAddress) {
		return nil, fmt.Errorf("invalid to_coin_mint_address: %s", toCoinMintAddress)
	}

	// Frontend already sends raw amounts (lamports for SOL), so validate as integer
	amountInt, err := strconv.ParseUint(inputAmount, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid input_amount (must be positive integer in raw units): %w", err)
	}
	if amountInt == 0 {
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
	slog.InfoContext(ctx, "Fetching coin details for swap quote",
		slog.String("from_mint_address", fromCoinMintAddress),
		slog.String("to_mint_address", toCoinMintAddress),
		slog.String("amount", inputAmount),
		slog.Bool("allow_multi_hop", allowMultiHop))

	fromCoin, err := s.coinService.GetCoinByAddress(ctx, fromCoinMintAddress) // Use new method
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get from coin",
			slog.String("mint_address", fromCoinMintAddress),
			slog.Any("error", err))
		return nil, fmt.Errorf("failed to get from coin %s: %w", fromCoinMintAddress, err)
	}
	slog.InfoContext(ctx, "Successfully fetched from coin",
		slog.String("symbol", fromCoin.Symbol),
		slog.String("name", fromCoin.Name),
		slog.String("address", fromCoin.Address))

	toCoin, err := s.coinService.GetCoinByAddress(ctx, toCoinMintAddress) // Use new method
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get to coin",
			slog.String("mint_address", toCoinMintAddress),
			slog.Any("error", err))
		return nil, fmt.Errorf("failed to get to coin %s: %w", toCoinMintAddress, err)
	}
	slog.InfoContext(ctx, "Successfully fetched to coin",
		slog.String("symbol", toCoin.Symbol),
		slog.String("name", toCoin.Name),
		slog.String("address", toCoin.Address))

	// Normalize native SOL addresses to wSOL for Jupiter API
	jupiterInputMint := fromCoinMintAddress
	if fromCoinMintAddress == model.NativeSolMint {
		jupiterInputMint = model.SolMint
	}

	jupiterOutputMint := toCoinMintAddress
	if toCoinMintAddress == model.NativeSolMint {
		jupiterOutputMint = model.SolMint
	}

	// Log routing choice
	if allowMultiHop {
		slog.Info("Multi-hop routing enabled",
			"from", fromCoin.Symbol,
			"to", toCoin.Symbol)
	}

	// Get quote from Jupiter with enhanced parameters
	quote, err := s.jupiterClient.GetQuote(ctx, jupiter.QuoteParams{
		InputMint:        jupiterInputMint,  // Use normalized mint address
		OutputMint:       jupiterOutputMint, // Use normalized mint address
		Amount:           inputAmount,       // Amount is already in raw units (lamports for SOL)
		SlippageBps:      slippageBpsInt,
		PlatformFeeBps:   s.platformFeeBps, // Re-enabled: use proper ATA as fee account
		SwapMode:         "ExactIn",
		OnlyDirectRoutes: !allowMultiHop, // Use multi-hop based on user preference
		// AsLegacyTransaction removed - was preventing trades with newer DEXes like Meteora DLMM
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
	initialAmount := float64(amountInt)
	exchangeRate := outAmount / initialAmount

	truncatedPriceImpact := truncateDecimals(quote.PriceImpactPct, 6)

	// Calculate detailed SOL fee breakdown only if requested
	var feeBreakdown *SolFeeBreakdown
	var totalSolRequired, tradingFeeSol string

	if includeFeeBreakdown && s.showDetailedBreakdown {
		if userPublicKey == "" {
			return nil, fmt.Errorf("user_public_key is required when includeFeeBreakdown=true")
		}

		// Validate user public key
		if !util.IsValidSolanaAddress(userPublicKey) {
			return nil, fmt.Errorf("invalid user_public_key: %s", userPublicKey)
		}

		// Parse user public key for swap transaction creation
		fromPubKey, err := solanago.PublicKeyFromBase58(userPublicKey)
		if err != nil {
			return nil, fmt.Errorf("invalid user public key: %w", err)
		}

		// Calculate platform fee account ATA for fee breakdown
		// According to Jupiter docs: fee account must be for input or output mint
		const solMint = "So11111111111111111111111111111111111111112"

		var feeAccount string
		if s.platformFeeAccountAddress != "" && fromCoinMintAddress != "" && toCoinMintAddress != "" {
			platformFeePubKey, err := solanago.PublicKeyFromBase58(s.platformFeeAccountAddress)
			if err == nil {
				// Determine which mint to use for fee collection
				var feeMint string
				var useDirectAccount bool

				if fromCoinMintAddress == solMint {
					feeMint = solMint
					useDirectAccount = true
				} else if toCoinMintAddress == solMint {
					feeMint = solMint
					useDirectAccount = true
				} else {
					feeMint = fromCoinMintAddress
					useDirectAccount = false
				}

				if useDirectAccount {
					// For SOL, we still need to use the wrapped SOL ATA
					feeMintPubKey, err := solanago.PublicKeyFromBase58(feeMint)
					if err == nil {
						feeAccountATA, _, err := solanago.FindAssociatedTokenAddress(platformFeePubKey, feeMintPubKey)
						if err == nil {
							// Check if ATA exists before using it
							if s.ataExists(ctx, feeAccountATA) {
								feeAccount = feeAccountATA.String()
							}
						}
					}
				} else {
					// For SPL tokens, calculate the ATA
					feeMintPubKey, err := solanago.PublicKeyFromBase58(feeMint)
					if err == nil {
						feeAccountATA, _, err := solanago.FindAssociatedTokenAddress(platformFeePubKey, feeMintPubKey)
						if err == nil {
							// Check if ATA exists before using it
							if s.ataExists(ctx, feeAccountATA) {
								feeAccount = feeAccountATA.String()
							}
						}
					}
				}
			}
		}

		// Create swap transaction to get accurate fee breakdown
		swapResponse, err := s.jupiterClient.CreateSwapTransaction(ctx, quote.RawPayload, fromPubKey, feeAccount)
		if err != nil {
			slog.Warn("Failed to create swap transaction for fee breakdown", "error", err)
			// Fall back to quote-only calculation
			feeBreakdown, totalSolRequired, tradingFeeSol, err = s.calculateSolFeeBreakdownFromQuote(ctx, quote, userPublicKey, fromCoinMintAddress, toCoinMintAddress)
			if err != nil {
				slog.Warn("Failed to calculate SOL fee breakdown from quote", "error", err)
				feeBreakdown = nil
				totalSolRequired = "0"
				tradingFeeSol = "0"
			}
		} else {
			// Calculate accurate fee breakdown using both quote and swap response
			feeBreakdown, totalSolRequired, tradingFeeSol, err = s.calculateSolFeeBreakdown(ctx, &TradeQuote{Raw: quote.RawPayload}, swapResponse, userPublicKey, fromCoinMintAddress, toCoinMintAddress)
			if err != nil {
				slog.Warn("Failed to calculate SOL fee breakdown", "error", err)
				feeBreakdown = nil
				totalSolRequired = "0"
				tradingFeeSol = "0"
			}
		}
	} else {
		// No detailed fee breakdown requested - but still extract basic fees from Jupiter
		feeBreakdown = nil

		// Extract basic SOL fees from Jupiter quote
		var routeFee, platformFee uint64
		const solMint = "So11111111111111111111111111111111111111112"

		// Extract route fees
		for _, route := range quote.RoutePlan {
			if route.SwapInfo.FeeMint == solMint && route.SwapInfo.FeeAmount != "" {
				if feeAmount, err := strconv.ParseUint(route.SwapInfo.FeeAmount, 10, 64); err == nil {
					routeFee += feeAmount
				}
			}
		}

		// Extract platform fees
		if quote.PlatformFee != nil && quote.PlatformFee.FeeMint == solMint {
			if platformAmount, err := strconv.ParseUint(quote.PlatformFee.Amount, 10, 64); err == nil {
				platformFee = platformAmount
			}
		}

		// Convert to SOL (divide by 10^9)
		totalFeeLamports := routeFee + platformFee
		totalSolRequired = fmt.Sprintf("%.9f", float64(totalFeeLamports)/1e9)
		tradingFeeSol = fmt.Sprintf("%.9f", float64(routeFee+platformFee)/1e9)
	}

	// Log detailed quote information
	slog.Info("Jupiter Quote Details",
		"input", fmt.Sprintf("%v %s", initialAmount, fromCoin.Symbol),
		"output", fmt.Sprintf("%v %s", estimatedAmountInCoin, toCoin.Symbol),
		"price_impact", quote.PriceImpactPct,
		"route", routeSummary,
		"total_fee_usd", totalFeeInUSD,
		"total_sol_required", totalSolRequired,
		"trading_fee_sol", tradingFeeSol)

	// Use the actual decimals from the tokens for formatting
	estimatedAmountFormat := fmt.Sprintf("%%.%df", toCoin.Decimals)
	exchangeRateFormat := fmt.Sprintf("%%.%df", int(math.Max(float64(fromCoin.Decimals), float64(toCoin.Decimals))))

	return &TradeQuote{
		EstimatedAmount:  fmt.Sprintf(estimatedAmountFormat, estimatedAmountInCoin),
		ExchangeRate:     fmt.Sprintf(exchangeRateFormat, exchangeRate),
		Fee:              fmt.Sprintf("%.9f", totalFeeInUSDCoin), // Keep SOL fee at 9 decimals
		PriceImpact:      truncatedPriceImpact,
		RoutePlan:        routeSummary,
		InputMint:        quote.InputMint,
		OutputMint:       quote.OutputMint,
		Raw:              quote.RawPayload,
		SolFeeBreakdown:  feeBreakdown,     // Now calculated from quote
		TotalSolRequired: totalSolRequired, // Now calculated from quote
		TradingFeeSol:    tradingFeeSol,    // Now calculated from quote
	}, nil
}

// Helper functions for string manipulation
// isInsufficientFundsError checks if the error is due to insufficient lamports/SOL
func isInsufficientFundsError(err error) bool {
	if err == nil {
		return false
	}

	errorString := err.Error()

	// Check for common insufficient funds patterns in Solana errors
	insufficientPatterns := []string{
		"Transfer: insufficient lamports",
		"insufficient lamports",
		"insufficient funds",
		"Attempt to debit an account but found no record of a prior credit",
		"custom program error: 0x1", // This is the custom error code for insufficient funds
	}

	for _, pattern := range insufficientPatterns {
		if strings.Contains(errorString, pattern) {
			return true
		}
	}

	return false
}

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
	if trade.Status == model.TradeStatusFinalized.String() || trade.Status == model.TradeStatusFailed.String() {
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
			confirmations := 0
			if chainStatus.Confirmations != nil {
				confirmations = int(*chainStatus.Confirmations)
			}
			slog.Info("Transaction status is unknown or still pending", "trade_id", trade.ID, "status", chainStatus.Status, "confirmations", confirmations)
			// Clear any previous error for unknown/pending status
			if trade.Error != "" {
				trade.Error = ""
				statusChanged = true
			}

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

	// Record metrics for finalized trades
	if trade.Finalized && trade.Status == model.TradeStatusFinalized.String() {
		if s.metrics != nil {
			s.metrics.RecordTrade(ctx)
			if trade.PlatformFeeAmount > 0 {
				// Find symbol for the fee mint
				feeCoin, err := s.coinService.GetCoinByAddress(ctx, trade.PlatformFeeMint)
				if err == nil {
					s.metrics.RecordPlatformFee(ctx, trade.PlatformFeeAmount, feeCoin.Symbol)
				} else {
					slog.Warn("Failed to get coin details for fee metric", "mint", trade.PlatformFeeMint)
				}
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
	// TODO: Fix type assertion issue with conflicting interface methods
	// Temporarily return an error to avoid compilation issues
	return nil, fmt.Errorf("GetFeeForMessage temporarily disabled due to interface conflicts")
}

// checkRequiredATAs determines how many ATAs need to be created for a swap
func (s *Service) checkRequiredATAs(ctx context.Context, userPublicKey, inputMint, outputMint string) (int, error) {
	// Parse the user's public key
	userPubkey, err := solanago.PublicKeyFromBase58(userPublicKey)
	if err != nil {
		return 0, fmt.Errorf("invalid user public key: %w", err)
	}

	atasToCreate := 0

	// Check input mint ATA (skip ONLY if it's native SOL)
	if inputMint != model.NativeSolMint {
		// wSOL and all other tokens need ATAs
		inputMintPubkey, err := solanago.PublicKeyFromBase58(inputMint)
		if err != nil {
			return 0, fmt.Errorf("invalid input mint: %w", err)
		}

		inputATA, _, err := solanago.FindAssociatedTokenAddress(userPubkey, inputMintPubkey)
		if err != nil {
			return 0, fmt.Errorf("failed to derive input ATA address: %w", err)
		}

		// Check if ATA exists
		if !s.ataExists(ctx, inputATA) {
			atasToCreate++
			slog.Debug("Input ATA needs creation",
				"ata", inputATA.String(),
				"mint", inputMint,
				"is_wsol", inputMint == model.SolMint)
		}
	} else {
		slog.Debug("Input is native SOL, no ATA needed", "mint", inputMint)
	}

	// Check output mint ATA (skip ONLY if it's native SOL)
	if outputMint != model.NativeSolMint {
		// wSOL and all other tokens need ATAs
		outputMintPubkey, err := solanago.PublicKeyFromBase58(outputMint)
		if err != nil {
			return 0, fmt.Errorf("invalid output mint: %w", err)
		}

		outputATA, _, err := solanago.FindAssociatedTokenAddress(userPubkey, outputMintPubkey)
		if err != nil {
			return 0, fmt.Errorf("failed to derive output ATA address: %w", err)
		}

		// Check if ATA exists
		if !s.ataExists(ctx, outputATA) {
			atasToCreate++
			slog.Debug("Output ATA needs creation",
				"ata", outputATA.String(),
				"mint", outputMint,
				"is_wsol", outputMint == model.SolMint)
		}
	} else {
		slog.Debug("Output is native SOL, no ATA needed", "mint", outputMint)
	}

	slog.Info("Dynamic ATA calculation",
		"user", userPublicKey,
		"input_mint", inputMint,
		"output_mint", outputMint,
		"input_is_native_sol", inputMint == model.NativeSolMint,
		"output_is_native_sol", outputMint == model.NativeSolMint,
		"input_is_wsol", inputMint == model.SolMint,
		"output_is_wsol", outputMint == model.SolMint,
		"atas_to_create", atasToCreate)

	return atasToCreate, nil
}

// ataExists checks if an Associated Token Account exists on-chain
func (s *Service) ataExists(ctx context.Context, ataAddress solanago.PublicKey) bool {
	accountInfo, err := s.chainClient.GetAccountInfo(ctx, bmodel.Address(ataAddress.String()))
	if err != nil {
		slog.Debug("Failed to get ATA account info", "ata", ataAddress.String(), "error", err)
		return false
	}

	// Account exists if it's not nil and not owned by the system program (uninitialized)
	systemProgram := bmodel.Address(solanago.SystemProgramID.String())
	return accountInfo != nil && accountInfo.Owner != systemProgram
}

// createATA creates an Associated Token Account for the given owner and mint
func (s *Service) createATA(ctx context.Context, owner, mint solanago.PublicKey, signerKey *solanago.PrivateKey) error {
	if signerKey == nil {
		return fmt.Errorf("signer key is required for ATA creation")
	}

	// Safety check: Convert native SOL to wSOL for ATA creation
	if mint.String() == "11111111111111111111111111111111" {
		// Native SOL doesn't have ATAs, use wSOL instead
		wsolMint, _ := solanago.PublicKeyFromBase58(model.SolMint)
		mint = wsolMint
		slog.Debug("Converting native SOL to wSOL for ATA creation", "original", "11111111111111111111111111111111", "converted", mint.String())
	}

	// Calculate ATA address
	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return fmt.Errorf("failed to calculate ATA: %w", err)
	}

	// Check if ATA already exists
	if s.ataExists(ctx, ata) {
		slog.Debug("ATA already exists, skipping creation", "ata", ata.String(), "mint", mint.String())
		return nil
	}

	slog.Info("Creating ATA", "ata", ata.String(), "owner", owner.String(), "mint", mint.String())

	// Create ATA instruction
	instruction := associatedtokenaccount.NewCreateInstruction(
		owner, // payer (platform account pays for creation)
		owner, // wallet (owner of the ATA)
		mint,  // mint
	).Build()

	// Get recent blockhash
	recentBlockhash, err := s.chainClient.GetLatestBlockhash(ctx)
	if err != nil {
		return fmt.Errorf("failed to get blockhash: %w", err)
	}

	blockhash, err := solanago.HashFromBase58(string(recentBlockhash))
	if err != nil {
		return fmt.Errorf("failed to parse blockhash: %w", err)
	}

	// Create transaction
	tx, err := solanago.NewTransaction(
		[]solanago.Instruction{instruction},
		blockhash,
		solanago.TransactionPayer(owner),
	)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solanago.PublicKey) *solanago.PrivateKey {
		if key == owner {
			return signerKey
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to marshal transaction: %w", err)
	}

	sig, err := s.chainClient.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
	})
	if err != nil {
		return fmt.Errorf("failed to send transaction: %w", err)
	}

	slog.Info("ATA creation transaction sent", "signature", sig, "ata", ata.String())
	return nil
}

// calculateSolFeeBreakdown sums all SOL lamport needs and returns formatted breakdown
func (s *Service) calculateSolFeeBreakdown(
	ctx context.Context,
	quote *TradeQuote,
	swapTx *jupiter.SwapResponse,
	userPublicKey, inputMint, outputMint string,
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

	// 2. Calculate actual ATA creation needs dynamically
	atasToCreate, err := s.checkRequiredATAs(ctx, userPublicKey, inputMint, outputMint)
	if err != nil {
		slog.Warn("Failed to check required ATAs, falling back to conservative estimate",
			"error", err,
			"input_mint", inputMint,
			"output_mint", outputMint,
			"fallback_ata_count", 2)
		atasToCreate = 2 // Fallback to conservative estimate
	}
	ataCount := uint64(atasToCreate)
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
		"swap_type", fmt.Sprintf("%s -> %s", inputMint, outputMint),
		"calculation_method", "full_swap_response",
	)

	return bd, bd.Total, bd.TradingFee, nil
}

// calculateSolFeeBreakdownFromQuote calculates fee breakdown from quote only (without swap transaction)
// This provides upfront fee estimates during quote phase
func (s *Service) calculateSolFeeBreakdownFromQuote(
	ctx context.Context,
	quote *jupiter.QuoteResponse,
	userPublicKey, inputMint, outputMint string,
) (*SolFeeBreakdown, string, string, error) {
	const (
		solMint          = "So11111111111111111111111111111111111111112"
		ataRentLamports  = 2_039_280 // rent-exempt minimum
		priorityLamports = 1_000_000 // tip per tx (estimated)
	)

	// 1. Extract SOL route & platform fees from the Jupiter quote response
	var routeFee, platformFee uint64

	// Extract route fees from the quote
	for _, route := range quote.RoutePlan {
		if route.SwapInfo.FeeMint == solMint && route.SwapInfo.FeeAmount != "" {
			if feeAmount, err := strconv.ParseUint(route.SwapInfo.FeeAmount, 10, 64); err == nil {
				routeFee += feeAmount
			}
		}
	}

	// Extract platform fees from the quote
	if quote.PlatformFee != nil && quote.PlatformFee.FeeMint == solMint {
		if platformAmount, err := strconv.ParseUint(quote.PlatformFee.Amount, 10, 64); err == nil {
			platformFee = platformAmount
		}
	}

	// 2. Calculate actual ATA creation needs dynamically
	atasToCreate, err := s.checkRequiredATAs(ctx, userPublicKey, inputMint, outputMint)
	if err != nil {
		slog.Warn("Failed to check required ATAs in quote-only calculation, falling back to conservative estimate", "error", err)
		atasToCreate = 2 // Fallback to conservative estimate
	}
	ataCount := uint64(atasToCreate)
	netRent := ataCount * ataRentLamports

	// 3. Estimate transaction count and fees (without actual swap transaction)
	// Assume 1 main transaction + possible setup/cleanup
	txCount := uint64(1) // Main swap transaction
	// Add estimated setup/cleanup transactions for complex routes
	if len(quote.RoutePlan) > 1 {
		txCount++ // Likely needs setup transaction for multi-hop swaps
	}

	// 4. Use estimated priority fee (since we don't have actual swap response)
	prioFeePerTx := uint64(priorityLamports)

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
		TradingFee:         fmtSol(routeFee + platformFee), // Combine route and platform fees
		TransactionFee:     fmtSol(baseFee),
		AccountCreationFee: fmtSol(netRent),
		PriorityFee:        fmtSol(prioFee),
		Total:              fmtSol(totalLam),
		AccountsToCreate:   int(ataCount),
	}

	slog.Info("SOL Fee Breakdown (from quote)",
		"trading_fee", bd.TradingFee,
		"transaction_fee", bd.TransactionFee,
		"account_creation_fee", bd.AccountCreationFee,
		"priority_fee", bd.PriorityFee,
		"total_sol_required", bd.Total,
		"accounts_to_create", bd.AccountsToCreate,
		"swap_type", fmt.Sprintf("%s -> %s", inputMint, outputMint),
		"calculation_method", "quote_only_estimate",
		"estimated", true,
	)

	return bd, bd.Total, bd.TradingFee, nil
}
