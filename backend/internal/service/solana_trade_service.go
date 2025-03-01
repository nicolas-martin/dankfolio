package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	// Raydium API endpoints
	raydiumBaseHost = "https://api.raydium.io"
	raydiumSwapHost = "https://transaction-v1.raydium.io"
	// Common token mints
	SolMint  = "So11111111111111111111111111111111111111112"
	USDCMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	// Default RPC endpoint
	defaultDevnetRPC = "https://api.mainnet-beta.solana.com"
)

var (
	// Error definitions
	ErrInvalidCoin  = errors.New("invalid coin")
	ErrInvalidTrade = errors.New("invalid trade parameters")
	ErrSwapFailed   = errors.New("swap transaction failed")
)

// PriorityFeeResponse represents the response from Raydium's priority fee endpoint
type PriorityFeeResponse struct {
	ID      string `json:"id"`
	Success bool   `json:"success"`
	Data    struct {
		Default struct {
			VH int64 `json:"vh"`
			H  int64 `json:"h"`
			M  int64 `json:"m"`
		} `json:"default"`
	} `json:"data"`
}

// SwapQuoteResponse represents the response from Raydium's swap quote endpoint
type SwapQuoteResponse struct {
	ID      string                 `json:"id"`
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data"`
}

// SwapTransactionResponse represents the response from Raydium's swap transaction endpoint
type SwapTransactionResponse struct {
	ID      string `json:"id"`
	Version string `json:"version"`
	Success bool   `json:"success"`
	Data    []struct {
		Transaction string `json:"transaction"`
	} `json:"data"`
}

// SwapParams represents the parameters needed for a Raydium swap
type SwapParams struct {
	InputMint   string
	OutputMint  string
	Amount      uint64
	Slippage    float64
	IsInputSol  bool
	IsOutputSol bool
}

// SolanaTradeService handles the execution of trades on the Solana blockchain
type SolanaTradeService struct {
	client     *rpc.Client
	httpClient *http.Client // HTTP client for Raydium API calls
}

func NewSolanaTradeService(rpcEndpoint string) (*SolanaTradeService, error) {
	// Use default endpoint if not provided
	if rpcEndpoint == "" {
		rpcEndpoint = defaultDevnetRPC
	}

	service := &SolanaTradeService{
		client:     rpc.New(rpcEndpoint),
		httpClient: &http.Client{},
	}

	return service, nil
}

func (s *SolanaTradeService) ExecuteTrade(ctx context.Context, trade *model.Trade) error {
	// Validate and parse private key from trade request
	if trade.PrivateKey == "" {
		return fmt.Errorf("private key is required for trade execution")
	}

	// Remove any quotes and whitespace from the private key
	privateKeyStr := strings.TrimSpace(strings.Trim(trade.PrivateKey, "\""))

	// Decode base64 private key
	privateKeyBytes, err := base64.StdEncoding.DecodeString(privateKeyStr)
	if err != nil {
		return fmt.Errorf("invalid base64 private key: %w", err)
	}

	// Convert to Solana private key
	privKey := solana.PrivateKey(privateKeyBytes)
	log.Printf("🔑 Using wallet: %s", privKey.PublicKey().String())

	// Convert trade to swap params
	swapParams := &SwapParams{
		InputMint:   trade.FromCoinID,
		OutputMint:  trade.ToCoinID,
		Amount:      uint64(trade.Amount * 1e9), // Convert to lamports
		Slippage:    1.0,                        // Default 1% slippage
		IsInputSol:  trade.FromCoinID == SolMint,
		IsOutputSol: trade.ToCoinID == SolMint,
	}

	// Execute the Raydium swap
	txHash, err := s.ExecuteRaydiumSwap(ctx, swapParams, privKey)
	if err != nil {
		return fmt.Errorf("failed to execute Raydium swap: %w", err)
	}

	// Update trade status
	trade.Status = "completed"
	trade.TransactionHash = txHash
	trade.CompletedAt = time.Now()

	return nil
}

// ExecuteRaydiumSwap executes a swap on Raydium DEX
func (s *SolanaTradeService) ExecuteRaydiumSwap(ctx context.Context, params *SwapParams, privKey solana.PrivateKey) (string, error) {
	log.Printf("🔄 Starting Raydium swap: %d %s -> %s", params.Amount, params.InputMint, params.OutputMint)

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

	// Process and send transactions
	var lastSignature string
	for idx, tx := range txData.Data {
		log.Printf("📝 Processing transaction %d/%d", idx+1, len(txData.Data))

		sig, err := s.processAndSendTransaction(ctx, tx.Transaction, privKey)
		if err != nil {
			return "", fmt.Errorf("failed to process transaction %d: %w", idx+1, err)
		}
		lastSignature = sig
		log.Printf("✅ Transaction %d sent: %s", idx+1, sig)
	}

	return lastSignature, nil
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
		params.InputMint,
		params.OutputMint,
		params.Amount,
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
		"wrapSol":                       params.IsInputSol,
		"unwrapSol":                     params.IsOutputSol,
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
