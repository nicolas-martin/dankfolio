package solana

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

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

// ExecuteTrade executes a pre-signed transaction from the frontend
func (s *SolanaTradeService) ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) error {
	// Execute the signed transaction
	if signedTx == "" {
		return fmt.Errorf("signed transaction is required for trade execution")
	}

	// Execute the signed transaction
	sig, err := s.ExecuteSignedTransaction(ctx, signedTx)
	if err != nil {
		return fmt.Errorf("failed to execute signed transaction: %w", err)
	}

	// Update trade status and transaction hash
	trade.Status = "submitted" // Changed from "completed"
	// trade.CompletedAt = time.Now() // Completion is not immediate
	trade.TransactionHash = sig.String()

	return nil
}

// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
func (s *SolanaTradeService) ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error) {
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
	simResult, err := s.client.SimulateTransaction(ctx, tx)
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
	sig, err := s.client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		log.Printf("❌ Failed to submit transaction: %v", err)
		return solana.Signature{}, fmt.Errorf("failed to submit transaction: %w", err)
	}
	log.Printf("✅ Transaction submitted with signature: %s. Returning immediately.", sig.String())
	log.Printf("🔍 View on Solscan: https://solscan.io/tx/%s?cluster=devnet", sig.String()) // Assuming devnet, adjust cluster if needed

	// Return signature immediately without waiting for confirmation
	return sig, nil
}

func (s *SolanaTradeService) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		log.Print("X-Debug-Mode: true")
		return getMockTransactionStatus(sigStr)
	}

	// TODO: possible bug if the tx hash is old and already finalized.
	// it's an edge case...
	log.Printf("🔍 Checking confirmation status for signature: %s", sigStr)
	sig, err := solana.SignatureFromBase58(sigStr)
	if err != nil {
		log.Printf("❌ Invalid signature format: %v", err)
		return nil, fmt.Errorf("invalid signature format: %w", err)
	}

	// Get signature statuses
	status, err := s.client.GetSignatureStatuses(ctx, true, sig)
	if err != nil {
		log.Printf("❌ Failed to get transaction status for %s: %v", sigStr, err)
		return nil, fmt.Errorf("failed to get transaction status: %w", err)
	}

	if status == nil || len(status.Value) == 0 || status.Value[0] == nil {
		log.Printf("⏳ Transaction %s not yet found or processed.", sigStr)
		// Return nil status without error, indicating it's not found yet.
		// The handler can interpret this as 0 confirmations or pending.
		return nil, nil
	}

	// NOTE: Do we always check the first entry?
	if status.Value[0].Err != nil {
		log.Printf("❌ Transaction %s failed with error: %v", sigStr, status.Value[0].Err)
		// Return the status containing the error
		return status, fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	confirmations := uint64(0)
	if status.Value[0].Confirmations != nil {
		confirmations = *status.Value[0].Confirmations
	}
	log.Printf("✅ Transaction %s status: %s, Confirmations: %d", sigStr, status.Value[0].ConfirmationStatus, confirmations)

	return status, nil
}

// Helper function to create uint64 pointer
func ptr(v uint64) *uint64 {
	return &v
}

