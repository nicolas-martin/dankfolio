package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
)

const (
	// Token addresses
	aniMint  = "9tqjeRS1swj36Ee5C1iGiwAxjQJNGAVCzaTLwFY8bonk" // ANI token
	bonkMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK token
	solMint  = "So11111111111111111111111111111111111111112" // Wrapped SOL
	
	jupiterQuoteURL = "https://lite-api.jup.ag/swap/v1/quote"
	jupiterSwapURL  = "https://lite-api.jup.ag/swap/v1/swap"
)

type QuoteResponse struct {
	InputMint            string `json:"inputMint"`
	InAmount             string `json:"inAmount"`
	OutputMint           string `json:"outputMint"`
	OutAmount            string `json:"outAmount"`
	OtherAmountThreshold string `json:"otherAmountThreshold"`
	SwapMode             string `json:"swapMode"`
	SlippageBps          int    `json:"slippageBps"`
	PriceImpactPct       string `json:"priceImpactPct"`
	RoutePlan            []struct {
		SwapInfo struct {
			AmmKey     string `json:"ammKey"`
			Label      string `json:"label"`
			InputMint  string `json:"inputMint"`
			OutputMint string `json:"outputMint"`
			InAmount   string `json:"inAmount"`
			OutAmount  string `json:"outAmount"`
			FeeAmount  string `json:"feeAmount"`
			FeeMint    string `json:"feeMint"`
		} `json:"swapInfo"`
		Percent int `json:"percent"`
	} `json:"routePlan"`
}

type SwapRequest struct {
	QuoteResponse             json.RawMessage `json:"quoteResponse"`
	UserPublicKey             string          `json:"userPublicKey"`
	DynamicComputeUnitLimit   bool            `json:"dynamicComputeUnitLimit"`
	PrioritizationFeeLamports int             `json:"prioritizationFeeLamports"`
}

type SwapResponse struct {
	SwapTransaction           string      `json:"swapTransaction"`
	LastValidBlockHeight      int         `json:"lastValidBlockHeight"`
	PrioritizationFeeLamports int         `json:"prioritizationFeeLamports"`
	ComputeUnitLimit          int         `json:"computeUnitLimit"`
	SimulationError           interface{} `json:"simulationError"`
}

