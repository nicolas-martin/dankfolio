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
	"github.com/olekukonko/tablewriter"
)

type WalletInfo struct {
	Path      string
	PublicKey string
	Tokens    []wallet.TokenInfo
}

func checkBalance(ctx context.Context, walletService *wallet.Service, keyPath string) (*WalletInfo, error) {
	fmt.Printf("\nChecking balance for: %s\n", keyPath)

	keypair, err := solana.PrivateKeyFromSolanaKeygenFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse keypair: %v", err)
	}

	// Get token balances
	walletBalance, err := walletService.GetTokens(ctx, keypair.PublicKey().String())
	if err != nil {
		return nil, fmt.Errorf("failed to get token balances: %v", err)
	}
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Token", "Address", "Balance", "Price", "($)"})

	fmt.Printf("Public Key: %s\n", keypair.PublicKey())

	for _, token := range walletBalance.Tokens {
		table.Append([]string{token.Symbol, token.ID, fmt.Sprintf("%f", token.Balance), fmt.Sprintf("%f", token.Price), fmt.Sprintf("%f", token.Value)})
	}

	table.Render()

	return &WalletInfo{
		Path:      keyPath,
		PublicKey: keypair.PublicKey().String(),
		Tokens:    walletBalance.Tokens,
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
	info, err := checkBalance(ctx, walletService, absPath)
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
