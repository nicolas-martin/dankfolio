package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

func main() {
	if err := run(); err != nil {
		log.Printf("❌ Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v\n", err)
	}

	// Command line flags
	recipientAddr := flag.String("to", "6hbS1d1JRRta3GtJC7XNo16gg3PTb41QJVzy6kWsZnav", "Recipient's Solana address")
	amount := flag.Float64("amount", 0.000000001, "Amount of SOL to send")
	rpcURL := flag.String("rpc", os.Getenv("SOLANA_RPC_URL"), "Solana RPC URL")
	flag.Parse()

	if *rpcURL == "" {
		return fmt.Errorf("SOLANA_RPC_URL environment variable is required")
	}

	// Initialize RPC client
	rpcClient := rpc.New(*rpcURL)

	// Create wallet service
	walletService := wallet.New(rpcClient)

	// Get sender's public key from env
	senderPubKey := os.Getenv("WALLET_PUBLIC_KEY")
	if senderPubKey == "" {
		return fmt.Errorf("WALLET_PUBLIC_KEY environment variable is required")
	}

	log.Printf("🔑 Using wallet: %s\n", senderPubKey)
	log.Printf("📤 Sending %.9f SOL to %s\n", *amount, *recipientAddr)

	// Prepare the transfer
	unsignedTx, err := walletService.PrepareTransfer(
		context.Background(),
		senderPubKey,
		*recipientAddr,
		"", // empty token mint for SOL transfers
		*amount,
	)
	if err != nil {
		return fmt.Errorf("failed to prepare transfer: %w", err)
	}

	// Submit the transfer
	txHash, err := walletService.SubmitTransfer(context.Background(), unsignedTx)
	if err != nil {
		return fmt.Errorf("failed to submit transfer: %w", err)
	}

	log.Printf("✅ Transaction sent! Hash: %s\n", txHash)
	return nil
}
