package solana

import (
	"context"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc" // Still needed for some underlying types not being abstracted yet
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// ClientAPI defines the interface for Solana blockchain interactions
type ClientAPI interface {
	GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error)
	ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) (string, error)
	ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error)

	// Changed return type to use model.SignatureStatusResult
	GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*model.SignatureStatusResult, error)

}

// SolanaRPCClientAPI defines the interface for the Solana RPC client methods used by wallet.Service.
type SolanaRPCClientAPI interface {
	// GetAccountInfo's return type might also be abstracted in the future if needed.
	GetAccountInfo(ctx context.Context, account solana.PublicKey) (*rpc.GetAccountInfoResult, error)

	// Commitment is now implicit (e.g., "confirmed" by method name or client default)
	GetLatestBlockhashConfirmed(ctx context.Context) (*rpc.GetLatestBlockhashResult, error)

	// Uses model.TransactionOptions instead of rpc.TransactionOpts
	SendTransactionWithCustomOpts(ctx context.Context, tx *solana.Transaction, opts model.TransactionOptions) (solana.Signature, error)

	// Commitment is now implicit
	GetBalanceConfirmed(ctx context.Context, account solana.PublicKey) (*rpc.GetBalanceResult, error)

	// Uses model.GetTokenAccountsOptions, commitment is implicit
	// The rpc.GetTokenAccountsConfig contains ProgramId, which we can put into our options.
	// The rpc.GetTokenAccountsOpts contains Encoding and Commitment. We make commitment implicit
	// and pass encoding via our options struct.
	GetTokenAccountsByOwnerConfirmed(ctx context.Context, owner solana.PublicKey, opts model.GetTokenAccountsOptions) (*rpc.GetTokenAccountsResult, error)
}
