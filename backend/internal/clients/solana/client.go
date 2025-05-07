package solana

import (
	"context"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Client handles interactions with the Solana RPC
type Client struct {
	rpcClient *client.Client
	rpcConn   *rpc.Client
}

var _ ClientAPI = (*Client)(nil) // Ensure Client implements ClientAPI

// NewClient creates a new instance of Client
func NewClient(endpoint string) ClientAPI {
	return &Client{
		rpcClient: client.NewClient(endpoint),
		rpcConn:   rpc.New(endpoint),
	}
}

// GetMetadataAccount retrieves the metadata account for a token
func (c *Client) GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error) {
	mintPubkey := common.PublicKeyFromString(mint)
	metadataAccountPDA, err := token_metadata.GetTokenMetaPubkey(mintPubkey)
	if err != nil {
		return nil, fmt.Errorf("failed to derive metadata account PDA for %s: %w", mint, err)
	}

	accountInfo, err := c.rpcClient.GetAccountInfo(ctx, metadataAccountPDA.ToBase58())
	if err != nil {
		return nil, fmt.Errorf("failed to get account info for metadata PDA %s (mint: %s): %w", metadataAccountPDA.ToBase58(), mint, err)
	}
	if len(accountInfo.Data) == 0 {
		return nil, fmt.Errorf("metadata account %s for mint %s has no data", metadataAccountPDA.ToBase58(), mint)
	}

	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse metadata for %s: %w", mint, err)
	}

	return &metadata, nil
}

// GetRpcConnection returns the underlying RPC connection for direct usage
func (c *Client) GetRpcConnection() *rpc.Client {
	return c.rpcConn
}

// ExecuteTrade executes a pre-signed transaction from the frontend
func (c *Client) ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) error {
	// Execute the signed transaction
	if signedTx == "" {
		return fmt.Errorf("signed transaction is required for trade execution")
	}

	// Execute the signed transaction
	sig, err := c.ExecuteSignedTransaction(ctx, signedTx)
	if err != nil {
		return fmt.Errorf("failed to execute signed transaction: %w", err)
	}

	// Update trade status and transaction hash
	trade.Status = "submitted"
	trade.TransactionHash = sig.String()

	return nil
}

// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
func (c *Client) ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error) {
	// In debug mode, generate a unique transaction hash
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		log.Print("x-debug-mode: true")
		// Generate a valid Solana signature (64 bytes)
		sigBytes := make([]byte, 64)
		// Use timestamp for first 8 bytes to ensure uniqueness
		binary.BigEndian.PutUint64(sigBytes[:8], uint64(time.Now().UnixNano()))
		// Fill rest with random bytes
		if _, err := rand.Read(sigBytes[8:]); err != nil {
			return solana.Signature{}, fmt.Errorf("failed to generate debug signature: %w", err)
		}
		sig := solana.SignatureFromBytes(sigBytes)
		log.Printf("✅ Debug mode: Generated unique transaction signature: %s", sig.String())
		return sig, nil
	}

	log.Printf("🔍 Decoding signed transaction: %s", signedTx)
	decodedTx, err := base64.StdEncoding.DecodeString(signedTx)
	if err != nil {
		log.Printf("❌ Failed to decode transaction: %v", err)
		return solana.Signature{}, fmt.Errorf("failed to decode transaction: %w", err)
	}
	log.Printf("✅ Decoded transaction bytes length: %d", len(decodedTx))

	tx, err := solana.TransactionFromBytes(decodedTx)
	if err != nil {
		log.Printf("❌ Failed to deserialize transaction: %v", err)
		return solana.Signature{}, fmt.Errorf("failed to deserialize transaction: %w", err)
	}
	log.Printf("✅ Deserialized transaction: %+v", tx)

	// Simulate transaction first
	log.Printf("🔍 Simulating transaction...")
	simResult, err := c.rpcConn.SimulateTransaction(ctx, tx)
	if err != nil {
		log.Printf("❌ Transaction simulation failed: %v", err)
		return solana.Signature{}, fmt.Errorf("transaction simulation failed: %w", err)
	}

	if simResult.Value.Err != nil {
		log.Printf("❌ Transaction simulation error: %v", simResult.Value.Err)
		return solana.Signature{}, fmt.Errorf("transaction simulation error: %v", simResult.Value.Err)
	}

	// Log simulation results
	log.Printf("✅ Transaction simulation successful")
	log.Printf("📊 Simulation details:")
	log.Printf("  - Units consumed: %d", simResult.Value.UnitsConsumed)
	log.Printf("  - Logs: %v", simResult.Value.Logs)

	// Send transaction with optimized options
	sig, err := c.rpcConn.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		log.Printf("❌ Failed to submit transaction: %v", err)
		return solana.Signature{}, fmt.Errorf("failed to submit transaction: %w", err)
	}
	log.Printf("✅ Transaction submitted with signature: %s. Returning immediately.", sig.String())
	log.Printf("🔍 View on Solscan: https://solscan.io/tx/%s?cluster=devnet", sig.String()) // Assuming devnet, adjust cluster if needed

	return sig, nil
}

