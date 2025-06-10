package clients

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain" // Import the new models
)

// GenericClientAPI defines a chain-agnostic interface for blockchain interactions.
type GenericClientAPI interface {
	// GetAccountInfo retrieves information about a specific account.
	GetAccountInfo(ctx context.Context, address blockchain.Address) (*blockchain.AccountInfo, error)

	// GetBalance retrieves the native asset balance for a specific account.
	// 'commitment' string can be "processed", "confirmed", "finalized", or chain-specific values.
	GetBalance(ctx context.Context, address blockchain.Address, commitment string) (*blockchain.Balance, error)

	// GetTokenAccountsByOwner retrieves all token accounts owned by a specific address.
	// This might need further refinement based on how different chains handle token discovery.
	GetTokenAccountsByOwner(ctx context.Context, ownerAddress blockchain.Address, opts blockchain.TokenAccountsOptions) ([]*blockchain.TokenAccountInfo, error)

	// GetTokenBalance retrieves the balance for a specific token account or a token mint for a specific owner.
	// This is a common pattern, but its generic implementation might vary.
	// For now, let's assume it takes the owner and the token's mint address.
	GetTokenBalance(ctx context.Context, ownerAddress blockchain.Address, tokenMintAddress blockchain.Address, commitment string) (*blockchain.Balance, error)

	// GetLatestBlockhash retrieves the most recent processed block hash.
	GetLatestBlockhash(ctx context.Context) (blockchain.Blockhash, error)

	// SendTransaction submits a signed transaction to the blockchain.
	// The 'tx' parameter might be a fully signed raw transaction []byte in some generic designs,
	// or a structured transaction that the client then signs/serializes.
	// For now, using the structured blockchain.Transaction.
	SendTransaction(ctx context.Context, tx *blockchain.Transaction, opts blockchain.TransactionOptions) (blockchain.Signature, error)

	// GetTransactionStatus retrieves the status of a transaction given its signature.
	GetTransactionStatus(ctx context.Context, signature blockchain.Signature) (*blockchain.TransactionStatus, error)

	// GetTokenMetadata might be needed if services require generic token info beyond what's in TokenAccountInfo.
	// GetTokenMetadata(ctx context.Context, mintAddress blockchain.Address) (*model.TokenMetadata, error) // model.TokenMetadata would need to be generic

	// GetMarketData or GetPrice might be relevant if these are considered on-chain or core client functions.
	// GetPrice(ctx context.Context, baseToken blockchain.Address, quoteToken blockchain.Address) (*blockchain.PriceData, error)

	// GetSwapQuote gets a quote for a token swap.
	GetSwapQuote(ctx context.Context, fromToken, toToken blockchain.Address, amount string, userAddress blockchain.Address, slippageBps int, platformFeeBps int) (*blockchain.TradeQuote, error)

	// ExecuteSwap executes a swap based on a raw quote or specific parameters.
	// The exact parameters will depend heavily on how generic swaps are handled.
	// It might take the RawQuote from blockchain.TradeQuote.
	ExecuteSwap(ctx context.Context, rawQuote any, userAddress blockchain.Address, signedTxIfNeeded []byte) (blockchain.Signature, error)

	// SendRawTransaction submits an already serialized (and likely signed) transaction to the blockchain.
	SendRawTransaction(ctx context.Context, rawTx []byte, opts blockchain.TransactionOptions) (blockchain.Signature, error)

	// GetTokenMetadata retrieves metadata for a given token mint address.
	GetTokenMetadata(ctx context.Context, mintAddress blockchain.Address) (*blockchain.TokenMetadata, error)
}
