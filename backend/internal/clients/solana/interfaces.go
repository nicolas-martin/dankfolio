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
	GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error)
	ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) (string, error)
	ExecuteSignedTransaction(ctx context.Context, signedTx string) (solana.Signature, error)
	GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*model.SignatureStatusResult, error)
}

// SolanaRPCClientAPI defines the interface for the Solana RPC client methods used by wallet.Service.
type SolanaRPCClientAPI interface {
	GetAccountInfo(ctx context.Context, account solana.PublicKey) (*rpc.GetAccountInfoResult, error)
	GetLatestBlockhashConfirmed(ctx context.Context) (*rpc.GetLatestBlockhashResult, error)
	SendTransactionWithCustomOpts(ctx context.Context, tx *solana.Transaction, opts model.TransactionOptions) (solana.Signature, error)
	GetBalanceConfirmed(ctx context.Context, account solana.PublicKey) (*rpc.GetBalanceResult, error)
	GetTokenAccountsByOwnerConfirmed(ctx context.Context, owner solana.PublicKey, opts model.GetTokenAccountsOptions) (*rpc.GetTokenAccountsResult, error)
}
