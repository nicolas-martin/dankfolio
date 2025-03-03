package solana

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

// ExecuteRaydiumSwap executes a swap on Raydium DEX
// Never call this directly, always use ExecuteTrade
func (s *SolanaTradeService) ExecuteRaydiumSwap(ctx context.Context, params *SwapParams, privKey solana.PrivateKey) (string, error) {
	log.Printf("🔄 Starting Raydium swap: %f %s -> %s", params.Amount, params.FromCoinID, params.ToCoinID)

	// Get priority fee
	priorityFee, err := s.getRaydiumPriorityFee(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get priority fee: %w", err)
	}
	log.Printf("💰 Got priority fee: %d", priorityFee.Data.Default.H)

	// Get swap quote
	quote, err := s.getRaydiumSwapQuote(ctx, params)
	if err != nil {
		return "", fmt.Errorf("failed to get swap quote: %w", err)
	}
	log.Printf("📊 Got swap quote")

	// Get swap transaction
	txData, err := s.getRaydiumSwapTransaction(ctx, quote, priorityFee, params, privKey.PublicKey().String())
	if err != nil {
		return "", fmt.Errorf("failed to get swap transaction: %w", err)
	}

	log.Printf("📝 Processing transaction with ID: %s", txData.Data.TxID)

	// Process and send transaction
	sig, err := s.processAndSendTransaction(ctx, txData.Data.TxID, privKey)
	if err != nil {
		return "", fmt.Errorf("failed to process transaction: %w", err)
	}
	log.Printf("✅ Transaction sent: %s", sig)

	return sig, nil
}

// getRaydiumPriorityFee gets the current priority fee for Raydium transactions
func (s *SolanaTradeService) getRaydiumPriorityFee(ctx context.Context) (*PriorityFeeResponse, error) {
	url := fmt.Sprintf("%s/v2/main/priority-fee", raydiumBaseHost)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get priority fee: %w", err)
	}
	defer resp.Body.Close()

	var priorityFee PriorityFeeResponse
	if err := json.NewDecoder(resp.Body).Decode(&priorityFee); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !priorityFee.Success {
		return nil, fmt.Errorf("priority fee request unsuccessful")
	}

	return &priorityFee, nil
}

// getRaydiumSwapQuote gets a quote for a swap from Raydium
func (s *SolanaTradeService) getRaydiumSwapQuote(ctx context.Context, params *SwapParams) (*SwapQuoteResponse, error) {
	// Get input token decimals
	inputDecimals := params.InputDecimals
	if inputDecimals == 0 {
		inputDecimals = 6 // Default to 6 decimals if not specified
	}

	// Convert amount to raw units based on decimals
	rawAmount := int64(params.Amount * math.Pow(10, float64(inputDecimals)))

	// Log request parameters
	log.Printf("🔍 Swap Quote Request Parameters:")
	log.Printf("  From Token: %s", params.FromCoinID)
	log.Printf("  To Token: %s", params.ToCoinID)
	log.Printf("  Amount: %f (Raw: %d)", params.Amount, rawAmount)
	log.Printf("  Input Decimals: %d", inputDecimals)
	log.Printf("  Slippage: %f%%", params.Slippage)

	// Construct URL with required parameters
	url := fmt.Sprintf("%s/compute/swap-base-in?inputMint=%s&outputMint=%s&amount=%d&slippageBps=%d&txVersion=V0&network=mainnet&wrapUnwrapSOL=true",
		raydiumSwapHost,
		params.FromCoinID,
		params.ToCoinID,
		rawAmount,
		int64(params.Slippage*100), // Convert to basis points
	)

	log.Printf("🌐 Requesting quote from URL: %s", url)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get swap quote: %w", err)
	}
	defer resp.Body.Close()

	// Read and log response body for debugging
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	log.Printf("Raydium quote response: %s", string(body))

	var quote SwapQuoteResponse
	if err := json.NewDecoder(bytes.NewReader(body)).Decode(&quote); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !quote.Success {
		return nil, fmt.Errorf("quote request unsuccessful: %s", string(body))
	}

	return &quote, nil
}

