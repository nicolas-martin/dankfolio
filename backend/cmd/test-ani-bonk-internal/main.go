package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
)

const (
	// Token addresses
	aniMint  = "9tqjeRS1swj36Ee5C1iGiwAxjQJNGAVCzaTLwFY8bonk" // ANI token
	bonkMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK token
	solMint  = "So11111111111111111111111111111111111111112" // Wrapped SOL
)

func main() {
	fmt.Println("=== Testing ANI → BONK Swap (Internal Jupiter Client) ===")
	fmt.Println("Using internal Jupiter client package\n")

	// Load environment from .env file
	if err := godotenv.Load(); err != nil {
		// Try loading from frontend .env if backend .env doesn't exist
		if err := godotenv.Load("../frontend/.env"); err != nil {
			log.Printf("Warning: Could not load .env files: %v", err)
		}
	}

	// Get private key from environment
	privateKeyStr := os.Getenv("TEST_PRIVATE_KEY")
	if privateKeyStr == "" {
		log.Fatal("TEST_PRIVATE_KEY not found in environment. Please set it in .env")
	}

	// Decode private key from base64
	privateKeyBytes, err := base64.StdEncoding.DecodeString(privateKeyStr)
	if err != nil {
		log.Fatalf("Failed to decode private key: %v", err)
	}

	if len(privateKeyBytes) != 64 {
		log.Fatalf("Invalid private key length: %d", len(privateKeyBytes))
	}

	wallet := solana.PrivateKey(privateKeyBytes)
	walletPubkey := wallet.PublicKey()

	fmt.Printf("Wallet: %s\n\n", walletPubkey)

	// Get Jupiter config from environment
	jupiterAPIURL := os.Getenv("JUPITER_API_URL")
	if jupiterAPIURL == "" {
		jupiterAPIURL = "https://lite-api.jup.ag/swap/v1"
		log.Printf("JUPITER_API_URL not set, using default: %s", jupiterAPIURL)
	}
	
	jupiterAPIKey := os.Getenv("JUPITER_API_KEY")
	if jupiterAPIKey == "" {
		log.Printf("Warning: JUPITER_API_KEY not set, some features may be limited")
	}

	// Get Solana RPC endpoint
	solanaRPCEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	if solanaRPCEndpoint == "" {
		solanaRPCEndpoint = os.Getenv("REACT_APP_SOLANA_RPC_ENDPOINT")
		if solanaRPCEndpoint == "" {
			solanaRPCEndpoint = "https://api.mainnet-beta.solana.com"
		}
	}

	// Setup clients
	solanaClient := rpc.New(solanaRPCEndpoint)
	httpClient := &http.Client{Timeout: 30 * time.Second}
	jupiterClient := jupiter.NewClient(httpClient, jupiterAPIURL, jupiterAPIKey)

	// Check SOL balance
	fmt.Println("1. Checking balances...")
	solBalance, err := solanaClient.GetBalance(context.Background(), walletPubkey, rpc.CommitmentFinalized)
	if err != nil {
		log.Fatalf("Failed to get SOL balance: %v", err)
	}
	fmt.Printf("   SOL Balance: %.9f SOL\n", float64(solBalance.Value)/1e9)

	ctx := context.Background()

	// Test 1: Try direct quote first
	fmt.Println("\n--- Test 1: Direct Quote (onlyDirectRoutes=true) ---")
	testQuote(ctx, jupiterClient, aniMint, bonkMint, "1000000", true) // 1 ANI (6 decimals)

	// Test 2: Try multi-hop quote
	fmt.Println("\n--- Test 2: Multi-hop Quote (onlyDirectRoutes=false) ---")
	testQuote(ctx, jupiterClient, aniMint, bonkMint, "1000000", false)

	// Test 3: Try smaller amount
	fmt.Println("\n--- Test 3: Smaller Amount (0.1 ANI) ---")
	testQuote(ctx, jupiterClient, aniMint, bonkMint, "100000", false)

	// Test 4: Try ANI → SOL → BONK manually
	fmt.Println("\n--- Test 4: Manual Route Test (ANI → SOL → BONK) ---")
	// First leg: ANI → SOL
	quote1, err := testQuote(ctx, jupiterClient, aniMint, solMint, "1000000", false)
	if err == nil && quote1 != nil {
		// Second leg: SOL → BONK
		testQuote(ctx, jupiterClient, solMint, bonkMint, quote1.OutAmount, false)
	}

	// Test 5: Try with different slippage
	fmt.Println("\n--- Test 5: Higher Slippage (5%) ---")
	testQuoteWithSlippage(ctx, jupiterClient, aniMint, bonkMint, "1000000", false, 500)

	// Test 6: Try actual swap if user confirms
	fmt.Println("\n--- Test 6: Execute Swap Test ---")
	quote, err := getQuote(ctx, jupiterClient, aniMint, bonkMint, "1000000", false, 100)
	if err != nil {
		fmt.Printf("❌ Cannot proceed with swap: %v\n", err)
		return
	}

	fmt.Printf("\nReady to swap:\n")
	fmt.Printf("  From: 1 ANI\n")
	fmt.Printf("  To: %s BONK\n", formatAmount(quote.OutAmount, 5))
	fmt.Printf("  Price impact: %s%%\n", quote.PriceImpactPct)
	fmt.Printf("  Route: %v\n", getRouteNames(quote.RoutePlan))
	
	fmt.Print("\nExecute swap? (y/n): ")
	var confirm string
	fmt.Scanln(&confirm)
	
	if confirm == "y" || confirm == "Y" {
		executeSwap(ctx, solanaClient, jupiterClient, wallet, quote)
	}
}

