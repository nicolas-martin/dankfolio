package solana

import (
	"context"
	"fmt"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/gagliardetto/solana-go/rpc"
)

// Client handles interactions with the Solana RPC
type Client struct {
	rpcClient *client.Client
	rpcConn   *rpc.Client
}

// NewClient creates a new instance of Client
func NewClient(endpoint string) *Client {
	return &Client{
		rpcClient: client.NewClient(endpoint),
		rpcConn:   rpc.New(endpoint),
	}
}

// GetMetadataAccount retrieves the metadata account for a token
func (c *Client) GetMetadataAccount(ctx context.Context, mint string) (*token_metadata.Metadata, error) {
	mintPubkey := common.PublicKeyFromString(mint)
	metadataAccountPDA, err := token_metadata.GetTokenMetaPubkey(mintPubkey)
	if err != nil {
		return nil, fmt.Errorf("failed to derive metadata account PDA for %s: %w", mint, err)
	}

	accountInfo, err := c.rpcClient.GetAccountInfo(ctx, metadataAccountPDA.ToBase58())
	if err != nil {
		return nil, fmt.Errorf("failed to get account info for metadata PDA %s (mint: %s): %w", metadataAccountPDA.ToBase58(), mint, err)
	}
	if len(accountInfo.Data) == 0 {
		return nil, fmt.Errorf("metadata account %s for mint %s has no data", metadataAccountPDA.ToBase58(), mint)
	}

	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse metadata for %s: %w", mint, err)
	}

	return &metadata, nil
}

// GetRpcConnection returns the underlying RPC connection for direct usage
func (c *Client) GetRpcConnection() *rpc.Client {
	return c.rpcConn
}
