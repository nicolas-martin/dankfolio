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
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"

	// "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana" // To be replaced

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
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
func (s *Service) PrepareSwap(ctx context.Context, params model.PrepareSwapRequestData) (string, error) {
	// Parse and validate fromAddress (public key)
	fromPubKey, err := solanago.PublicKeyFromBase58(params.UserWalletAddress)
	if err != nil {
		return "", fmt.Errorf("invalid from address: %w", err)
	}
	// Fetch coin models to get their PKIDs
	fromCoinModel, err := s.coinService.GetCoinByMintAddress(ctx, params.FromCoinMintAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get fromCoin details for %s: %w", params.FromCoinMintAddress, err)
	}
	toCoinModel, err := s.coinService.GetCoinByMintAddress(ctx, params.ToCoinMintAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get toCoin details for %s: %w", params.ToCoinMintAddress, err)
	}

	// 1. Use the TradeService's GetSwapQuote for all conversion and logic
	tradeQuote, err := s.GetSwapQuote(ctx, params.FromCoinMintAddress, params.ToCoinMintAddress, params.Amount, params.SlippageBps)
	if err != nil {
		return "", fmt.Errorf("failed to get trade quote: %w", err)
	}
	slog.Debug("tradeQuote.Raw after GetSwapQuote", "trade_quote", string(tradeQuote.Raw))

	unsignedTx, err := s.jupiterClient.CreateSwapTransaction(ctx, tradeQuote.Raw, fromPubKey, s.platformFeeAccountAddress)
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
	amount, err := strconv.ParseFloat(params.Amount, 64)
	if err != nil {
		return "", fmt.Errorf("failed to parse input amount: %w", err)
	}

	// 3. Create a new Trade record
	trade := &model.Trade{
		UserID:              fromPubKey.String(), // Set the user_id to the wallet address
		FromCoinMintAddress: params.FromCoinMintAddress,
		FromCoinPKID:        fromCoinModel.ID,
		ToCoinMintAddress:   params.ToCoinMintAddress,
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

	// Populate platform fee details and extract comprehensive fee information
	actualPlatformFeeBpsFromQuote := 0
	var routeFeeDetails []map[string]any
	var totalRouteFeeAmount float64
	var routeFeeMints []string
	var priceImpactPercent float64

	if tradeQuote.Raw != nil {
		var tempQuoteResp jupiter.QuoteResponse
		slog.Debug("tradeQuote.Raw before fee extraction", "trade_quote", string(tradeQuote.Raw))
		if errUnmarshal := json.Unmarshal(tradeQuote.Raw, &tempQuoteResp); errUnmarshal == nil {

			// Extract platform fee information
			if tempQuoteResp.PlatformFee != nil {
				actualPlatformFeeBpsFromQuote = tempQuoteResp.PlatformFee.FeeBps
				if tempQuoteResp.PlatformFee.Amount != "" {
					platformFeeAmount, pErr := strconv.ParseFloat(tempQuoteResp.PlatformFee.Amount, 64)
					if pErr == nil {
						trade.PlatformFeeAmount = platformFeeAmount
					} else {
						slog.Warn("Failed to parse platform_fee_amount from quote", "error", pErr)
					}
				}
				trade.PlatformFeeMint = tempQuoteResp.PlatformFee.FeeMint
			}

			// Extract route fee information
			routeFeeMintSet := make(map[string]bool)
			for _, route := range tempQuoteResp.RoutePlan {
				if route.SwapInfo.FeeAmount != "" {
					routeFeeAmount, err := strconv.ParseFloat(route.SwapInfo.FeeAmount, 64)
					if err == nil {
						totalRouteFeeAmount += routeFeeAmount
						routeFeeMintSet[route.SwapInfo.FeeMint] = true

						// Store detailed route fee info
						routeFeeDetails = append(routeFeeDetails, map[string]any{
							"label":     route.SwapInfo.Label,
							"feeMint":   route.SwapInfo.FeeMint,
							"feeAmount": routeFeeAmount,
						})
					}
				}
			}

			// Convert route fee mints set to slice
			for mint := range routeFeeMintSet {
				routeFeeMints = append(routeFeeMints, mint)
			}

			// Extract price impact
			if tempQuoteResp.PriceImpactPct != "" {
				priceImpactPercent, _ = strconv.ParseFloat(tempQuoteResp.PriceImpactPct, 64)
			}

		} else {
			slog.Warn("Failed to unmarshal tradeQuote.Raw in PrepareSwap for fee extraction", "error", errUnmarshal)
		}
	}

	// Populate all fee fields in trade
	trade.RouteFeeAmount = totalRouteFeeAmount
	trade.RouteFeeMints = routeFeeMints
	trade.PriceImpactPercent = priceImpactPercent

	// Store detailed route fee information as JSON
	if len(routeFeeDetails) > 0 {
		if routeFeeDetailsJSON, err := json.Marshal(routeFeeDetails); err == nil {
			trade.RouteFeeDetails = string(routeFeeDetailsJSON)
		}
	}

	// Calculate total fee amount (route fees + platform fees)
	trade.TotalFeeAmount = totalRouteFeeAmount + trade.PlatformFeeAmount

	// Set total fee mint (use the most common route fee mint or platform fee mint)
	if len(routeFeeMints) > 0 {
		trade.TotalFeeMint = routeFeeMints[0] // Use first route fee mint as primary
	} else if trade.PlatformFeeMint != "" {
		trade.TotalFeeMint = trade.PlatformFeeMint
	}

	// Set PlatformFeePercent based on what was in the quote, or fallback to input if quote didn't specify
	if actualPlatformFeeBpsFromQuote > 0 {
		trade.PlatformFeePercent = float64(actualPlatformFeeBpsFromQuote) / 100.0
	} else if s.platformFeeBps > 0 { // Use service's configured platformFeeBps
		trade.PlatformFeePercent = float64(s.platformFeeBps) / 100.0
		slog.Warn("PlatformFee.FeeBps not present in Jupiter's quote response. Using configured FeeBps", "fee_bps", s.platformFeeBps)
		// PlatformFeeAmount would be zero or unset if not in quote.PlatformFee.Amount
	}

	if s.platformFeeAccountAddress != "" { // Use service's configured address
		trade.PlatformFeeDestination = s.platformFeeAccountAddress
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
