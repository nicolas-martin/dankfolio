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
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/internal/service/wallet"
)

type WalletInfo struct {
	Path      string
	PublicKey string
	Balance   uint64
	Tokens    []wallet.TokenInfo
}

func checkBalance(ctx context.Context, client *rpc.Client, walletService *wallet.Service, keyPath string) (*WalletInfo, error) {
	fmt.Printf("\nChecking balance for: %s\n", keyPath)

	keypair, err := solana.PrivateKeyFromSolanaKeygenFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse keypair: %v", err)
	}

	// Get SOL balance
	balance, err := client.GetBalance(
		ctx,
		keypair.PublicKey(),
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %v", err)
	}

	// Get token balances
	tokens, err := walletService.GetTokens(ctx, keypair.PublicKey().String())
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}

	fmt.Printf("Public Key: %s\n", keypair.PublicKey())
	fmt.Printf("SOL Balance: %.9f SOL\n", float64(balance.Value)/1e9)
	fmt.Printf("\nToken Balances:\n")
	fmt.Printf("%-20s %-40s %-12s %-15s %-15s\n", "Token", "Address", "Balance", "Price ($)", "Value ($)")
	fmt.Printf("%-20s %-40s %-12s %-15s %-15s\n", "-----", "-------", "-------", "---------", "---------")

	for _, token := range tokens {
		fmt.Printf("%-20s %-40s %-12.4f $%-14.4f $%-14.2f\n",
			token.Symbol,
			token.ID,
			token.Balance,
			token.Price,
			token.Value,
		)
	}

	return &WalletInfo{
		Path:      keyPath,
		PublicKey: keypair.PublicKey().String(),
		Balance:   balance.Value,
		Tokens:    tokens,
	}, nil
}

func main() {
	// Get the current working directory for finding files
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	projectRoot := filepath.Join(wd, "../..")

	// Load environment variables from project root
	if err := godotenv.Load(filepath.Join(projectRoot, ".env")); err != nil {
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
	info, err := checkBalance(ctx, client, walletService, absPath)
	if err != nil {
		log.Fatalf("Error checking wallet balance: %v", err)
	}

	if info != nil {
		// Calculate total portfolio value in USD
		var totalValue float64
		for _, token := range info.Tokens {
			totalValue += token.Value
		}

		fmt.Printf("\nPortfolio Summary:\n")
		fmt.Printf("Total Value: $%.2f\n", totalValue)
		fmt.Printf("\nToken Distribution:\n")
		for _, token := range info.Tokens {
			fmt.Printf("%-20s %.2f%%\n", token.Symbol, token.Percentage)
		}
	} else {
		fmt.Println("No valid wallet found")
	}
}
