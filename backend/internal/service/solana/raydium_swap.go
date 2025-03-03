package solana

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
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

// getRaydiumPriorityFee fetches the current priority fee from Raydium
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

	var feeData PriorityFeeResponse
	if err := json.NewDecoder(resp.Body).Decode(&feeData); err != nil {
		return nil, fmt.Errorf("failed to decode priority fee response: %w", err)
	}

	if !feeData.Success {
		return nil, fmt.Errorf("priority fee request failed")
	}

	return &feeData, nil
}

// getRaydiumSwapQuote fetches a swap quote from Raydium
func (s *SolanaTradeService) getRaydiumSwapQuote(ctx context.Context, params *SwapParams) (*SwapQuoteResponse, error) {
	url := fmt.Sprintf("%s/compute/swap-base-in?inputMint=%s&outputMint=%s&amount=%d&slippageBps=%d&txVersion=V0",
		raydiumSwapHost,
		params.FromCoinID,
		params.ToCoinID,
		uint64(params.Amount),
		int(params.Slippage*100),
	)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get swap quote: %w", err)
	}
	defer resp.Body.Close()

	var quote SwapQuoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&quote); err != nil {
		return nil, fmt.Errorf("failed to decode swap quote response: %w", err)
	}

	if !quote.Success {
		return nil, fmt.Errorf("swap quote request failed")
	}

	return &quote, nil
}

// getRaydiumSwapTransaction fetches the swap transaction from Raydium
func (s *SolanaTradeService) getRaydiumSwapTransaction(ctx context.Context, quote *SwapQuoteResponse, fee *PriorityFeeResponse, params *SwapParams, walletAddress string) (*SwapTransactionResponse, error) {
	swapTxBody := map[string]interface{}{
		"computeUnitPriceMicroLamports": fmt.Sprintf("%d", fee.Data.Default.H),
		"swapResponse":                  quote,
		"txVersion":                     "V0",
		"wallet":                        walletAddress,
		"wrapSol":                       params.FromCoinID == SolMint,
		"unwrapSol":                     params.ToCoinID == SolMint,
	}

	jsonBody, err := json.Marshal(swapTxBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal swap tx body: %w", err)
	}

	url := fmt.Sprintf("%s/transaction/swap-base-in", raydiumSwapHost)
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get swap transaction: %w", err)
	}
	defer resp.Body.Close()

	var txData SwapTransactionResponse
	if err := json.NewDecoder(resp.Body).Decode(&txData); err != nil {
		return nil, fmt.Errorf("failed to decode swap transaction response: %w", err)
	}

	if !txData.Success {
		return nil, fmt.Errorf("swap transaction request failed")
	}

	return &txData, nil
}

// processAndSendTransaction processes and sends a single transaction
func (s *SolanaTradeService) processAndSendTransaction(ctx context.Context, encodedTx string, privKey solana.PrivateKey) (string, error) {
	// Decode transaction
	txBytes, err := base64.StdEncoding.DecodeString(encodedTx)
	if err != nil {
		return "", fmt.Errorf("failed to decode transaction: %w", err)
	}

	// Deserialize the transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to deserialize transaction: %w", err)
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
	sig, err := s.client.SendTransactionWithOpts(ctx, tx,
		rpc.TransactionOpts{
			SkipPreflight: true,
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	// Wait for confirmation
	status, err := s.client.GetSignatureStatuses(ctx, true, sig)
	if err != nil {
		log.Printf("⚠️ Failed to get transaction status: %v", err)
	} else if status.Value[0] != nil && status.Value[0].Err != nil {
		return "", fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	return sig.String(), nil
}

// GetSwapQuote gets a quote for a potential swap between tokens
func (s *SolanaTradeService) GetSwapQuote(ctx context.Context, fromCoinID, toCoinID string, amount float64) (float64, float64, error) {
	// Create swap params
	params := &SwapParams{
		FromCoinID: fromCoinID,
		ToCoinID:   toCoinID,
		Amount:     amount,
		Slippage:   0.5, // 0.5% slippage
	}

	// Get quote from Raydium
	quote, err := s.getRaydiumSwapQuote(ctx, params)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get swap quote: %w", err)
	}

	// Calculate output amount and exchange rate
	outputDecimals := 6
	if toCoinID == SolMint {
		outputDecimals = 9 // SOL has 9 decimals
	}

	// Parse the output amount from the quote response
	amountOut, err := strconv.ParseFloat(quote.Data.AmountOut, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse output amount: %w", err)
	}

	// Calculate the actual output amount with proper decimals
	outputAmount := amountOut / (math.Pow(10, float64(outputDecimals)))

	// Calculate exchange rate
	exchangeRate := outputAmount / amount

	return outputAmount, exchangeRate, nil
}
