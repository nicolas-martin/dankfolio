package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
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
	// Get the current working directory for finding files
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	projectRoot := filepath.Join(wd, "../..")

	// Load environment variables from project root
	if err = godotenv.Load(filepath.Join(projectRoot, ".env")); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	ctx := context.Background()
	client := rpc.New("https://api.mainnet-beta.solana.com")

	// Initialize services
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:    "https://public-api.birdeye.so",
		BirdEyeAPIKey:     os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey:   os.Getenv("COINGECKO_API_KEY"),
		TrendingTokenPath: filepath.Join(projectRoot, "cmd", "trending", "trending_tokens.json"),
	}

	jupiterClient := coin.NewJupiterClient()
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient)
	walletService := wallet.New(client, coinService)

	// Define wallet path
	walletPath := filepath.Join(projectRoot, "keys/mainnet-wallet-1.json")

	// Get absolute path
	absPath, err := filepath.Abs(walletPath)
	if err != nil {
		log.Fatalf("Error resolving path %s: %v", walletPath, err)
	}

	// Check wallet balance
	checkBalance(ctx, walletService, absPath)
}
