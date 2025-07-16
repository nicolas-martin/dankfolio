package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

const (
	// Test with BONK -> WIF swap
	BONKMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
	WIFMint  = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
	
	// Use public Jupiter API endpoints
	jupiterQuoteURL = "https://quote-api.jup.ag/v6/quote"
	jupiterSwapURL  = "https://quote-api.jup.ag/v6/swap"
)

type QuoteResponse struct {
	InputMint            string       `json:"inputMint"`
	OutputMint           string       `json:"outputMint"`
	InAmount             string       `json:"inAmount"`
	OutAmount            string       `json:"outAmount"`
	OtherAmountThreshold string       `json:"otherAmountThreshold"`
	SwapMode             string       `json:"swapMode"`
	SlippageBps          int          `json:"slippageBps"`
	PriceImpactPct       string       `json:"priceImpactPct"`
	RoutePlan            []RoutePlan  `json:"routePlan"`
	Error                string       `json:"error,omitempty"`
}

type RoutePlan struct {
	SwapInfo struct {
		Label     string `json:"label"`
		FeeMint   string `json:"feeMint"`
		FeeAmount string `json:"feeAmount"`
	} `json:"swapInfo"`
}

type SwapRequest struct {
	QuoteResponse    json.RawMessage `json:"quoteResponse"`
	UserPublicKey    string          `json:"userPublicKey"`
	DynamicSlippage  bool            `json:"dynamicSlippage"`
}

func main() {
	fmt.Println("=== Testing Meme-to-Meme Swap with onlyDirectRoutes ===")
	fmt.Printf("From: BONK (%s)\n", BONKMint)
	fmt.Printf("To: WIF (%s)\n", WIFMint)
	fmt.Println()

	// Test different amounts to see liquidity depth
	amounts := []string{"1000000000", "10000000000", "100000000000"} // 1k, 10k, 100k BONK
	
	for _, amount := range amounts {
		fmt.Printf("--- Testing with %s BONK ---\n", amount)
		
		// 1. Test with onlyDirectRoutes=true
		fmt.Println("\n1. Testing with onlyDirectRoutes=true:")
		testQuote(amount, true)
		
		// 2. Test without onlyDirectRoutes for comparison
		fmt.Println("\n2. Testing without onlyDirectRoutes (multi-hop allowed):")
		testQuote(amount, false)
		
		fmt.Println("\n" + strings.Repeat("-", 50) + "\n")
	}
}

func testQuote(amount string, onlyDirectRoutes bool) {
	// Build query parameters
	params := url.Values{}
	params.Set("inputMint", BONKMint)
	params.Set("outputMint", WIFMint)
	params.Set("amount", amount)
	params.Set("slippageBps", "50")
	if onlyDirectRoutes {
		params.Set("onlyDirectRoutes", "true")
	}
	
	fullURL := jupiterQuoteURL + "?" + params.Encode()
	
	resp, err := http.Get(fullURL)
	if err != nil {
		log.Printf("Error making request: %v", err)
		return
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response: %v", err)
		return
	}
	
	var quote QuoteResponse
	if err := json.Unmarshal(body, &quote); err != nil {
		log.Printf("Error unmarshaling response: %v", err)
		fmt.Printf("Raw response: %s\n", string(body))
		return
	}
	
	// Check for error in response
	if quote.Error != "" {
		fmt.Printf("❌ Quote Error: %s\n", quote.Error)
		return
	}
	
	// Check if we got a valid quote
	if quote.OutAmount == "" {
		fmt.Printf("❌ No direct route available\n")
		fmt.Printf("Raw response: %s\n", string(body))
		return
	}
	
	// Display quote details
	fmt.Printf("✅ Quote received:\n")
	fmt.Printf("   Input: %s BONK\n", quote.InAmount)
	fmt.Printf("   Output: %s WIF\n", quote.OutAmount)
	fmt.Printf("   Price Impact: %s%%\n", quote.PriceImpactPct)
	fmt.Printf("   Route: ")
	for i, route := range quote.RoutePlan {
		if i > 0 {
			fmt.Print(" -> ")
		}
		fmt.Print(route.SwapInfo.Label)
	}
	fmt.Println()
	
	// Calculate exchange rate
	inAmount, _ := strconv.ParseFloat(quote.InAmount, 64)
	outAmount, _ := strconv.ParseFloat(quote.OutAmount, 64)
	if inAmount > 0 {
		rate := outAmount / inAmount
		fmt.Printf("   Exchange Rate: 1 BONK = %.8f WIF\n", rate)
	}
	
	// Show if it's a direct route
	if len(quote.RoutePlan) == 1 {
		fmt.Printf("   ✅ Direct route through: %s\n", quote.RoutePlan[0].SwapInfo.Label)
	} else {
		fmt.Printf("   ⚠️  Multi-hop route (%d steps)\n", len(quote.RoutePlan))
	}
}

func formatAmount(amount string, decimals int) string {
	amountFloat, err := strconv.ParseFloat(amount, 64)
	if err != nil {
		return amount
	}
	
	divisor := 1.0
	for i := 0; i < decimals; i++ {
		divisor *= 10
	}
	
	return fmt.Sprintf("%.6f", amountFloat/divisor)
}

func init() {
	// Check if we have environment variables set
	apiKey := os.Getenv("JUPITER_API_KEY")
	if apiKey != "" {
		fmt.Printf("Using Jupiter API key: %s...\n", apiKey[:10])
	}
}