package solana

import (
	"context"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// ClientAPI defines the interface for Solana blockchain interactions
type ClientAPI interface {
	// GetMetadataAccount retrieves the metadata account for a token
	GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error)

	// ExecuteTrade executes a pre-signed transaction
	ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) (string, error)

	// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
	ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error)

	// GetTransactionConfirmationStatus gets the confirmation status of a transaction
	GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error)
}
