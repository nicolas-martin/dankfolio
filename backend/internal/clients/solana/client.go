package solana

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"log/slog"
	"sync"
	"time"

	tm "github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"

	"github.com/gagliardetto/solana-go/rpc"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

type Client struct {
	rpcConn *rpc.Client
	tracker clients.APICallTracker
}

var _ ClientAPI = (*Client)(nil)

func NewClient(solClient *rpc.Client, tracker clients.APICallTracker) ClientAPI {
	return &Client{
		rpcConn: solClient,
		tracker: tracker,
	}
}

// GetMetadataAccount retrieves the metadata account for a token
func (c *Client) GetMetadataAccount(ctx context.Context, mint string) (*tm.Metadata, error) {
	c.tracker.TrackCall("solana", "getAccountInfo") // Assuming GetAccountInfo is the underlying RPC call
	mintPubkey := solana.MustPublicKeyFromBase58(mint)
	metadataPDA, bumpSeed, err := solana.FindTokenMetadataAddress(mintPubkey)
	if err != nil {
		return nil, fmt.Errorf("failed to derive metadata account PDA for %s: %w", mint, err)
	}

	accountInfo, err := c.rpcConn.GetAccountInfo(ctx, metadataPDA)
	if err != nil {
		return nil, fmt.Errorf("failed to get account info for metadata PDA %s (mint: %s, seed %d): %w", metadataPDA, mint, bumpSeed, err)
	}

	metadata, err := tm.MetadataDeserialize(accountInfo.Value.Data.GetBinary())
	if err != nil {
		return nil, fmt.Errorf("failed to parse metadata for %s: %w", mint, err)
	}

	return &metadata, nil
}

// ExecuteTrade executes a pre-signed transaction from the frontend
func (c *Client) ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) (string, error) {
	// Execute the signed transaction
	if signedTx == "" {
		return "", fmt.Errorf("signed transaction is required for trade execution")
	}

	// Execute the signed transaction
	// Tracking for ExecuteSignedTransaction is handled within that method
	sig, err := c.ExecuteSignedTransaction(ctx, signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to execute signed transaction: %w", err)
	}

	// Update trade status and transaction hash
	trade.Status = "submitted"
	trade.TransactionHash = sig.String()

	return sig.String(), nil
}

// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
func (c *Client) ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error) {
	// In debug mode, generate a unique transaction hash
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("x-debug-mode: true")
		// Generate a valid Solana signature (64 bytes)
		sigBytes := make([]byte, 64)
		// Use timestamp for first 8 bytes to ensure uniqueness
		binary.BigEndian.PutUint64(sigBytes[:8], uint64(time.Now().UnixNano()))
		// Fill rest with random bytes
		if _, err := rand.Read(sigBytes[8:]); err != nil {
			return solana.Signature{}, fmt.Errorf("failed to generate debug signature: %w", err)
		}
		sig := solana.SignatureFromBytes(sigBytes)
		slog.Info("Debug mode: Generated unique transaction signature", "signature", sig.String())
		return sig, nil
	}

	slog.Debug("Decoding signed transaction", "signed_tx_length", len(signedTx))
	decodedTx, err := base64.StdEncoding.DecodeString(signedTx)
	if err != nil {
		slog.Error("Failed to decode transaction", "error", err)
		return solana.Signature{}, fmt.Errorf("failed to decode transaction: %w", err)
	}
	slog.Debug("Decoded transaction", "bytes_length", len(decodedTx))

	tx, err := solana.TransactionFromBytes(decodedTx)
	if err != nil {
		slog.Error("Failed to deserialize transaction", "error", err)
		return solana.Signature{}, fmt.Errorf("failed to deserialize transaction: %w", err)
	}
	slog.Debug("Deserialized transaction", "tx", fmt.Sprintf("%+v", tx))

	// Simulate transaction first
	c.tracker.TrackCall("solana", "simulateTransaction")
	slog.Debug("Simulating transaction...")
	simResult, err := c.rpcConn.SimulateTransaction(ctx, tx)
	if err != nil {
		slog.Error("Transaction simulation failed", "error", err)
		return solana.Signature{}, fmt.Errorf("transaction simulation failed: %w", err)
	}

	if simResult.Value.Err != nil {
		slog.Error("Transaction simulation error", "error", simResult.Value.Err)
		return solana.Signature{}, fmt.Errorf("transaction simulation error: %v", simResult.Value.Err)
	}

	// Log simulation results
	slog.Info("Transaction simulation successful",
		"units_consumed", simResult.Value.UnitsConsumed,
		"logs", simResult.Value.Logs)

	// Send transaction with optimized options
	c.tracker.TrackCall("solana", "sendTransaction")
	sig, err := c.rpcConn.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		slog.Error("Failed to submit transaction", "error", err)
		return solana.Signature{}, fmt.Errorf("failed to submit transaction: %w", err)
	}
	slog.Info("Transaction submitted",
		"signature", sig.String(),
		"solscan_url", fmt.Sprintf("https://solscan.io/tx/%s?cluster=devnet", sig.String()))

	return sig, nil
}