// getMockTransactionStatus handles the mock transaction status progression
func getMockTransactionStatus(sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	// Special case for testing error scenarios
	if len(sigStr) > 5 && sigStr[:5] == "error" {
		log.Printf("❌ Mock error case triggered for test signature")
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{
				{
					Slot:               uint64(time.Now().Unix()),
					Confirmations:      nil,
					Err:                fmt.Errorf("mock transaction error: insufficient funds"),
					ConfirmationStatus: "",
				},
			},
		}, fmt.Errorf("transaction failed: insufficient funds")
	}

	mockTxMutex.Lock()
	state, exists := mockTxStates[sigStr]
	if !exists {
		// First time seeing this transaction
		state = &MockTransactionState{
			FirstSeenAt:   time.Now(),
			NumChecks:     0,
			Confirmations: 0,
			IsFinalized:   false,
		}
		mockTxStates[sigStr] = state
	}
	state.NumChecks++
	mockTxMutex.Unlock()

	// Initial state - always pending on first check
	if state.NumChecks == 1 {
		log.Printf("⏳ Transaction %s not yet found or processed.", sigStr)
		return nil, nil
	}

	// Progress through confirmation states based on number of checks
	// We know frontend polls every 5 seconds, so:
	// Check 1: Pending
	// Check 2-3: Confirmed with increasing confirmations
	// Check 4+: Finalized
	if !state.IsFinalized {
		if state.NumChecks <= 3 {
			// Increment confirmations by 2-3 each check
			state.Confirmations += 2 + uint64(state.NumChecks%2)
			log.Printf("✅ Transaction %s status: confirmed, Confirmations: %d", sigStr, state.Confirmations)
			return &rpc.GetSignatureStatusesResult{
				Value: []*rpc.SignatureStatusesResult{
					{
						Slot:               uint64(time.Now().Unix()),
						Confirmations:      ptr(state.Confirmations),
						Err:                nil,
						ConfirmationStatus: rpc.ConfirmationStatusConfirmed,
					},
				},
			}, nil
		} else {
			// After 3 checks (15 seconds of polling), finalize the transaction
			state.IsFinalized = true
			state.Confirmations = 0 // Reset to 0 for finalized state
		}
	}

	// Return finalized state
	if state.IsFinalized {
		log.Printf("✅ Transaction %s status: finalized, Confirmations: 0", sigStr)
		return &rpc.GetSignatureStatusesResult{
			Value: []*rpc.SignatureStatusesResult{
				{
					Slot:               uint64(time.Now().Unix()),
					Confirmations:      ptr(uint64(0)),
					Err:                nil,
					ConfirmationStatus: rpc.ConfirmationStatusFinalized,
				},
			},
		}, nil
	}

	// This should never happen due to the logic above, but added for completeness
	return nil, fmt.Errorf("unexpected state in mock transaction")
}

// CreateTransferTransaction creates an unsigned transfer transaction
func (s *SolanaTradeService) CreateTransferTransaction(ctx context.Context, FromAddress string, ToAddress string, TokenMint string, Amount float64) (string, error) {
	// Convert addresses to public keys
	fromPubkey, err := solana.PublicKeyFromBase58(FromAddress)
	if err != nil {
		return "", fmt.Errorf("invalid from address: %w", err)
	}

	toPubkey, err := solana.PublicKeyFromBase58(ToAddress)
	if err != nil {
		return "", fmt.Errorf("invalid to address: %w", err)
	}

	// Get recent blockhash
	recentBlockhash, err := s.client.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return "", fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	var instructions []solana.Instruction

	if TokenMint == "" {
		// SOL transfer
		lamports := uint64(Amount * float64(solana.LAMPORTS_PER_SOL))
		instructions = append(instructions, system.NewTransferInstruction(
			lamports,
			fromPubkey,
			toPubkey,
		).Build())
	} else {
		// SPL token transfer
		mintPubkey, err := solana.PublicKeyFromBase58(TokenMint)
		if err != nil {
			return "", fmt.Errorf("invalid token mint address: %w", err)
		}

		// Get associated token accounts for both sender and recipient
		fromATA, _, err := solana.FindAssociatedTokenAddress(fromPubkey, mintPubkey)
		if err != nil {
			return "", fmt.Errorf("failed to find sender's token account: %w", err)
		}

		toATA, _, err := solana.FindAssociatedTokenAddress(toPubkey, mintPubkey)
		if err != nil {
			return "", fmt.Errorf("failed to find recipient's token account: %w", err)
		}

		// Check if recipient's ATA exists
		ataInfo, err := s.client.GetAccountInfo(ctx, toATA)
		if err != nil || ataInfo == nil {
			// Create ATA for recipient - updated to use correct number of arguments
			instructions = append(instructions,
				associatedtokenaccount.NewCreateInstruction(
					fromPubkey, // Payer
					toPubkey,   // Owner
					mintPubkey, // Mint
				).Build(),
			)
		}

		// Add transfer instruction
		instructions = append(instructions,
			token.NewTransferCheckedInstruction(
				uint64(Amount),
				9, // Most tokens use 9 decimals, but this should be fetched from the mint
				fromATA,
				toATA,
				mintPubkey,
				fromPubkey,
				[]solana.PublicKey{},
			).Build(),
		)
	}

	// Create transaction
	tx, err := solana.NewTransaction(
		instructions,
		recentBlockhash.Value.Blockhash,
		solana.TransactionPayer(fromPubkey),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create transaction: %w", err)
	}

	// Serialize transaction
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return "", fmt.Errorf("failed to serialize transaction: %w", err)
	}

	// Return base64 encoded transaction
	return base64.StdEncoding.EncodeToString(txBytes), nil
}
