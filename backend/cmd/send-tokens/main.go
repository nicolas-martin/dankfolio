package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
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
	err := godotenv.Load("../../../frontend/.env")
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v\n", err)
	}

	// Hardcoded values
	recipientAddr := "6hbS1d1JRRta3GtJC7XNo16gg3PTb41QJVzy6kWsZnav"
	amount := 0.000000001
	tokenMint := "C3DwDjT17gDvvCYC2nsdGHxDHVmQRdhKfpAdqQ29pump"

	rpcURL := "https://api.mainnet-beta.solana.com"

	// Get private key from env
	privateKeyStr := os.Getenv("TEST_PRIVATE_KEY")
	if privateKeyStr == "" {
		return fmt.Errorf("TEST_PRIVATE_KEY environment variable is required")
	}

	// Decode base64 private key
	privateKeyBytes, err := base64.StdEncoding.DecodeString(privateKeyStr)
	if err != nil {
		return fmt.Errorf("failed to decode private key: %w", err)
	}

	// Convert to Solana private key
	privateKey := solana.PrivateKey(privateKeyBytes)

	// Get public key from private key
	senderPubKey := privateKey.PublicKey().String()

	// Initialize RPC client with consistent commitment
	rpcClient := rpc.New(rpcURL)

	// Create wallet service
	walletService := wallet.New(rpcClient)

	log.Printf("🔑 Using wallet: %s\n", senderPubKey)
	if tokenMint == "" {
		log.Printf("📤 Sending %.9f SOL to %s\n", amount, recipientAddr)
	} else {
		log.Printf("📤 Sending %.9f tokens (mint: %s) to %s\n", amount, tokenMint, recipientAddr)
	}

	// Get latest blockhash with confirmed commitment
	recent, err := rpcClient.GetLatestBlockhash(context.Background(), rpc.CommitmentConfirmed)
	if err != nil {
		return fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Prepare the transfer
	unsignedTx, err := walletService.PrepareTransfer(
		context.Background(),
		senderPubKey,
		recipientAddr,
		tokenMint,
		amount,
	)
	if err != nil {
		return fmt.Errorf("failed to prepare transfer: %w", err)
	}

	// Decode the unsigned transaction
	txBytes, err := base64.StdEncoding.DecodeString(unsignedTx)
	if err != nil {
		return fmt.Errorf("failed to decode transaction: %w", err)
	}

	// Parse the transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		return fmt.Errorf("failed to parse transaction: %w", err)
	}

	// Update transaction with fresh blockhash
	tx.Message.RecentBlockhash = recent.Value.Blockhash

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(privateKey.PublicKey()) {
			return &privateKey
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Serialize the signed transaction
	signedTx, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to serialize signed transaction: %w", err)
	}

	// Submit the transaction
	txHash, err := walletService.SubmitTransfer(
		context.Background(),
		base64.StdEncoding.EncodeToString(signedTx),
	)
	if err != nil {
		return fmt.Errorf("failed to submit transfer: %w", err)
	}

	log.Printf("✅ Transaction sent! Hash: %s\n", txHash)
	return nil
}
