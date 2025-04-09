package solana

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/internal/model"
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

// GetTransactionConfirmationStatus retrieves the confirmation status of a given transaction signature.
// Corrected return type from *rpc.SignatureStatusesResult to *rpc.GetSignatureStatusesResult
func (s *SolanaTradeService) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error) {
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
