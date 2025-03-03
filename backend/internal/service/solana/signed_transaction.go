package solana

import (
	"context"
	"encoding/base64"
	"fmt"
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
	if err := s.ExecuteSignedTransaction(ctx, signedTx); err != nil {
		return fmt.Errorf("failed to execute signed transaction: %w", err)
	}

	// Update trade status
	trade.Status = "completed"
	trade.CompletedAt = time.Now()

	return nil
}

// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
func (s *SolanaTradeService) ExecuteSignedTransaction(ctx context.Context, signedTx string) error {
	// Decode base64 signed transaction
	txBytes, err := base64.StdEncoding.DecodeString(signedTx)
	if err != nil {
		return fmt.Errorf("invalid base64 transaction: %w", err)
	}

	// Try to deserialize as a versioned transaction first
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	// Submit the transaction with preflight checks disabled for ALT transactions
	sig, err := s.client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       true, // Skip preflight for ALT transactions
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return fmt.Errorf("failed to submit transaction: %w", err)
	}

	// Wait for confirmation with a longer timeout
	status, err := s.client.GetSignatureStatuses(ctx, true, sig)
	if err != nil {
		return fmt.Errorf("failed to confirm transaction: %w", err)
	}

	if status.Value[0] != nil && status.Value[0].Err != nil {
		return fmt.Errorf("transaction failed: %v", status.Value[0].Err)
	}

	return nil
}