func main() {
	fmt.Println("=== Testing ANI → BONK Swap ===")
	fmt.Println("Investigating Jupiter program panic issue\n")

	// Load environment from frontend .env file
	if err := godotenv.Load("../frontend/.env"); err != nil {
		log.Printf("Warning: Could not load frontend .env: %v", err)
	}

	// Get private key from environment
	privateKeyStr := os.Getenv("TEST_PRIVATE_KEY")
	if privateKeyStr == "" {
		log.Fatal("TEST_PRIVATE_KEY not found in environment. Please set it in frontend/.env")
	}

	// Decode private key from base64
	privateKeyBytes, err := base64.StdEncoding.DecodeString(privateKeyStr)
	if err != nil {
		log.Fatalf("Failed to decode private key: %v", err)
	}

	account := solana.PrivateKey(privateKeyBytes)
	publicKey := account.PublicKey()

	fmt.Printf("Wallet: %s\n\n", publicKey.String())

	// Create RPC client
	rpcEndpoint := os.Getenv("REACT_APP_SOLANA_RPC_ENDPOINT")
	if rpcEndpoint == "" {
		rpcEndpoint = "https://api.mainnet-beta.solana.com"
	}
	rpcClient := rpc.New(rpcEndpoint)

	// Check SOL balance
	fmt.Println("1. Checking balances...")
	solBalance, err := rpcClient.GetBalance(context.Background(), publicKey, rpc.CommitmentFinalized)
	if err != nil {
		log.Fatalf("Failed to get SOL balance: %v", err)
	}
	fmt.Printf("   SOL Balance: %.9f SOL\n", float64(solBalance.Value)/1e9)

	ctx := context.Background()
	client := &http.Client{Timeout: 30 * time.Second}

	// Test 1: Try direct quote first
	fmt.Println("\n--- Test 1: Direct Quote (onlyDirectRoutes=true) ---")
	testQuote(ctx, client, aniMint, bonkMint, "1000000", true) // 1 ANI (6 decimals)

	// Test 2: Try multi-hop quote
	fmt.Println("\n--- Test 2: Multi-hop Quote (onlyDirectRoutes=false) ---")
	testQuote(ctx, client, aniMint, bonkMint, "1000000", false)

	// Test 3: Try smaller amount
	fmt.Println("\n--- Test 3: Smaller Amount (0.1 ANI) ---")
	testQuote(ctx, client, aniMint, bonkMint, "100000", false)

	// Test 4: Try ANI → SOL → BONK manually
	fmt.Println("\n--- Test 4: Manual Route Test (ANI → SOL → BONK) ---")
	// First leg: ANI → SOL
	quote1, err := testQuote(ctx, client, aniMint, solMint, "1000000", false)
	if err == nil && quote1 != nil {
		// Second leg: SOL → BONK
		testQuote(ctx, client, solMint, bonkMint, quote1.OutAmount, false)
	}

	// Test 5: Try with different slippage
	fmt.Println("\n--- Test 5: Higher Slippage (5%) ---")
	testQuoteWithSlippage(ctx, client, aniMint, bonkMint, "1000000", false, 500)

	// Test 6: Try actual swap if user confirms
	fmt.Println("\n--- Test 6: Execute Swap Test ---")
	quote, err := getQuote(ctx, client, aniMint, bonkMint, "1000000", false, 100)
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
		executeSwap(ctx, rpcClient, client, account, publicKey, quote)
	}
}

func testQuote(ctx context.Context, client *http.Client, from, to, amount string, directOnly bool) (*QuoteResponse, error) {
	return testQuoteWithSlippage(ctx, client, from, to, amount, directOnly, 100)
}

func testQuoteWithSlippage(ctx context.Context, client *http.Client, from, to, amount string, directOnly bool, slippageBps int) (*QuoteResponse, error) {
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

func getQuote(ctx context.Context, client *http.Client, from, to, amount string, directOnly bool, slippageBps int) (*QuoteResponse, error) {
	quoteURL := fmt.Sprintf(
		"%s?inputMint=%s&outputMint=%s&amount=%s&slippageBps=%d&onlyDirectRoutes=%s",
		jupiterQuoteURL, from, to, amount, slippageBps, fmt.Sprintf("%t", directOnly),
	)

	resp, err := client.Get(quoteURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get quote: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("quote request failed (status %d): %s", resp.StatusCode, string(body))
	}

	var quoteResp QuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		return nil, fmt.Errorf("failed to decode quote: %w", err)
	}

	return &quoteResp, nil
}

