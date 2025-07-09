package main

import (
	"context"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gagliardetto/solana-go"
	gagliardettorpc "github.com/gagliardetto/solana-go/rpc" // Alias to avoid collision with local rpc
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	dankfolioSolanaClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana" // Added alias for our solana client
	trackerClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint string `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey   string `envconfig:"SOLANA_RPC_API_KEY"`
	DBURL             string `envconfig:"DB_URL" required:"true"`
	Env               string `envconfig:"APP_ENV" required:"true"`
	JupiterApiUrl     string `envconfig:"JUPITER_API_URL" required:"true"`
	JupiterApiKey     string `envconfig:"JUPITER_API_KEY" required:"true"`
	BirdEyeEndpoint   string `envconfig:"BIRDEYE_ENDPOINT" required:"true"`
	BirdEyeAPIKey     string `envconfig:"BIRDEYE_API_KEY" required:"true"`
}

func loadConfig() *Config {
	// Load environment variables from .env file (try to load it always for the command)
	if err := godotenv.Load("../../.env"); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		log.Fatalf("Error processing environment variables: %v", err)
	}

	return &cfg
}

func main() {
	// Load configuration
	config := loadConfig()

	// Parse command line flags
	rpcEndpoint := flag.String("rpc", config.SolanaRPCEndpoint, "Solana RPC endpoint")
	privateKeyStr := flag.String("private-key", "", "Private key in base58 format")
	toAddress := flag.String("to", "", "Destination wallet address")
	amount := flag.Float64("amount", 0, "Amount to send")
	coinMint := flag.String("coin", "", "Coin mint address (empty for SOL)")
	flag.Parse()

	// Validate required flags
	if *privateKeyStr == "" || *toAddress == "" || *amount <= 0 {
		fmt.Println("Error: private key, destination address, and amount are required")
		flag.Usage()
		os.Exit(1)
	}

	// Initialize database store
	store, err := postgres.NewStore(config.DBURL, true, slog.LevelInfo, config.Env)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize RPC client
	client := gagliardettorpc.New(*rpcEndpoint) // Use aliased rpc

	// Initialize HTTP client and clients
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Initialize API tracker
	apiTracker := trackerClient.NewAPICallTracker(store, slog.Default())

	// Initialize clients
	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey, apiTracker)
	solanaInfraClient := dankfolioSolanaClient.NewClient(client, apiTracker)
	birdeyeClient := birdeye.NewClient(httpClient, config.BirdEyeEndpoint, config.BirdEyeAPIKey, apiTracker)

	// Initialize coin service with proper dependencies
	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:        config.BirdEyeEndpoint,
		BirdEyeAPIKey:         config.BirdEyeAPIKey,
		SolanaRPCEndpoint:     *rpcEndpoint,
		NewCoinsFetchInterval: time.Hour, // Default for this utility
	}
	coinService := coin.NewService(coinServiceConfig, jupiterClient, store, solanaInfraClient, birdeyeClient, apiTracker, nil, nil)

	// Initialize the wallet service
	walletService := wallet.New(solanaInfraClient, store, coinService)

	// Parse the private key directly from command line input
	privateKey, err := solana.PrivateKeyFromBase58(*privateKeyStr)
	if err != nil {
		log.Fatalf("Error parsing private key: %v", err)
	}
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
