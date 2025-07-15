package solana

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	tm "github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"

	"github.com/gagliardetto/solana-go/rpc"

	"math"    // For Pow10
	"strconv" // For uint64 to string and float to string

	bin "github.com/gagliardetto/binary"
	spltoken "github.com/gagliardetto/solana-go/programs/token"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

type Client struct {
	rpcConn *rpc.Client
	tracker tracker.APITracker
}

// Comment out the interface implementation check for now until we can fix all issues
var (
	_ ClientAPI                = (*Client)(nil)
	_ clients.GenericClientAPI = (*Client)(nil)
)

func NewClient(solClient *rpc.Client, tracker tracker.APITracker) clients.GenericClientAPI {
	return &Client{
		rpcConn: solClient,
		tracker: tracker,
	}
}

// GetMetadataAccount retrieves the metadata account for a token
// Note: This is part of the original ClientAPI, not GenericClientAPI.
// It might be removed or adapted if a generic GetTokenMetadata is added to GenericClientAPI.
func (c *Client) GetMetadataAccount(ctx context.Context, mint string) (*tm.Metadata, error) {
	var metadata *tm.Metadata
	err := c.tracker.InstrumentCall(ctx, "solana", "GetMetadataAccount", func(ctx context.Context) error {
		mintPubkey := solana.MustPublicKeyFromBase58(mint)
		metadataPDA, bumpSeed, err := solana.FindTokenMetadataAddress(mintPubkey)
		if err != nil {
			return fmt.Errorf("failed to derive metadata account PDA for %s: %w", mint, err)
		}

		// Using c.rpcConn.GetAccountInfo directly, assuming the specific Solana RPC call is intended here.
		// If this were to use the generic GetAccountInfo, it would be:
		// genericAccountInfo, err := c.GetAccountInfo(ctx, bmodel.Address(metadataPDA.String()))
		accountInfo, err := c.rpcConn.GetAccountInfo(ctx, metadataPDA)
		if err != nil {
			return fmt.Errorf("failed to get account info for metadata PDA %s (mint: %s, seed %d): %w", metadataPDA, mint, bumpSeed, err)
		}

		deserializedMetadata, err := tm.MetadataDeserialize(accountInfo.Value.Data.GetBinary())
		if err != nil {
			return fmt.Errorf("failed to parse metadata for %s: %w", mint, err)
		}
		metadata = &deserializedMetadata

		return nil
	})

	if err != nil {
		return nil, err
	}
	return metadata, nil
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

// ExecuteSignedTransaction submits a signed transaction to the Solana clients
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
	var simResult *rpc.SimulateTransactionResponse
	err = c.tracker.InstrumentCall(ctx, "solana", "simulateTransaction", func(ctx context.Context) error {
		slog.Debug("Simulating transaction...")
		var simErr error
		simResult, simErr = c.rpcConn.SimulateTransaction(ctx, tx)
		if simErr != nil {
			slog.Error("Transaction simulation failed", "error", simErr)
			return fmt.Errorf("transaction simulation failed: %w", simErr)
		}
		return nil
	})
	if err != nil {
		return solana.Signature{}, err
	}

	if simResult.Err != nil {
		slog.Error("Transaction simulation error", "error", simResult.Err)
		return solana.Signature{}, fmt.Errorf("transaction simulation error: %v", simResult.Err)
	}

	// Log simulation results
	slog.Info("Transaction simulation successful",
		"units_consumed", simResult.UnitsConsumed,
		"logs", simResult.Logs)

	// Send transaction with optimized options
	var sig solana.Signature
	err = c.tracker.InstrumentCall(ctx, "solana", "sendTransaction", func(ctx context.Context) error {
		var sendErr error
		sig, sendErr = c.rpcConn.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
			SkipPreflight:       false,
			PreflightCommitment: rpc.CommitmentFinalized,
		})
		if sendErr != nil {
			slog.Error("Failed to submit transaction", "error", sendErr)
			return fmt.Errorf("failed to submit transaction: %w", sendErr)
		}
		return nil
	})
	if err != nil {
		return solana.Signature{}, err
	}
	slog.Info("Transaction submitted",
		"signature", sig.String(),
		"solscan_url", fmt.Sprintf("https://solscan.io/tx/%s?cluster=devnet", sig.String()))

	return sig, nil
}

