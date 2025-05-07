package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"github.com/olekukonko/tablewriter"
)

type WalletInfo struct {
	Path      string
	PublicKey string
	Tokens    []wallet.Balance
}

func checkBalance(ctx context.Context, walletService *wallet.Service, keyPath string) {
	fmt.Printf("\nChecking balance for: %s\n", keyPath)

	keypair, err := solana.PrivateKeyFromSolanaKeygenFile(keyPath)
	if err != nil {
		log.Fatalf("failed to parse keypair: %v", err)
	}

	// Get token balances
	walletBalance, err := walletService.GetWalletBalances(ctx, keypair.PublicKey().String())
	if err != nil {
		log.Fatalf("failed to get token balances: %v", err)
	}
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Address", "Amount"})

	fmt.Printf("Public Key: %s\n", keypair.PublicKey())

	for _, token := range walletBalance.Balances {
		table.Append([]string{token.ID, fmt.Sprintf("%f", token.Amount)})
	}

	table.Render()
}

func main() {
	// Parse command line flags
	rpcEndpoint := flag.String("rpc", "https://api.mainnet-beta.solana.com", "Solana RPC endpoint")
	walletPath := flag.String("wallet", "", "Path to wallet keypair file")
	flag.Parse()

	if *walletPath == "" {
		fmt.Println("Error: wallet path is required")
		flag.Usage()
		os.Exit(1)
	}

	// Initialize RPC client
	client := rpc.New(*rpcEndpoint)

	// Initialize memory store
	store := memory.NewWithConfig(memory.Config{})

	// Initialize the coin service with Jupiter client
	walletService := wallet.New(client, store)

	// Define wallet path
	walletKeyPath := *walletPath

	// Read and parse the wallet file
	keyBytes, err := os.ReadFile(walletKeyPath)
	if err != nil {
		log.Fatalf("Error reading wallet file: %v", err)
	}

	// Remove quotes if present
	keyStr := strings.Trim(string(keyBytes), "\"")

	// Parse the private key
	privateKey := solana.MustPrivateKeyFromBase58(keyStr)
	publicKey := privateKey.PublicKey()

	fmt.Printf("Checking balances for wallet: %s\n", publicKey.String())

	// Get wallet balances
	balances, err := walletService.GetWalletBalances(context.Background(), publicKey.String())
	if err != nil {
		log.Fatalf("Error getting wallet balances: %v", err)
	}

	// Print balances
	fmt.Println("\nBalances:")
	for _, balance := range balances.Balances {
		fmt.Printf("  %s: %.9f\n", balance.ID, balance.Amount)
	}
}
