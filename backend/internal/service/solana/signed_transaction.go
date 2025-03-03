package solana

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"time"

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
	trade.Status = "completed"
	trade.CompletedAt = time.Now()
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
	log.Printf("✅ Transaction submitted with signature: %s", sig.String())

	// Wait for confirmation with timeout
	ctx, cancel := context.WithTimeout(ctx, time.Second*30)
	defer cancel()

	// Poll for status
	for {
		select {
		case <-ctx.Done():
			return solana.Signature{}, fmt.Errorf("timeout waiting for transaction confirmation")
		default:
			status, err := s.client.GetSignatureStatuses(ctx, true, sig)
			if err != nil {
				log.Printf("❌ Failed to get transaction status: %v", err)
				return solana.Signature{}, fmt.Errorf("failed to get transaction status: %w", err)
			}

			if status.Value == nil || len(status.Value) == 0 || status.Value[0] == nil {
				log.Printf("⏳ Transaction not yet processed, waiting...")
				time.Sleep(time.Second)
				continue
			}

			if status.Value[0].Err != nil {
				log.Printf("❌ Transaction failed with error: %v", status.Value[0].Err)
				return solana.Signature{}, fmt.Errorf("transaction failed: %v", status.Value[0].Err)
			}

			if status.Value[0].Confirmations != nil {
				log.Printf("✅ Transaction confirmed with %d confirmations", *status.Value[0].Confirmations)
			}

			if status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusFinalized {
				log.Printf("✅ Transaction finalized!")
				log.Printf("🔍 View on Solscan: https://solscan.io/tx/%s", sig.String())
				return sig, nil
			}

			time.Sleep(time.Second)
		}
	}
}