// GetTransactionStatus implements clients.GenericClientAPI
// It was adapted from the original GetTransactionConfirmationStatus
func (c *Client) GetTransactionStatus(ctx context.Context, signature bmodel.Signature) (*bmodel.TransactionStatus, error) {
	sigStr := string(signature)
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.InfoContext(ctx, "mocking confirmations for GetTransactionStatus")
		return getMockTransactionStatusInternal(sigStr) // Call internal mock
	}

	slog.DebugContext(ctx, "Checking confirmation status for GetTransactionStatus", "signature", sigStr)
	solSig, err := solana.SignatureFromBase58(sigStr)
	if err != nil {
		slog.ErrorContext(ctx, "Invalid signature format for GetTransactionStatus", "error", err, "signature", sigStr)
		return nil, fmt.Errorf("invalid signature format: %w", err)
	}

	var rpcStatusResult *rpc.GetSignatureStatusesResult
	err = c.tracker.InstrumentCall(ctx, "solana", "GetSignatureStatuses", func(ctx context.Context) error {
		var statusErr error
		rpcStatusResult, statusErr = c.rpcConn.GetSignatureStatuses(ctx, true, solSig)
		if statusErr != nil {
			slog.ErrorContext(ctx, "Failed to get transaction status from RPC for GetTransactionStatus", "signature", sigStr, "error", statusErr)
			return fmt.Errorf("failed to get transaction status: %w", statusErr)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if rpcStatusResult == nil || len(rpcStatusResult.Value) == 0 || rpcStatusResult.Value[0] == nil {
		slog.InfoContext(ctx, "Transaction not yet found or processed, returning Unknown status",
			"signature", sigStr,
			"result_nil", rpcStatusResult == nil,
			"value_empty", rpcStatusResult != nil && len(rpcStatusResult.Value) == 0,
			"first_value_nil", rpcStatusResult != nil && len(rpcStatusResult.Value) > 0 && rpcStatusResult.Value[0] == nil)
		return &bmodel.TransactionStatus{Status: "Unknown", Signature: signature}, nil
	}

	rpcStatus := rpcStatusResult.Value[0]
	txStatus := &bmodel.TransactionStatus{
		Slot:          rpcStatus.Slot,
		Confirmations: rpcStatus.Confirmations,
		Signature:     signature,
	}

	if rpcStatus.Err != nil {
		txStatus.Status = "Failed"
		txStatus.Error = fmt.Sprintf("%v", rpcStatus.Err)
		txStatus.RawError = rpcStatus.Err
	} else {
		switch rpcStatus.ConfirmationStatus {
		case rpc.ConfirmationStatusProcessed:
			txStatus.Status = "Processed"
		case rpc.ConfirmationStatusConfirmed:
			txStatus.Status = "Confirmed"
		case rpc.ConfirmationStatusFinalized:
			txStatus.Status = "Finalized"
		default:
			txStatus.Status = "Unknown"
			slog.WarnContext(ctx, "@@@@@@@@@ Unknown confirmation status for GetTransactionStatus",
				"confirmation_status", string(rpcStatus.ConfirmationStatus),
				"signature", sigStr,
				"slot", rpcStatus.Slot,
				"has_confirmations", rpcStatus.Confirmations != nil,
				"confirmations_value", func() any {
					if rpcStatus.Confirmations != nil {
						return *rpcStatus.Confirmations
					}
					return "nil"
				}())
		}
	}

	slog.InfoContext(ctx, "Transaction status retrieved for GetTransactionStatus",
		"signature", sigStr,
		"status", txStatus.Status,
		"confirmations", txStatus.Confirmations,
		"slot", txStatus.Slot,
		"raw_confirmation_status", string(rpcStatus.ConfirmationStatus),
		"has_error", rpcStatus.Err != nil,
		"error_value", func() any {
			if rpcStatus.Err != nil {
				return rpcStatus.Err
			}
			return "none"
		}())
	return txStatus, nil
}

// GetAccountInfo implements clients.GenericClientAPI
func (c *Client) GetAccountInfo(ctx context.Context, address bmodel.Address) (*bmodel.AccountInfo, error) {
	var result *bmodel.AccountInfo
	err := c.tracker.InstrumentCall(ctx, "solana", "GetAccountInfo", func(ctx context.Context) error {
		solAddress, err := solana.PublicKeyFromBase58(string(address))
		if err != nil {
			return fmt.Errorf("invalid address '%s': %w", address, err)
		}

		rpcAccountInfo, err := c.rpcConn.GetAccountInfo(ctx, solAddress)
		if err != nil {
			if errors.Is(err, rpc.ErrNotFound) {
				return clients.ErrAccountNotFound
			}
			return fmt.Errorf("failed to get account info for %s: %w", address, err)
		}
		if rpcAccountInfo == nil || rpcAccountInfo.Value == nil {
			return clients.ErrAccountNotFound
		}

		ownerPk, ownerErr := solana.PublicKeyFromBase58(rpcAccountInfo.Value.Owner.String()) // Use ownerErr here
		if ownerErr != nil {
			return fmt.Errorf("invalid owner address for %s: %w", address, ownerErr) // Wrap ownerErr
		}

		result = &bmodel.AccountInfo{
			Address:    address,
			Lamports:   rpcAccountInfo.Value.Lamports,
			Owner:      bmodel.Address(ownerPk.String()),
			Executable: rpcAccountInfo.Value.Executable,
			RentEpoch:  rpcAccountInfo.Value.RentEpoch.Uint64(),
			Data:       rpcAccountInfo.Value.Data.GetBinary(),
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetLatestBlockhash implements clients.GenericClientAPI
func (c *Client) GetLatestBlockhash(ctx context.Context) (bmodel.Blockhash, error) {
	var blockhash bmodel.Blockhash
	err := c.tracker.InstrumentCall(ctx, "solana", "GetLatestBlockhash", func(ctx context.Context) error {
		// Using CommitmentConfirmed as a default for generic API, can be made configurable if needed
		result, err := c.rpcConn.GetLatestBlockhash(ctx, rpc.CommitmentConfirmed)
		if err != nil {
			return fmt.Errorf("failed to get latest blockhash: %w", err)
		}
		if result == nil || result.Value == nil {
			return fmt.Errorf("received nil result for latest blockhash")
		}
		blockhash = bmodel.Blockhash(result.Value.Blockhash.String())
		return nil
	})

	if err != nil {
		return "", err
	}
	return blockhash, nil
}

// GetBalance implements clients.GenericClientAPI
func (c *Client) GetBalance(ctx context.Context, address bmodel.Address, commitmentStr string) (*bmodel.Balance, error) {
	var balance *bmodel.Balance
	err := c.tracker.InstrumentCall(ctx, "solana", "GetBalance", func(ctx context.Context) error {
		solAddress, err := solana.PublicKeyFromBase58(string(address))
		if err != nil {
			return fmt.Errorf("invalid address '%s': %w", address, err)
		}

		rpcCommitment := model.ToRPCCommitment(commitmentStr) // Using existing helper from model package

		rpcBalance, err := c.rpcConn.GetBalance(ctx, solAddress, rpcCommitment)
		if err != nil {
			return fmt.Errorf("failed to get balance for %s: %w", address, err)
		}

		// For native SOL on Solana, decimals is 9
		const solDecimals = 9
		uiAmount := float64(rpcBalance.Value) / math.Pow10(solDecimals)

		balance = &bmodel.Balance{
			Amount:         strconv.FormatUint(rpcBalance.Value, 10),
			Decimals:       solDecimals,
			UIAmount:       uiAmount,
			CurrencySymbol: "SOL", // Specific to this Solana client implementation
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return balance, nil
}

// Rename and modify getMockTransactionStatus to return *bmodel.TransactionStatus
// This internal version is called by the public GetTransactionStatus
func getMockTransactionStatusInternal(sigStr string) (*bmodel.TransactionStatus, error) {
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
	mockSlot := uint64(12345) // Example slot

	status := &bmodel.TransactionStatus{
		Slot:      mockSlot + uint64(state.NumChecks),
		Signature: bmodel.Signature(sigStr),
	}

	switch {
	case elapsed < 2*time.Second:
		status.Status = "Unknown" // Or "Pending"
		return status, nil
	case elapsed < 4*time.Second:
		state.Confirmations = 0
		status.Status = "Processed"
	case elapsed < 6*time.Second:
		state.Confirmations = 15
		status.Status = "Confirmed"
	case elapsed < 8*time.Second:
		state.Confirmations = 31
		status.Status = "Confirmed"
	default:
		state.Confirmations = 40
		state.IsFinalized = true
		status.Status = "Finalized"
	}
	status.Confirmations = &state.Confirmations
	return status, nil
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

func (c *Client) GetTokenBalance(ctx context.Context, ownerAddress bmodel.Address, tokenMintAddress bmodel.Address, commitmentStr string) (*bmodel.Balance, error) {
	var balance *bmodel.Balance
	err := c.tracker.InstrumentCall(ctx, "solana", "GetTokenAccountBalance", func(ctx context.Context) error {
		solOwner, err := solana.PublicKeyFromBase58(string(ownerAddress))
		if err != nil {
			return fmt.Errorf("invalid owner address '%s': %w", ownerAddress, err)
		}
		solMint, err := solana.PublicKeyFromBase58(string(tokenMintAddress))
		if err != nil {
			return fmt.Errorf("invalid token mint address '%s': %w", tokenMintAddress, err)
		}

		ata, _, err := solana.FindAssociatedTokenAddress(solOwner, solMint)
		if err != nil {
			return fmt.Errorf("failed to find ATA for owner %s and mint %s: %w", ownerAddress, tokenMintAddress, err)
		}

		rpcCommitment := model.ToRPCCommitment(commitmentStr)
		balanceResult, err := c.rpcConn.GetTokenAccountBalance(ctx, ata, rpcCommitment)
		if err != nil {
			return fmt.Errorf("failed to get token account balance for ATA %s: %w", ata.String(), err)
		}

		if balanceResult.Value == nil {
			return fmt.Errorf("received nil value for token account balance for ATA %s", ata.String())
		}

		uiAmount, _ := strconv.ParseFloat(balanceResult.Value.UiAmountString, 64)

		balance = &bmodel.Balance{
			Amount:   balanceResult.Value.Amount,
			Decimals: balanceResult.Value.Decimals,
			UIAmount: uiAmount,
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return balance, nil
}

func (c *Client) SendTransaction(ctx context.Context, tx *bmodel.Transaction, opts bmodel.TransactionOptions) (bmodel.Signature, error) {
	var sig bmodel.Signature
	err := c.tracker.InstrumentCall(ctx, "solana", "SendTransaction", func(ctx context.Context) error {
		if tx == nil {
			return fmt.Errorf("cannot send nil transaction")
		}

		feePayer, err := solana.PublicKeyFromBase58(string(tx.FeePayer))
		if err != nil {
			return fmt.Errorf("invalid fee payer address '%s': %w", tx.FeePayer, err)
		}

		blockhash, err := solana.HashFromBase58(string(tx.RecentBlockhash))
		if err != nil {
			return fmt.Errorf("invalid recent blockhash '%s': %w", tx.RecentBlockhash, err)
		}

		solInstructions := make([]solana.Instruction, len(tx.Instructions))
		for i, genIx := range tx.Instructions {
			progID, err := solana.PublicKeyFromBase58(string(genIx.ProgramID))
			if err != nil {
				return fmt.Errorf("invalid program ID '%s' in instruction %d: %w", genIx.ProgramID, i, err)
			}

			accounts := make([]*solana.AccountMeta, len(genIx.Accounts))
			for j, genAccMeta := range genIx.Accounts {
				accPk, err := solana.PublicKeyFromBase58(string(genAccMeta.Address))
				if err != nil {
					return fmt.Errorf("invalid account address '%s' in instruction %d, account %d: %w", genAccMeta.Address, i, j, err)
				}
				accounts[j] = &solana.AccountMeta{
					PublicKey:  accPk,
					IsSigner:   genAccMeta.IsSigner,
					IsWritable: genAccMeta.IsWritable,
				}
			}
			solInstructions[i] = solana.NewInstruction(progID, accounts, genIx.Data)
		}

		solTx, err := solana.NewTransaction(solInstructions, blockhash, solana.TransactionPayer(feePayer))
		if err != nil {
			return fmt.Errorf("failed to create new solana transaction: %w", err)
		}

		if len(tx.Signatures) > 0 {
			slog.WarnContext(ctx, "SendTransaction: bmodel.Transaction.Signatures are present but generic signing process needs full definition.")
			// Placeholder for actual signature application logic
			// for _, sigInfo := range tx.Signatures {
			//     solanaSig, err := solana.SignatureFromBase58(string(sigInfo.Signature))
			//     if err != nil {
			//         return "", fmt.Errorf("invalid signature '%s' in transaction: %w", sigInfo.Signature, err)
			//     }
			//     solTx.AddSignature(solanaSig) // This would only work if the public key matches one of the expected signers
			// }
		}

		rpcOpts := rpc.TransactionOpts{
			SkipPreflight:       opts.SkipPreflight,
			PreflightCommitment: model.ToRPCCommitment(opts.PreflightCommitment),
		}
		if opts.MaxRetries > 0 {
			maxRetriesCopy := opts.MaxRetries
			rpcOpts.MaxRetries = &maxRetriesCopy
		}

		solSig, err := c.rpcConn.SendTransactionWithOpts(ctx, solTx, rpcOpts)
		if err != nil {
			return fmt.Errorf("failed to send transaction: %w", err)
		}

		sig = bmodel.Signature(solSig.String())
		return nil
	})

	if err != nil {
		return "", err
	}
	return sig, nil
}

func (c *Client) GetSwapQuote(ctx context.Context, fromToken, toToken bmodel.Address, amount string, userAddress bmodel.Address, slippageBps int, platformFeeBps int) (*bmodel.TradeQuote, error) {
	return nil, fmt.Errorf("GetSwapQuote is not implemented by the direct Solana RPC client; use a specific aggregator client (e.g., Jupiter)")
}

func (c *Client) ExecuteSwap(ctx context.Context, rawQuote any, userAddress bmodel.Address, signedTxIfNeeded []byte) (bmodel.Signature, error) {
	return "", fmt.Errorf("ExecuteSwap is not implemented by the direct Solana RPC client; use a specific aggregator client (e.g., Jupiter)")
}

func (c *Client) SendRawTransaction(ctx context.Context, rawTx []byte, opts bmodel.TransactionOptions) (bmodel.Signature, error) {
	var sig bmodel.Signature
	err := c.tracker.InstrumentCall(ctx, "solana", "SendRawTransaction", func(ctx context.Context) error {
		// For Solana, rawTx is expected to be a serialized transaction.
		// We can use SendEncodedTransaction if the library supports it directly for []byte,
		// or deserialize and then send. SendTransaction is often preferred if not pre-encoded for RPC.
		// Let's assume rawTx is a fully serialized transaction that can be sent.
		// The gagliardetto rpc client's SendTransaction method takes *solana.Transaction.
		// So, we first need to deserialize rawTx into a solana.Transaction.

		tx, err := solana.TransactionFromBytes(rawTx)
		if err != nil {
			return fmt.Errorf("failed to deserialize raw transaction bytes: %w", err)
		}

		// Now use the existing SendTransactionWithCustomOpts or construct rpc.TransactionOpts directly
		rpcOpts := rpc.TransactionOpts{
			SkipPreflight:       opts.SkipPreflight,
			PreflightCommitment: model.ToRPCCommitment(opts.PreflightCommitment), // Using existing model.ToRPCCommitment
		}
		if opts.MaxRetries > 0 {
			maxRetriesCopy := opts.MaxRetries
			rpcOpts.MaxRetries = &maxRetriesCopy
		}

		// It's better to use c.rpcConn.SendTransaction here if tx is already signed and serialized by client properly
		// Forcing it through SendTransactionWithOpts implies it might re-serialize or re-check things.
		// However, SendTransaction itself does not take opts directly in gagliardetto's client.
		// SendTransactionWithOpts is the most suitable existing RPC call.
		solSig, err := c.rpcConn.SendTransactionWithOpts(ctx, tx, rpcOpts)
		if err != nil {
			return fmt.Errorf("failed to send raw transaction: %w", err)
		}
		sig = bmodel.Signature(solSig.String())
		return nil
	})

	if err != nil {
		return "", err
	}
	return sig, nil
}

func (c *Client) GetTokenMetadata(ctx context.Context, mintAddress bmodel.Address) (*bmodel.TokenMetadata, error) {
	var metadata *bmodel.TokenMetadata
	err := c.tracker.InstrumentCall(ctx, "solana", "GetTokenMetadata", func(ctx context.Context) error {
		solMintAddress, err := solana.PublicKeyFromBase58(string(mintAddress))
		if err != nil {
			return fmt.Errorf("invalid mint address '%s': %w", mintAddress, err)
		}

		// 1. Get Metaplex metadata (name, symbol, URI)
		var name, symbol, uri string
		metadataPDA, _, err := solana.FindTokenMetadataAddress(solMintAddress)
		if err != nil {
			slog.WarnContext(ctx, "failed to find metadata PDA", "mint", mintAddress, "error", err)
		} else {
			accInfo, err := c.rpcConn.GetAccountInfo(ctx, metadataPDA)
			if err == nil && accInfo != nil && accInfo.Value != nil && len(accInfo.Value.Data.GetBinary()) > 0 {
				// Ensure tm "github.com/blocto/solana-go-sdk/program/metaplex/token_metadata" is imported
				meta, errDeserialize := tm.MetadataDeserialize(accInfo.Value.Data.GetBinary())
				if errDeserialize == nil {
					name = meta.Data.Name
					symbol = meta.Data.Symbol
					uri = meta.Data.Uri
				} else {
					slog.WarnContext(ctx, "failed to deserialize Metaplex metadata", "mint", mintAddress, "pda", metadataPDA.String(), "error", errDeserialize)
				}
			} else {
				slog.DebugContext(ctx, "Metaplex metadata account not found or empty", "mint", mintAddress, "pda", metadataPDA.String(), "rpc_error", err)
			}
		}

		// 2. Get Mint account info for decimals and supply (from SPL Token program)
		var decimals uint8
		var supply string
		mintAccInfo, err := c.rpcConn.GetAccountInfo(ctx, solMintAddress)
		if err != nil {
			slog.WarnContext(ctx, "failed to get mint account info", "mint", mintAddress, "error", err)
			// Potentially return error here if decimals/supply are critical and not found
		} else if mintAccInfo != nil && mintAccInfo.Value != nil && len(mintAccInfo.Value.Data.GetBinary()) > 0 {
			var splMint spltoken.Mint
			if errSpl := splMint.UnmarshalWithDecoder(bin.NewBinDecoder(mintAccInfo.Value.Data.GetBinary())); errSpl == nil {
				decimals = splMint.Decimals
				supply = strconv.FormatUint(splMint.Supply, 10)
			} else {
				slog.WarnContext(ctx, "failed to deserialize SPL Mint account data", "mint", mintAddress, "error", errSpl)
			}
		}

		// Clean up strings from null characters if coming from on-chain fixed-size arrays
		name = strings.TrimRight(name, "\x00")
		symbol = strings.TrimRight(symbol, "\x00")
		uri = strings.TrimRight(uri, "\x00")

		metadata = &bmodel.TokenMetadata{
			Name:      name,
			Symbol:    symbol,
			URI:       uri,
			Decimals:  decimals,
			Supply:    supply,
			OtherData: make(map[string]any), // Initialize if needed
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return metadata, nil
}

// GetProgramAccounts retrieves accounts associated with a program
func (c *Client) GetProgramAccounts(ctx context.Context, pubkey solana.PublicKey) (*rpc.GetProgramAccountsResult, error) {
	var result *rpc.GetProgramAccountsResult
	err := c.tracker.InstrumentCall(ctx, "solana", "GetProgramAccounts", func(ctx context.Context) error {
		rpcResult, err := c.rpcConn.GetProgramAccounts(ctx, pubkey)
		if err != nil {
			return err
		}
		result = &rpcResult
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetLargestAccounts retrieves the largest accounts
func (c *Client) GetLargestAccounts(ctx context.Context, commitment rpc.CommitmentType, filter rpc.LargestAccountsFilterType) (*rpc.GetLargestAccountsResult, error) {
	var result *rpc.GetLargestAccountsResult
	err := c.tracker.InstrumentCall(ctx, "solana", "GetLargestAccounts", func(ctx context.Context) error {
		var err error
		result, err = c.rpcConn.GetLargestAccounts(ctx, commitment, filter)
		return err
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetSupply retrieves the current supply of SOL
func (c *Client) GetSupply(ctx context.Context, commitment rpc.CommitmentType) (*rpc.GetSupplyResult, error) {
	var result *rpc.GetSupplyResult
	err := c.tracker.InstrumentCall(ctx, "solana", "GetSupply", func(ctx context.Context) error {
		var err error
		result, err = c.rpcConn.GetSupply(ctx, commitment)
		return err
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetTokenAccountsByOwner implements the GenericClientAPI interface
func (c *Client) GetTokenAccountsByOwner(ctx context.Context, ownerAddress bmodel.Address, opts bmodel.TokenAccountsOptions) ([]*bmodel.TokenAccountInfo, error) {
	var accounts []*bmodel.TokenAccountInfo
	err := c.tracker.InstrumentCall(ctx, "solana", "GetTokenAccountsByOwner", func(ctx context.Context) error {
		solOwner, err := solana.PublicKeyFromBase58(string(ownerAddress))
		if err != nil {
			return fmt.Errorf("invalid owner address '%s': %w", ownerAddress, err)
		}

		// For Solana, we need the Token Program ID.
		// The generic opts might need a way to specify this, or we assume it for this client.
		tokenProgramID := solana.TokenProgramID

		rpcConf := &rpc.GetTokenAccountsConfig{
			ProgramId: &tokenProgramID,
		}

		rpcOpts := &rpc.GetTokenAccountsOpts{
			Commitment: model.ToRPCCommitment("confirmed"), // Defaulting to confirmed
		}

		if opts.Encoding != "" {
			// Ensure the encoding string is a valid solana.EncodingType
			// This might require a validation or mapping function if generic strings are less controlled.
			rpcOpts.Encoding = solana.EncodingType(opts.Encoding)
		} else {
			rpcOpts.Encoding = solana.EncodingJSONParsed // Default
		}

		result, err := c.rpcConn.GetTokenAccountsByOwner(ctx, solOwner, rpcConf, rpcOpts)
		if err != nil {
			return fmt.Errorf("failed to get token accounts for %s: %w", ownerAddress, err)
		}

		for _, rpcAcc := range result.Value {
			var parsedAccount struct {
				Parsed struct {
					Info struct {
						Mint        string `json:"mint"`
						Owner       string `json:"owner"`
						TokenAmount struct {
							Amount         string `json:"amount"`
							Decimals       uint8  `json:"decimals"`
							UIAmountString string `json:"uiAmountString"`
						} `json:"tokenAmount"`
					} `json:"info"`
				} `json:"parsed"`
			}

			if rpcOpts.Encoding == solana.EncodingJSONParsed {
				rawJsonData := rpcAcc.Account.Data.GetRawJSON()
				if err := json.Unmarshal(rawJsonData, &parsedAccount); err != nil {
					slog.WarnContext(ctx, "failed to parse token account data (json)", "address", rpcAcc.Pubkey.String(), "error", err)
					continue
				}

				uiAmount, parseErr := strconv.ParseFloat(parsedAccount.Parsed.Info.TokenAmount.UIAmountString, 64)
				if parseErr != nil {
					slog.WarnContext(ctx, "failed to parse UIAmountString to float", "address", rpcAcc.Pubkey.String(), "uiAmountString", parsedAccount.Parsed.Info.TokenAmount.UIAmountString, "error", parseErr)
					// Set uiAmount to 0 or handle as appropriate if parsing fails
					uiAmount = 0
				}

				accounts = append(accounts, &bmodel.TokenAccountInfo{
					Address:     bmodel.Address(rpcAcc.Pubkey.String()),
					MintAddress: bmodel.Address(parsedAccount.Parsed.Info.Mint),
					Owner:       bmodel.Address(parsedAccount.Parsed.Info.Owner),
					Amount:      parsedAccount.Parsed.Info.TokenAmount.Amount,
					Decimals:    parsedAccount.Parsed.Info.TokenAmount.Decimals,
					UIAmount:    uiAmount,
				})
			} else {
				slog.WarnContext(ctx, "GetTokenAccountsByOwner non-JSONParsed encoding not fully handled for generic model mapping yet", "encoding", rpcOpts.Encoding)
				accounts = append(accounts, &bmodel.TokenAccountInfo{
					Address: bmodel.Address(rpcAcc.Pubkey.String()),
				})
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return accounts, nil
}
