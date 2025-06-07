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
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

type Client struct {
	rpcConn *rpc.Client
}

var _ ClientAPI = (*Client)(nil)
var _ SolanaRPCClientAPI = (*Client)(nil) // Added this line

func NewClient(solClient *rpc.Client) ClientAPI {
	return &Client{
		rpcConn: solClient,
	}
}

// GetMetadataAccount retrieves the metadata account for a token
func (c *Client) GetMetadataAccount(ctx context.Context, mint string) (*tm.Metadata, error) {
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
func (c *Client) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*model.SignatureStatusResult, error) {
    if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
        slog.InfoContext(ctx, "mocking confirmations for GetTransactionConfirmationStatus")
        return getMockTransactionStatus(sigStr)
    }

    slog.DebugContext(ctx, "Checking confirmation status for GetTransactionConfirmationStatus", "signature", sigStr)
    sig, err := solana.SignatureFromBase58(sigStr)
    if err != nil {
        slog.ErrorContext(ctx, "Invalid signature format for GetTransactionConfirmationStatus", "error", err, "signature", sigStr)
        return nil, fmt.Errorf("invalid signature format: %w", err)
    }

    rpcStatusResult, err := c.rpcConn.GetSignatureStatuses(ctx, true, sig)
    if err != nil {
        slog.ErrorContext(ctx, "Failed to get transaction status from RPC for GetTransactionConfirmationStatus", "signature", sigStr, "error", err)
        return nil, fmt.Errorf("failed to get transaction status: %w", err)
    }

    if rpcStatusResult == nil {
        slog.DebugContext(ctx, "RPC status result is nil, treating as not found", "signature", sigStr)
        return nil, nil
    }

    if len(rpcStatusResult.Value) == 0 {
         slog.DebugContext(ctx, "RPC status result Value is empty, treating as not found", "signature", sigStr)
         return &model.SignatureStatusResult{
            Context: struct {Slot uint64 `json:"slot"`}{Slot: rpcStatusResult.Context.Slot},
            Value:   []*model.SignatureStatus{},
         }, nil
    }

    if rpcStatusResult.Value[0] == nil {
        slog.DebugContext(ctx, "Transaction not yet found or processed (nil status value in RPC response)", "signature", sigStr)
        return &model.SignatureStatusResult{
            Context: struct {Slot uint64 `json:"slot"`}{Slot: rpcStatusResult.Context.Slot},
            Value:   []*model.SignatureStatus{},
        }, nil
    }

    modelStatuses := make([]*model.SignatureStatus, len(rpcStatusResult.Value))
    for i, rpcStatus := range rpcStatusResult.Value {
        if rpcStatus == nil {
            modelStatuses[i] = nil
            continue
        }
        modelStatuses[i] = &model.SignatureStatus{
            Slot:               rpcStatus.Slot,
            Confirmations:      rpcStatus.Confirmations,
            Err:                rpcStatus.Err,
            ConfirmationStatus: string(rpcStatus.ConfirmationStatus),
        }
    }

    modelResult := &model.SignatureStatusResult{
        Context: struct {
            Slot uint64 `json:"slot"`
        }{
            Slot: rpcStatusResult.Context.Slot,
        },
        Value: modelStatuses,
    }

    if modelResult.Value[0].Err != nil {
        slog.ErrorContext(ctx, "Transaction failed as per status in GetTransactionConfirmationStatus", "signature", sigStr, "error", modelResult.Value[0].Err)
        return modelResult, fmt.Errorf("transaction failed: %v", modelResult.Value[0].Err)
    }

    slog.DebugContext(ctx, "Transaction status retrieved successfully for GetTransactionConfirmationStatus",
        "signature", sigStr,
        "status", modelResult.Value[0].ConfirmationStatus,
        "confirmations", modelResult.Value[0].Confirmations)
    return modelResult, nil
}

func (c *Client) GetAccountInfo(ctx context.Context, account solana.PublicKey) (*rpc.GetAccountInfoResult, error) {
    return c.rpcConn.GetAccountInfo(ctx, account)
}

func (c *Client) GetLatestBlockhashConfirmed(ctx context.Context) (*rpc.GetLatestBlockhashResult, error) {
    return c.rpcConn.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
}

