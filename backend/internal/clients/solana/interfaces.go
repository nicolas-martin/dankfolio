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

// SolanaRPCClientAPI defines the interface for the Solana RPC client methods used by wallet.Service.
type SolanaRPCClientAPI interface {
	GetAccountInfo(ctx context.Context, account solana.PublicKey) (*rpc.GetAccountInfoResult, error)
	GetLatestBlockhash(ctx context.Context, commitment rpc.CommitmentType) (*rpc.GetLatestBlockhashResult, error)
	SendTransactionWithOpts(ctx context.Context, tx *solana.Transaction, opts rpc.TransactionOpts) (solana.Signature, error)
	GetBalance(ctx context.Context, account solana.PublicKey, commitment rpc.CommitmentType) (*rpc.GetBalanceResult, error)
	GetTokenAccountsByOwner(ctx context.Context, owner solana.PublicKey, mint *rpc.GetTokenAccountsConfig, opts *rpc.GetTokenAccountsOpts) (*rpc.GetTokenAccountsResult, error) // Corrected return type
}
