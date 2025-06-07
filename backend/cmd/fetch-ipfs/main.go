package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/blocto/solana-go-sdk/client"
	"github.com/blocto/solana-go-sdk/common"
	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/blocto/solana-go-sdk/rpc"
	"github.com/olekukonko/tablewriter"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
)

type Coin struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	Decimals    int      `json:"decimals"`
	Description string   `json:"description"`
	IconURL     string   `json:"icon_url"`
	Tags        []string `json:"tags"`
	Price       float64  `json:"price"`
	CreatedAt   string   `json:"created_at"`
}

// getCommonTokens returns a hardcoded list of common tokens for testing
func getCommonTokens() []Coin {
	return []Coin{
		{
			ID:     "So11111111111111111111111111111111111111112",
			Name:   "Solana",
			Symbol: "SOL",
		},
		{
			ID:     "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			Name:   "USD Coin",
			Symbol: "USDC",
		},
	}
}

// printOnChainMetadata formats and prints on-chain metadata in a table.
func printOnChainMetadata(data map[string]any, caption string) {
	max := 80
	table := tablewriter.NewWriter(os.Stdout)
	table.Header([]string{"Key", "Value"})

	for k, v := range data {
		strVal := fmt.Sprintf("%s", v)
		if strings.ToLower(k) == "description" {
			strVal = strings.ReplaceAll(strVal, "\r\n", "")
		}
		if len(strVal) >= max {
			strVal = strVal[:max] + "..."
		}

		row := []string{k, strVal}
		table.Append(row)
	}
	table.Render()
}

func fetchTokenMetadata(c *client.Client, offchainClient offchain.ClientAPI, mint common.PublicKey) error {
	metadataAccount, err := token_metadata.GetTokenMetaPubkey(mint)
	if err != nil {
		return fmt.Errorf("failed to get metadata account: %w", err)
	}

	accountInfo, err := c.GetAccountInfo(context.Background(), metadataAccount.ToBase58())
	if err != nil {
		return fmt.Errorf("failed to get accountInfo: %w", err)
	}

	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		return fmt.Errorf("failed to parse metaAccount: %w", err)
	}

	data := map[string]any{
		"Name":                    metadata.Data.Name,
		"Symbol":                  metadata.Data.Symbol,
		"URI":                     metadata.Data.Uri,
		"Update Authority":        metadata.UpdateAuthority.ToBase58(),
		"Mint":                    metadata.Mint.ToBase58(),
		"Seller Fee Basis Points": fmt.Sprintf("%d", metadata.Data.SellerFeeBasisPoints),
		"Primary Sale Happened":   fmt.Sprintf("%t", metadata.PrimarySaleHappened),
		"Is Mutable":              fmt.Sprintf("%t", metadata.IsMutable),
	}
	printOnChainMetadata(data, fmt.Sprintf("On-Chain Metadata for %s", metadata.Data.Name))

	if metadata.Data.Creators != nil {
		log.Printf("Creators for %s:", metadata.Data.Name)
		for _, c := range *metadata.Data.Creators {
			log.Printf("  - Address: %s, Verified: %t, Share: %d%%\n", c.Address, c.Verified, c.Share)
		}
	}

	log.Printf("🔍 Fetching off-chain metadata for %s...", metadata.Data.Name)
	offchainMeta, err := offchainClient.FetchMetadata(metadata.Data.Uri)
	if err != nil {
		return fmt.Errorf("failed to fetch off-chain metadata: %w", err)
	}

	printOnChainMetadata(offchainMeta, fmt.Sprintf("Off-Chain Metadata for %s", metadata.Data.Name))
	return nil
}

func main() {
	// Use hardcoded common tokens instead of reading from file
	coins := getCommonTokens()

	// Create RPC client
	c := client.NewClient(rpc.MainnetRPCEndpoint)

	// Create HTTP client with timeout
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Create offchain client
	// Create API tracker
	apiTracker := clients.NewAPICallTracker()

	offchainClient := offchain.NewClient(httpClient, apiTracker)

	log.Printf("📊 Processing %d common tokens", len(coins))

	for _, coin := range coins {
		log.Printf("\n🪙 Processing coins: %s (%s)", coin.Name, coin.Symbol)
		mint := common.PublicKeyFromString(coin.ID)
		if err := fetchTokenMetadata(c, offchainClient, mint); err != nil {
			log.Printf("❌ Error processing %s: %v", coin.Name, err)
			continue
		}
	}
}