// GetTransactionConfirmationStatus gets the confirmation status of a transaction
func (c *Client) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("mocking confirmations")
		return getMockTransactionStatus(sigStr)
	}

	slog.Debug("Checking confirmation status", "signature", sigStr)
	sig, err := solana.SignatureFromBase58(sigStr)
	if err != nil {
		slog.Error("Invalid signature format", "error", err)
		return nil, fmt.Errorf("invalid signature format: %w", err)
	}

	// Get signature statuses
	c.tracker.TrackCall("solana", "getSignatureStatuses")
	status, err := c.rpcConn.GetSignatureStatuses(ctx, true, sig)
	if err != nil {
		slog.Error("Failed to get transaction status", "signature", sigStr, "error", err)
		return nil, fmt.Errorf("failed to get transaction status: %w", err)
	}

	if status == nil || len(status.Value) == 0 || status.Value[0] == nil {
		slog.Debug("Transaction not yet found or processed", "signature", sigStr)
		return nil, nil
	}

	if status.Value[0].Err != nil {
		slog.Error("Transaction failed", "signature", sigStr, "error", status.Value[0].Err)
		return status, fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	confirmations := uint64(0)
	if status.Value[0].Confirmations != nil {
		confirmations = *status.Value[0].Confirmations
	}
	slog.Debug("Transaction status retrieved",
		"signature", sigStr,
		"status", status.Value[0].ConfirmationStatus,
		"confirmations", confirmations)

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
	case elapsed < 8*time.Second:
		// Transaction confirmed
		state.Confirmations = 31
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{{
				ConfirmationStatus: rpc.ConfirmationStatusConfirmed,
				Confirmations:      &state.Confirmations,
			}},
		}, nil
	default:
		// Transaction finalized
		state.Confirmations = 40
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

// GetProgramAccounts retrieves accounts associated with a program
func (c *Client) GetProgramAccounts(ctx context.Context, pubkey solana.PublicKey) (*rpc.GetProgramAccountsResult, error) {
	c.tracker.TrackCall("solana", "getProgramAccounts")
	// The mockery error indicated that the underlying rpcConn.GetProgramAccounts returns a value,
	// but the interface requires a pointer.
	res, err := c.rpcConn.GetProgramAccounts(ctx, pubkey)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

// GetLargestAccounts retrieves the largest accounts
func (c *Client) GetLargestAccounts(ctx context.Context, commitment rpc.CommitmentType, filter rpc.LargestAccountsFilterType) (*rpc.GetLargestAccountsResult, error) {
	c.tracker.TrackCall("solana", "getLargestAccounts")
	return c.rpcConn.GetLargestAccounts(ctx, commitment, filter)
}

// GetSupply retrieves the current supply of SOL
func (c *Client) GetSupply(ctx context.Context, commitment rpc.CommitmentType) (*rpc.GetSupplyResult, error) {
	c.tracker.TrackCall("solana", "getSupply")
	return c.rpcConn.GetSupply(ctx, commitment)
}

// GetTokenAccountsByOwner retrieves token accounts owned by a specific account
func (c *Client) GetTokenAccountsByOwner(ctx context.Context, owner solana.PublicKey, mint solana.PublicKey, encoding solana.EncodingType) (*rpc.GetTokenAccountsResult, error) {
	c.tracker.TrackCall("solana", "getTokenAccountsByOwner")
	return c.rpcConn.GetTokenAccountsByOwner(ctx, owner,
		&rpc.GetTokenAccountsConfig{
			Mint: &mint,
		},
		&rpc.GetTokenAccountsOpts{
			Encoding: encoding,
		},
	)
}