// GetTransactionConfirmationStatus gets the confirmation status of a transaction
func (c *Client) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		log.Print("x-debug-mode: true")
		return getMockTransactionStatus(sigStr)
	}

	log.Printf("🔍 Checking confirmation status for signature: %s", sigStr)
	sig, err := solana.SignatureFromBase58(sigStr)
	if err != nil {
		log.Printf("❌ Invalid signature format: %v", err)
		return nil, fmt.Errorf("invalid signature format: %w", err)
	}

	// Get signature statuses
	status, err := c.rpcConn.GetSignatureStatuses(ctx, true, sig)
	if err != nil {
		log.Printf("❌ Failed to get transaction status for %s: %v", sigStr, err)
		return nil, fmt.Errorf("failed to get transaction status: %w", err)
	}

	if status == nil || len(status.Value) == 0 || status.Value[0] == nil {
		log.Printf("⏳ Transaction %s not yet found or processed.", sigStr)
		return nil, nil
	}

	if status.Value[0].Err != nil {
		log.Printf("❌ Transaction %s failed with error: %v", sigStr, status.Value[0].Err)
		return status, fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	confirmations := uint64(0)
	if status.Value[0].Confirmations != nil {
		confirmations = *status.Value[0].Confirmations
	}
	log.Printf("✅ Transaction %s status: %s, Confirmations: %d", sigStr, status.Value[0].ConfirmationStatus, confirmations)

	return status, nil
}

// Helper function to get mock transaction status for debug mode
func getMockTransactionStatus(sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	mockTxMutex.Lock()
	defer mockTxMutex.Unlock()

	state, exists := mockTxStates[sigStr]
	if !exists {
		state = &MockTransactionState{
			FirstSeenAt:   time.Now(),
			NumChecks:     0,
			Confirmations: 0,
			IsFinalized:   false,
		}
		mockTxStates[sigStr] = state
	}

	state.NumChecks++
	elapsed := time.Since(state.FirstSeenAt)

	// Simulate transaction progression
	switch {
	case elapsed < 2*time.Second:
		// Transaction not found yet
		return nil, nil
	case elapsed < 4*time.Second:
		// Transaction found, but not confirmed
		state.Confirmations = 0
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{{
				ConfirmationStatus: rpc.ConfirmationStatusProcessed,
				Confirmations:      &state.Confirmations,
			}},
		}, nil
	case elapsed < 6*time.Second:
		// Transaction confirmed
		state.Confirmations = 15
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{{
				ConfirmationStatus: rpc.ConfirmationStatusConfirmed,
				Confirmations:      &state.Confirmations,
			}},
		}, nil
	default:
		// Transaction finalized
		state.Confirmations = 32
		state.IsFinalized = true
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{{
				ConfirmationStatus: rpc.ConfirmationStatusFinalized,
				Confirmations:      &state.Confirmations,
			}},
		}, nil
	}
}

// MockTransactionState tracks the state of mock transactions
type MockTransactionState struct {
	FirstSeenAt   time.Time
	NumChecks     int
	Confirmations uint64
	IsFinalized   bool
}

// Global map to track mock transaction states with mutex for thread safety
var (
	mockTxStates = make(map[string]*MockTransactionState)
	mockTxMutex  sync.RWMutex
)
