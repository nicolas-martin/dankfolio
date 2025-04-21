package solana

import (
	"context"
	"fmt"
	"log"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
)

// Client handles interactions with the Solana RPC
type Client struct {
	rpcClient *client.Client
}

// NewClient creates a new instance of Client
func NewClient(endpoint string) *Client {
	if endpoint == "" {
		endpoint = client.MainnetRPCEndpoint
		log.Printf("No Solana RPC endpoint provided, using default: %s", endpoint)
	}

	return &Client{
		rpcClient: client.NewClient(endpoint),
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