func testQuote(ctx context.Context, client jupiter.ClientAPI, from, to, amount string, directOnly bool) (*jupiter.QuoteResponse, error) {
	return testQuoteWithSlippage(ctx, client, from, to, amount, directOnly, 100)
}

func testQuoteWithSlippage(ctx context.Context, client jupiter.ClientAPI, from, to, amount string, directOnly bool, slippageBps int) (*jupiter.QuoteResponse, error) {
	quote, err := getQuote(ctx, client, from, to, amount, directOnly, slippageBps)
	if err != nil {
		fmt.Printf("❌ Quote failed: %v\n", err)
		return nil, err
	}

	fmt.Printf("✅ Quote successful!\n")
	fmt.Printf("   Input: %s\n", formatAmount(quote.InAmount, 6))
	fmt.Printf("   Output: %s\n", formatAmount(quote.OutAmount, 5))
	fmt.Printf("   Price impact: %s%%\n", quote.PriceImpactPct)
	fmt.Printf("   Route (%d hops): %v\n", len(quote.RoutePlan), getRouteNames(quote.RoutePlan))
	
	return quote, nil
}

func getQuote(ctx context.Context, client jupiter.ClientAPI, from, to, amount string, directOnly bool, slippageBps int) (*jupiter.QuoteResponse, error) {
	params := jupiter.QuoteParams{
		InputMint:        from,
		OutputMint:       to,
		Amount:           amount,
		SlippageBps:      slippageBps,
		OnlyDirectRoutes: directOnly,
		SwapMode:         "ExactIn",
	}

	return client.GetQuote(ctx, params)
}

func executeSwap(ctx context.Context, solanaClient *rpc.Client, jupiterClient jupiter.ClientAPI, wallet solana.PrivateKey, quote *jupiter.QuoteResponse) {
	fmt.Println("\nCreating swap transaction...")
	
	// Get swap transaction
	swapResp, err := jupiterClient.CreateSwapTransaction(ctx, quote.RawPayload, wallet.PublicKey(), "")
	if err != nil {
		fmt.Printf("❌ Failed to create swap transaction: %v\n", err)
		return
	}

	// Decode and sign transaction
	txBytes, err := base64.StdEncoding.DecodeString(swapResp.SwapTransaction)
	if err != nil {
		fmt.Printf("❌ Failed to decode transaction: %v\n", err)
		return
	}

	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		fmt.Printf("❌ Failed to parse transaction: %v\n", err)
		return
	}

	// Get recent blockhash
	recent, err := solanaClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		fmt.Printf("❌ Failed to get blockhash: %v\n", err)
		return
	}

	tx.Message.RecentBlockhash = recent.Value.Blockhash

	// Sign transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(wallet.PublicKey()) {
			return &wallet
		}
		return nil
	})
	if err != nil {
		fmt.Printf("❌ Failed to sign transaction: %v\n", err)
		return
	}

	// Send transaction
	fmt.Println("Sending transaction...")
	sig, err := solanaClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		fmt.Printf("❌ Transaction failed: %v\n", err)
		fmt.Printf("   Full error: %+v\n", err)
		return
	}

	fmt.Printf("✅ Transaction sent! Signature: %s\n", sig)
	fmt.Printf("   View on Solscan: https://solscan.io/tx/%s\n", sig)

	// Wait for confirmation
	fmt.Println("\nWaiting for confirmation...")
	ctxTimeout, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	confirmed := false
	for !confirmed {
		select {
		case <-ctxTimeout.Done():
			fmt.Println("⚠️  Timeout waiting for confirmation")
			return
		case <-time.After(2 * time.Second):
			status, err := solanaClient.GetSignatureStatuses(ctxTimeout, true, sig)
			if err != nil {
				continue
			}

			if len(status.Value) > 0 && status.Value[0] != nil {
				if status.Value[0].Err != nil {
					fmt.Printf("❌ Transaction failed: %v\n", status.Value[0].Err)
					return
				}
				if status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusFinalized ||
				   status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusConfirmed {
					confirmed = true
					fmt.Printf("✅ Transaction %s!\n", status.Value[0].ConfirmationStatus)
				}
			}
		}
	}

	fmt.Println("\n🎉 ANI → BONK swap completed successfully!")
}

func getRouteNames(routes []jupiter.RoutePlan) []string {
	names := make([]string, len(routes))
	for i, route := range routes {
		names[i] = route.SwapInfo.Label
	}
	return names
}

func formatAmount(amount string, decimals int) string {
	val, _ := strconv.ParseFloat(amount, 64)
	divisor := math.Pow(10, float64(decimals))
	return fmt.Sprintf("%.6f", val/divisor)
}