package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run debug_token.go <mint_address>")
		return
	}

	mintAddr := os.Args[1]
	mintPubkey := solana.MustPublicKeyFromBase58(mintAddr)

	// Get RPC endpoint from environment
	rpcURL := os.Getenv("SOLANA_RPC_ENDPOINT")
	if rpcURL == "" {
		rpcURL = "https://api.mainnet-beta.solana.com"
	}

	apiKey := os.Getenv("SOLANA_RPC_API_KEY")

	// Create RPC client
	var rpcClient *rpc.Client
	if apiKey != "" {
		headers := map[string]string{
			"Authorization": "Bearer " + apiKey,
		}
		rpcClient = rpc.NewWithHeaders(rpcURL, headers)
	} else {
		rpcClient = rpc.New(rpcURL)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get mint account info
	accountInfo, err := rpcClient.GetAccountInfo(ctx, mintPubkey)
	if err != nil {
		fmt.Printf("Failed to get account info: %v\n", err)
		return
	}

	if accountInfo == nil || accountInfo.Value == nil {
		fmt.Println("Account not found")
		return
	}

	data := accountInfo.Value.Data.GetBinary()
	fmt.Printf("Mint: %s\n", mintAddr)
	fmt.Printf("Owner: %s\n", accountInfo.Value.Owner)
	fmt.Printf("Data length: %d bytes\n", len(data))

	// Print first 100 bytes in hex
	fmt.Println("\nFirst 100 bytes (hex):")
	if len(data) > 100 {
		fmt.Println(hex.Dump(data[:100]))
	} else {
		fmt.Println(hex.Dump(data))
	}

	// Check account type at offset 82
	if len(data) > 82 {
		fmt.Printf("\nAccount type at offset 82: %d\n", data[82])
		if data[82] == 1 {
			fmt.Println("This is a mint with extensions")

			// Check extension length at offset 83-84
			if len(data) > 84 {
				extLen := uint16(data[83]) | uint16(data[84])<<8
				fmt.Printf("Extension area length: %d\n", extLen)
			}
		} else {
			fmt.Println("This is NOT a mint with extensions")
		}
	}

	// Print last 100 bytes to look for metadata
	if len(data) > 200 {
		fmt.Println("\nLast 100 bytes (hex):")
		fmt.Println(hex.Dump(data[len(data)-100:]))
	}
}

