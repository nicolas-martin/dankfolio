package solana

import (
	"context"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

//go:generate mockery --name=ClientAPI --output=mocks --outpkg=mocks --case=snake

// ClientAPI defines the interface for Solana blockchain interactions
type ClientAPI interface {
	// GetMetadataAccount retrieves the metadata account for a token
	GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error)

	// GetRpcConnection returns the underlying RPC connection for direct usage
	GetRpcConnection() *rpc.Client

	// ExecuteTrade executes a pre-signed transaction
	ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) error

	// ExecuteSignedTransaction submits a signed transaction to the Solana blockchain
	ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error)
}