func executeSwap(ctx context.Context, rpcClient *rpc.Client, httpClient *http.Client, account solana.PrivateKey, publicKey solana.PublicKey, quote *QuoteResponse) {
	fmt.Println("\nCreating swap transaction...")
	
	// Prepare swap transaction
	quoteJSON, _ := json.Marshal(quote)
	swapReq := SwapRequest{
		QuoteResponse:             quoteJSON,
		UserPublicKey:             publicKey.String(),
		DynamicComputeUnitLimit:   true,
		PrioritizationFeeLamports: 100000, // 0.0001 SOL priority fee
	}

	swapJSON, _ := json.Marshal(swapReq)
	swapResp, err := httpClient.Post(jupiterSwapURL, "application/json", bytes.NewBuffer(swapJSON))
	if err != nil {
		fmt.Printf("❌ Failed to get swap transaction: %v\n", err)
		return
	}
	defer swapResp.Body.Close()

	swapBody, _ := io.ReadAll(swapResp.Body)
	
	var swap SwapResponse
	if err := json.Unmarshal(swapBody, &swap); err != nil {
		fmt.Printf("❌ Failed to decode swap response: %v\nBody: %s\n", err, string(swapBody))
		return
	}

	if swap.SimulationError != nil {
		fmt.Printf("❌ Simulation error: %v\n", swap.SimulationError)
		fmt.Println("\nThis might be because:")
		fmt.Println("   - Wallet doesn't have ANI tokens")
		fmt.Println("   - Insufficient SOL for fees")
		fmt.Println("   - Need to create token accounts")
		return
	}

	if swap.SwapTransaction == "" {
		fmt.Printf("❌ No swap transaction returned. Response: %s\n", string(swapBody))
		return
	}

	fmt.Printf("✅ Transaction prepared:\n")
	fmt.Printf("   Compute Units: %d\n", swap.ComputeUnitLimit)
	fmt.Printf("   Priority Fee: %d lamports (%.6f SOL)\n", 
		swap.PrioritizationFeeLamports, float64(swap.PrioritizationFeeLamports)/1e9)

	// Decode and sign transaction
	fmt.Println("\nSigning transaction...")
	
	txBytes, err := base64.StdEncoding.DecodeString(swap.SwapTransaction)
	if err != nil {
		fmt.Printf("❌ Failed to decode transaction: %v\n", err)
		return
	}

	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		fmt.Printf("❌ Failed to parse transaction: %v\n", err)
		return
	}

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(publicKey) {
			return &account
		}
		return nil
	})
	if err != nil {
		fmt.Printf("❌ Failed to sign transaction: %v\n", err)
		return
	}

	fmt.Println("✅ Transaction signed")

	// Send transaction
	fmt.Printf("\nSending transaction (swapping 1 ANI for BONK)...\n")

	sig, err := rpcClient.SendTransaction(context.Background(), tx)
	if err != nil {
		fmt.Printf("❌ Failed to send transaction: %v\n", err)
		
		// Log the full error for debugging
		fmt.Printf("   Full error: %+v\n", err)
		
		fmt.Println("\nCommon reasons:")
		fmt.Println("   - Insufficient ANI balance")
		fmt.Println("   - Insufficient SOL for fees")
		fmt.Println("   - Slippage too low")
		fmt.Println("   - Jupiter program issue")
		return
	}

	fmt.Printf("✅ Transaction sent!\n")
	fmt.Printf("   Signature: %s\n", sig)
	fmt.Printf("   Explorer: https://solscan.io/tx/%s\n", sig)

	// Wait for confirmation
	fmt.Println("\nWaiting for confirmation...")
	
	ctxTimeout, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	confirmed := false
	for !confirmed {
		select {
		case <-ctxTimeout.Done():
			fmt.Println("⚠️  Timeout waiting for confirmation")
			return
		case <-time.After(2 * time.Second):
			status, err := rpcClient.GetSignatureStatuses(ctxTimeout, true, sig)
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

func getRouteNames(routes []struct {
	SwapInfo struct {
		AmmKey     string `json:"ammKey"`
		Label      string `json:"label"`
		InputMint  string `json:"inputMint"`
		OutputMint string `json:"outputMint"`
		InAmount   string `json:"inAmount"`
		OutAmount  string `json:"outAmount"`
		FeeAmount  string `json:"feeAmount"`
		FeeMint    string `json:"feeMint"`
	} `json:"swapInfo"`
	Percent int `json:"percent"`
}) []string {
	names := make([]string, len(routes))
	for i, route := range routes {
		names[i] = route.SwapInfo.Label
	}
	return names
}

func formatAmount(amount string, decimals int) string {
	// Simple formatting for display
	if len(amount) <= decimals {
		return "0." + strings.Repeat("0", decimals-len(amount)) + amount
	}
	intPart := amount[:len(amount)-decimals]
	decPart := amount[len(amount)-decimals:]
	return intPart + "." + decPart
}