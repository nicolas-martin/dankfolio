package main

import (
	"context"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	gagliardettorpc "github.com/gagliardetto/solana-go/rpc" // Alias to avoid collision with local rpc
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	dankfolioSolanaClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana" // Added alias for our solana client
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

func main() {
	// Parse command line flags
	rpcEndpoint := flag.String("rpc", "https://api.mainnet-beta.solana.com", "Solana RPC endpoint")
	walletPath := flag.String("wallet", "", "Path to wallet keypair file")
	toAddress := flag.String("to", "", "Destination wallet address")
	amount := flag.Float64("amount", 0, "Amount to send")
	coinMint := flag.String("coin", "", "Coin mint address (empty for SOL)")
	flag.Parse()

	// Validate required flags
	if *walletPath == "" || *toAddress == "" || *amount <= 0 {
		fmt.Println("Error: wallet path, destination address, and amount are required")
		flag.Usage()
		os.Exit(1)
	}

	// Initialize RPC client
	client := gagliardettorpc.New(*rpcEndpoint) // Use aliased rpc

	// Initialize HTTP client and Jupiter client using environment variables
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}
	// Create API tracker

	jupiterClient := jupiter.NewClient(httpClient, os.Getenv("JUPITER_API_URL"), os.Getenv("JUPITER_API_KEY"), nil)
	solanaInfraClient := dankfolioSolanaClient.NewClient(client, nil) // Use aliased package

	// Initialize coin service using environment variables like main API
	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:        os.Getenv("BIRDEYE_ENDPOINT"),
		BirdEyeAPIKey:         os.Getenv("BIRDEYE_API_KEY"),
		SolanaRPCEndpoint:     *rpcEndpoint,
		NewCoinsFetchInterval: time.Hour, // Default for this utility
	}
	// Provide nil for currently unneeded dependencies in this cmd tool
	coinService := coin.NewService(coinServiceConfig, jupiterClient, nil, solanaInfraClient, nil, nil, nil, nil)

	// Initialize the wallet service
	walletService := wallet.New(solanaInfraClient, nil, coinService)

	// Read and parse the wallet file
	keyBytes, err := os.ReadFile(*walletPath)
	if err != nil {
		log.Fatalf("Error reading wallet file: %v", err)
	}

	// Remove quotes if present
	keyStr := strings.Trim(string(keyBytes), "\"")

	// Parse the private key
	privateKey := solana.MustPrivateKeyFromBase58(keyStr)
	publicKey := privateKey.PublicKey()

	fmt.Printf("Sending from wallet: %s\n", publicKey.String())

	// Prepare the transfer
	unsignedTx, err := walletService.PrepareTransfer(context.Background(), publicKey.String(), *toAddress, *coinMint, *amount)
	if err != nil {
		log.Fatalf("Error preparing transfer: %v", err)
	}

	// Decode the unsigned transaction
	txBytes, err := base64.StdEncoding.DecodeString(unsignedTx)
	if err != nil {
		log.Fatalf("Error decoding transaction: %v", err)
	}

	// Parse the transaction
	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		log.Fatalf("Error parsing transaction: %v", err)
	}

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(privateKey.PublicKey()) {
			return &privateKey
		}
		return nil
	})
	if err != nil {
		log.Fatalf("Error signing transaction: %v", err)
	}

	// Serialize the signed transaction
	signedTx, err := tx.MarshalBinary()
	if err != nil {
		log.Fatalf("Error serializing signed transaction: %v", err)
	}

	transferReq := &wallet.TransferRequest{SignedTransaction: base64.StdEncoding.EncodeToString(signedTx), UnsignedTransaction: unsignedTx}

	// Submit the transfer
	txHash, err := walletService.SubmitTransfer(context.Background(), transferReq)
	if err != nil {
		log.Fatalf("Error submitting transfer: %v", err)
	}

	fmt.Printf("Transfer submitted successfully. Transaction hash: %s\n", txHash)
}
