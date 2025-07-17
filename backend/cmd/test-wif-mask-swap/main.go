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
	// Tokens from your wallet
	WIFMint  = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
	MASKMint = "6MQpbiTC2YcogidTmKqMLK82qvE9z5QEm7EP3AEDpump"
	
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
	fmt.Println("=== WIF → MASK Real Swap Test ===")
	fmt.Println("Using Jupiter API directly with onlyDirectRoutes=false\n")

	// Load environment
	if err := godotenv.Load("../frontend/.env"); err != nil {
		log.Printf("Warning: Could not load frontend .env: %v", err)
	}

	// Get private key
	privateKeyStr := os.Getenv("TEST_PRIVATE_KEY")
	if privateKeyStr == "" {
		log.Fatal("TEST_PRIVATE_KEY not found in environment")
	}

	// Decode private key
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

	// Amount to swap: 0.001 WIF (very small amount for testing)
	swapAmount := "1000" // 0.001 WIF (6 decimals)
	
	fmt.Printf("\n2. Getting quote for 0.001 WIF → MASK (multi-hop allowed)...\n")

	// Get quote with onlyDirectRoutes=false
	client := &http.Client{Timeout: 30 * time.Second}
	quoteURL := fmt.Sprintf(
		"%s?inputMint=%s&outputMint=%s&amount=%s&slippageBps=%d&onlyDirectRoutes=%s",
		jupiterQuoteURL, WIFMint, MASKMint, swapAmount, 100, "false",
	)

	resp, err := client.Get(quoteURL)
	if err != nil {
		log.Fatalf("Failed to get quote: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		log.Fatalf("Failed to get quote (status %d): %s", resp.StatusCode, string(body))
	}

	var quoteResp QuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		log.Fatalf("Failed to decode quote: %v", err)
	}

	fmt.Printf("   ✅ Quote received:\n")
	fmt.Printf("      Input: %s WIF (0.001 WIF)\n", quoteResp.InAmount)
	fmt.Printf("      Output: %s MASK\n", quoteResp.OutAmount)
	fmt.Printf("      Price Impact: %s%%\n", quoteResp.PriceImpactPct)
	fmt.Printf("      Routes (%d hops):\n", len(quoteResp.RoutePlan))
	
	var routeNames []string
	for i, route := range quoteResp.RoutePlan {
		fmt.Printf("        %d. %s\n", i+1, route.SwapInfo.Label)
		routeNames = append(routeNames, route.SwapInfo.Label)
	}
	fmt.Printf("      Route: %s\n", strings.Join(routeNames, " → "))

	// Prepare swap transaction
	fmt.Println("\n3. Preparing swap transaction...")
	
	quoteJSON, _ := json.Marshal(quoteResp)
	swapReq := SwapRequest{
		QuoteResponse:             quoteJSON,
		UserPublicKey:             publicKey.String(),
		DynamicComputeUnitLimit:   true,
		PrioritizationFeeLamports: 100000, // 0.0001 SOL priority fee
	}

	swapJSON, _ := json.Marshal(swapReq)
	swapResp, err := client.Post(jupiterSwapURL, "application/json", bytes.NewBuffer(swapJSON))
	if err != nil {
		log.Fatalf("Failed to get swap transaction: %v", err)
	}
	defer swapResp.Body.Close()

	swapBody, _ := io.ReadAll(swapResp.Body)
	
	var swap SwapResponse
	if err := json.Unmarshal(swapBody, &swap); err != nil {
		log.Fatalf("Failed to decode swap response: %v\nBody: %s", err, string(swapBody))
	}

	if swap.SimulationError != nil {
		fmt.Printf("   ⚠️  Simulation error: %v\n", swap.SimulationError)
		fmt.Println("\n   This might be because:")
		fmt.Println("   - Wallet doesn't have WIF tokens")
		fmt.Println("   - Insufficient SOL for fees")
		fmt.Println("   - Need to create token accounts")
		return
	}

	if swap.SwapTransaction == "" {
		log.Fatalf("No swap transaction returned. Response: %s", string(swapBody))
	}

	fmt.Printf("   ✅ Transaction prepared:\n")
	fmt.Printf("      Compute Units: %d\n", swap.ComputeUnitLimit)
	fmt.Printf("      Priority Fee: %d lamports (%.6f SOL)\n", 
		swap.PrioritizationFeeLamports, float64(swap.PrioritizationFeeLamports)/1e9)

	// Decode and sign transaction
	fmt.Println("\n4. Signing transaction...")
	
	txBytes, err := base64.StdEncoding.DecodeString(swap.SwapTransaction)
	if err != nil {
		log.Fatalf("Failed to decode transaction: %v", err)
	}

	tx, err := solana.TransactionFromBytes(txBytes)
	if err != nil {
		log.Fatalf("Failed to parse transaction: %v", err)
	}

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(publicKey) {
			return &account
		}
		return nil
	})
	if err != nil {
		log.Fatalf("Failed to sign transaction: %v", err)
	}

	fmt.Println("   ✅ Transaction signed")

	// Send transaction
	fmt.Printf("\n5. Sending transaction (swapping 0.001 WIF for MASK)...\n")

	sig, err := rpcClient.SendTransaction(context.Background(), tx)
	if err != nil {
		fmt.Printf("   ❌ Failed to send transaction: %v\n", err)
		fmt.Println("\n   Common reasons:")
		fmt.Println("   - Insufficient WIF balance")
		fmt.Println("   - Insufficient SOL for fees")
		fmt.Println("   - Slippage too low")
		return
	}

	fmt.Printf("   ✅ Transaction sent!\n")
	fmt.Printf("      Signature: %s\n", sig)
	fmt.Printf("      Explorer: https://solscan.io/tx/%s\n", sig)

	// Wait for confirmation
	fmt.Println("\n6. Waiting for confirmation...")
	
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	confirmed := false
	for !confirmed {
		select {
		case <-ctx.Done():
			fmt.Println("   ⚠️  Timeout waiting for confirmation")
			return
		case <-time.After(2 * time.Second):
			status, err := rpcClient.GetSignatureStatuses(ctx, true, sig)
			if err != nil {
				continue
			}

			if len(status.Value) > 0 && status.Value[0] != nil {
				if status.Value[0].Err != nil {
					fmt.Printf("   ❌ Transaction failed: %v\n", status.Value[0].Err)
					return
				}
				if status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusFinalized ||
				   status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusConfirmed {
					confirmed = true
					fmt.Printf("   ✅ Transaction %s!\n", status.Value[0].ConfirmationStatus)
				}
			}
		}
	}

	fmt.Println("\n🎉 WIF → MASK swap completed successfully!")
	fmt.Println("   - Multi-hop routing worked as expected")
	fmt.Println("   - Transaction executed on mainnet")
	fmt.Printf("   - View on explorer: https://solscan.io/tx/%s\n", sig)
}