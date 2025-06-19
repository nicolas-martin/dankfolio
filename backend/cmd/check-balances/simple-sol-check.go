package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

func main() {
	walletAddress := "BVJaiCR2fGRNZHaHnukEf3BCsRTAZ59R4aGBXwmD6hfK"
	if len(os.Args) > 1 {
		walletAddress = os.Args[1]
	}

	solApiKey := os.Getenv("SOLANA_RPC_API_KEY")
	solEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	if solApiKey == "" || solEndpoint == "" {
		log.Fatal("Please set SOLANA_RPC_API_KEY and SOLANA_RPC_ENDPOINT")
	}

	header := map[string]string{
		"Authorization": "Bearer " + solApiKey,
	}
	client := rpc.NewWithHeaders(solEndpoint, header)

	pubKey, err := solana.PublicKeyFromBase58(walletAddress)
	if err != nil {
		log.Fatalf("Invalid address: %v", err)
	}

	fmt.Printf("Checking SOL balance for: %s\n", walletAddress)

	balance, err := client.GetBalance(context.Background(), pubKey, rpc.CommitmentConfirmed)
	if err != nil {
		log.Fatalf("Error getting balance: %v", err)
	}

	solAmount := float64(balance.Value) / 1e9
	fmt.Printf("SOL Balance: %.9f SOL\n", solAmount)

	if solAmount == 0 {
		fmt.Println("❌ This wallet has ZERO SOL!")
		fmt.Println("💡 This explains why SOL doesn't show up in the trade screen.")
		fmt.Println("💡 You need to fund this wallet with some SOL to see it in the portfolio.")
	} else {
		fmt.Println("✅ This wallet has SOL!")
	}
}