// getRaydiumSwapTransaction gets a swap transaction from Raydium
func (s *SolanaTradeService) getRaydiumSwapTransaction(ctx context.Context, quote *SwapQuoteResponse, fee *PriorityFeeResponse, params *SwapParams, walletAddress string) (*SwapTransactionResponse, error) {
	// Check if we have any routes
	if len(quote.Data.RoutePlan) == 0 {
		return nil, fmt.Errorf("no routes found for swap")
	}

	// Prepare request URL
	url := fmt.Sprintf("%s/v2/raydium/swap", raydiumSwapHost)

	// Prepare request body
	requestBody := map[string]interface{}{
		"inputMint":     params.FromCoinID,
		"outputMint":    params.ToCoinID,
		"amount":        quote.Data.InputAmount,
		"slippage":      int64(params.Slippage * 100), // Convert to basis points
		"walletAddress": walletAddress,
		"outputAmount":  quote.Data.OutputAmount,
		"priorityFee":   fee.Data.Default.H,
		"computeLimit":  400000, // Default compute limit
	}

	// Log transaction request
	log.Printf("📝 Swap Transaction Request:")
	log.Printf("  Input Mint: %s", params.FromCoinID)
	log.Printf("  Output Mint: %s", params.ToCoinID)
	log.Printf("  Amount In: %s", quote.Data.InputAmount)
	log.Printf("  Amount Out: %s", quote.Data.OutputAmount)
	log.Printf("  Slippage: %f%%", params.Slippage)
	log.Printf("  Priority Fee: %d", fee.Data.Default.H)

	// Convert request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get swap transaction: %w", err)
	}
	defer resp.Body.Close()

	// Decode response
	var txResp SwapTransactionResponse
	if err := json.NewDecoder(resp.Body).Decode(&txResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !txResp.Success {
		return nil, fmt.Errorf("transaction request unsuccessful")
	}

	return &txResp, nil
}

// processAndSendTransaction processes and sends a transaction to the Solana blockchain
func (s *SolanaTradeService) processAndSendTransaction(ctx context.Context, encodedTx string, privKey solana.PrivateKey) (string, error) {
	// Decode the transaction
	txBytes, err := base64.StdEncoding.DecodeString(encodedTx)
	if err != nil {
		return "", fmt.Errorf("failed to decode transaction: %w", err)
	}

	// Parse the transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse transaction: %w", err)
	}

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(privKey.PublicKey()) {
			return &privKey
		}
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send the transaction
	sig, err := s.client.SendTransactionWithOpts(
		ctx,
		tx,
		rpc.TransactionOpts{
			SkipPreflight: true,
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	// Check transaction status
	status, err := s.client.GetSignatureStatuses(
		ctx,
		true,
		sig,
	)
	if err != nil {
		log.Printf("⚠️ Failed to get transaction status: %v", err)
	} else if status.Value[0] != nil && status.Value[0].Err != nil {
		return "", fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	return sig.String(), nil
}

// GetSwapQuote gets a quote for a potential swap between tokens
func (s *SolanaTradeService) GetSwapQuote(ctx context.Context, fromCoinID, toCoinID string, amount float64, getTokenDecimals func(tokenID string) int) (float64, float64, error) {
	// Get input token decimals
	inputDecimals := getTokenDecimals(fromCoinID)

	// Create swap params
	params := &SwapParams{
		FromCoinID:    fromCoinID,
		ToCoinID:      toCoinID,
		Amount:        amount,
		Slippage:      0.5, // 0.5% slippage
		InputDecimals: inputDecimals,
	}

	// Get quote from Raydium
	quote, err := s.getRaydiumSwapQuote(ctx, params)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get swap quote: %w", err)
	}

	// Get output token decimals using the provided function
	outputDecimals := getTokenDecimals(toCoinID)

	// Parse output amount
	outputAmountRaw, err := strconv.ParseFloat(quote.Data.OutputAmount, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse output amount: %w", err)
	}

	// Convert output amount to decimal form
	outputAmount := outputAmountRaw / math.Pow10(outputDecimals)

	// Calculate exchange rate
	exchangeRate := outputAmount / amount

	return outputAmount, exchangeRate, nil
}