func (c *Client) SendTransactionWithCustomOpts(ctx context.Context, tx *solana.Transaction, opts model.TransactionOptions) (solana.Signature, error) {
    rpcOpts := rpc.TransactionOpts{
        SkipPreflight:       opts.SkipPreflight,
        PreflightCommitment: model.ToRPCCommitment(opts.PreflightCommitment), // Assumes model.ToRPCCommitment is available
    }
    if opts.MaxRetries > 0 {
        maxRetriesCopy := opts.MaxRetries // rpc.TransactionOpts.MaxRetries expects *uint
        rpcOpts.MaxRetries = &maxRetriesCopy
    }

    return c.rpcConn.SendTransactionWithOpts(ctx, tx, rpcOpts)
}

func (c *Client) GetBalanceConfirmed(ctx context.Context, account solana.PublicKey) (*rpc.GetBalanceResult, error) {
    return c.rpcConn.GetBalance(ctx, account, rpc.CommitmentConfirmed)
}

func (c *Client) GetTokenAccountsByOwnerConfirmed(ctx context.Context, owner solana.PublicKey, modelOpts model.GetTokenAccountsOptions) (*rpc.GetTokenAccountsResult, error) {
    rpcConf := &rpc.GetTokenAccountsConfig{}
    if modelOpts.ProgramID != "" {
        programIDPubKey, err := solana.PublicKeyFromBase58(modelOpts.ProgramID)
        if err != nil {
            return nil, fmt.Errorf("invalid programID ('%s') in GetTokenAccountsByOwnerConfirmed: %w", modelOpts.ProgramID, err)
        }
        rpcConf.ProgramId = programIDPubKey.ToPointer()
    }

    rpcOpts := &rpc.GetTokenAccountsOpts{
        Commitment: rpc.CommitmentConfirmed,
    }

    if modelOpts.Encoding != "" {
        switch modelOpts.Encoding {
        case string(solana.EncodingBase58):
            rpcOpts.Encoding = solana.EncodingBase58
        case string(solana.EncodingBase64):
            rpcOpts.Encoding = solana.EncodingBase64
        case string(solana.EncodingBase64Zstd):
            rpcOpts.Encoding = solana.EncodingBase64Zstd
        case string(solana.EncodingJSONParsed):
            rpcOpts.Encoding = solana.EncodingJSONParsed
        default:
            slog.WarnContext(ctx, "Unsupported encoding type provided in GetTokenAccountsByOwnerConfirmed, defaulting to jsonParsed", "providedEncoding", modelOpts.Encoding)
            rpcOpts.Encoding = solana.EncodingJSONParsed
        }
    } else {
        rpcOpts.Encoding = solana.EncodingJSONParsed // Default if empty
    }

    return c.rpcConn.GetTokenAccountsByOwner(ctx, owner, rpcConf, rpcOpts)
}

// This function should be part of the same file or properly imported/accessible.
// The mockTxStates and mockTxMutex variables are assumed to be defined globally in this file.
func getMockTransactionStatus(sigStr string) (*model.SignatureStatusResult, error) {
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

    var statusValue *model.SignatureStatus
    var currentRpcStatus rpc.CommitmentType
    var mockSlot = uint64(12345)

    switch {
    case elapsed < 2*time.Second:
        return &model.SignatureStatusResult{ Context: struct{Slot uint64 `json:"slot"`}{Slot: mockSlot + uint64(state.NumChecks)}, Value: []*model.SignatureStatus{} }, nil
    case elapsed < 4*time.Second:
        state.Confirmations = 0
        currentRpcStatus = rpc.ConfirmationStatusProcessed
    case elapsed < 6*time.Second:
        state.Confirmations = 15
        currentRpcStatus = rpc.ConfirmationStatusConfirmed
    case elapsed < 8*time.Second:
        state.Confirmations = 31
        currentRpcStatus = rpc.ConfirmationStatusConfirmed
    default:
        state.Confirmations = 40
        state.IsFinalized = true
        currentRpcStatus = rpc.ConfirmationStatusFinalized
    }

    statusValue = &model.SignatureStatus{
        Slot:               mockSlot + uint64(state.NumChecks),
        Confirmations:      &state.Confirmations,
        Err:                nil,
        ConfirmationStatus: string(currentRpcStatus),
    }

    return &model.SignatureStatusResult{
        Context: struct{Slot uint64 `json:"slot"`}{Slot: mockSlot + uint64(state.NumChecks)},
        Value: []*model.SignatureStatus{statusValue},
    }, nil
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
