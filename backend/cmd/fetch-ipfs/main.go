package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
)

// printOnChainMetadata formats and prints on-chain metadata in a table.
func printOnChainMetadata(data map[string]any, caption string) {
	max := 80
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Field", "Value"})

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
	table.SetCaption(true, caption)
	table.Render()
}

func formatUint16(n uint16) string {
	return strings.TrimSpace(string(rune(n)))
}

// resolveIPFSGateway rewrites the URI if it uses a known gateway that might be unreliable.
func resolveIPFSGateway(uri string) string {
	// Check if the URI contains an IPFS gateway domain.
	if strings.Contains(uri, "/ipfs/") {
		parts := strings.Split(uri, "/ipfs/")
		if len(parts) >= 2 {
			cid := parts[1]
			// Return a standardized format, leaving the gateway resolution to our fallback logic.
			return "ipfs://" + cid
		}
	}
	return uri
}

// fetchOffChainMetadataWithFallback attempts to fetch off-chain metadata
// using a list of HTTP gateways as fallback for IPFS content.
func fetchOffChainMetadataWithFallback(uri string) (map[string]interface{}, error) {
	var offchainMeta map[string]interface{}

	// If the URI uses the ipfs:// scheme, try a list of gateways.
	if strings.HasPrefix(uri, "ipfs://") {
		cid := strings.TrimPrefix(uri, "ipfs://")
		// List of fallback gateways.
		gateways := []string{
			"https://ipfs.io/ipfs/",
			"https://dweb.link/ipfs/",
			"https://cloudflare-ipfs.com/ipfs/",
		}
		var err error
		for _, gw := range gateways {
			fullURL := gw + cid
			log.Printf("Attempting gateway: %s", fullURL)
			offchainMeta, err = fetchOffChainMetadataHTTP(fullURL)
			if err == nil {
				// Success
				return offchainMeta, nil
			}
			log.Printf("Gateway %s failed: %v", gw, err)
		}
		return nil, err
	}

	// Otherwise, if it's a standard HTTP URL, try directly.
	if strings.HasPrefix(uri, "http") {
		return fetchOffChainMetadataHTTP(uri)
	}

	return nil, nil
}

// fetchOffChainMetadataHTTP fetches JSON metadata from the given HTTP URL.
func fetchOffChainMetadataHTTP(url string) (map[string]interface{}, error) {
	var offchainMeta map[string]interface{}
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, err
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(body, &offchainMeta); err != nil {
		return nil, err
	}
	return offchainMeta, nil
}

func main() {
	// Use your token mint address.
	mint := common.PublicKeyFromString("28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump")
	metadataAccount, err := token_metadata.GetTokenMetaPubkey(mint)
	if err != nil {
		log.Fatalf("failed to get metadata account, err: %v", err)
	}

	// Create a new RPC client.
	c := client.NewClient(rpc.MainnetRPCEndpoint)

	// Get account info.
	accountInfo, err := c.GetAccountInfo(context.Background(), metadataAccount.ToBase58())
	if err != nil {
		log.Fatalf("failed to get accountInfo, err: %v", err)
	}

	// Deserialize on-chain metadata.
	metadata, err := token_metadata.MetadataDeserialize(accountInfo.Data)
	if err != nil {
		log.Fatalf("failed to parse metaAccount, err: %v", err)
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
	printOnChainMetadata(data, "On-Chain Metadata")
	if metadata.Data.Creators != nil {
		log.Println("Creators:")
		for _, c := range *metadata.Data.Creators {
			log.Printf("  - Address: %s, Verified: %t, Share: %d%%\n", c.Address, c.Verified, c.Share)
		}
	}

	// Prepare and resolve the URI.
	uri := resolveIPFSGateway(metadata.Data.Uri)
	log.Printf("Fetching off-chain metadata from URI: %s", uri)
	offchainMeta, err := fetchOffChainMetadataWithFallback(uri)
	if err != nil {
		log.Fatalf("failed to fetch off-chain metadata, err: %v", err)
	}

	printOnChainMetadata(offchainMeta, "Off-Chain Metadata")
}
