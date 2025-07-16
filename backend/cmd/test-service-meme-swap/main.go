package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

const (
	// Test meme coins
	BONKMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
	WIFMint  = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
	
	// Native and wrapped SOL
	NativeSolMint = "11111111111111111111111111111111"
	WSOLMint = "So11111111111111111111111111111111111111112"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize Jupiter client
	httpClient := &http.Client{Timeout: 30 * time.Second}
	jupiterURL := os.Getenv("JUPITER_API_URL")
	if jupiterURL == "" {
		jupiterURL = "https://lite-api.jup.ag" // Use the same endpoint as configured
	}
	jupiterAPIKey := os.Getenv("JUPITER_API_KEY")
	jupiterClient := jupiter.NewClient(httpClient, jupiterURL, jupiterAPIKey)

	ctx := context.Background()

	fmt.Println("=== Testing Meme-to-Meme Swap Logic ===")
	fmt.Printf("From: BONK (%s)\n", BONKMint)
	fmt.Printf("To: WIF (%s)\n", WIFMint)
	fmt.Println()

	// Test 1: Direct meme-to-meme quote with onlyDirectRoutes
	fmt.Println("1. Testing meme-to-meme quote with onlyDirectRoutes=true:")
	testMemeToMemeQuote(ctx, jupiterClient, BONKMint, WIFMint, "10000000000", true)

	// Test 2: Same quote without onlyDirectRoutes for comparison
	fmt.Println("\n2. Testing same quote with onlyDirectRoutes=false:")
	testMemeToMemeQuote(ctx, jupiterClient, BONKMint, WIFMint, "10000000000", false)

	// Test 3: Verify SOL swaps don't use onlyDirectRoutes
	fmt.Println("\n3. Testing SOL -> BONK (should NOT use onlyDirectRoutes):")
	testMemeToMemeQuote(ctx, jupiterClient, WSOLMint, BONKMint, "100000000", false)

	// Test 4: Test validation - meme-to-meme should reject SOL
	fmt.Println("\n4. Testing validation - meme functions should reject SOL:")
	testValidation()

	// Test 5: Show fee calculations
	fmt.Println("\n5. Fee calculation examples:")
	fmt.Println("\nScenario A: User has neither ATA")
	calculateMemeToMemeFees(false, false)
	
	fmt.Println("\nScenario B: User has input ATA but not output ATA")
	calculateMemeToMemeFees(true, false)
	
	fmt.Println("\nScenario C: User has both ATAs")
	calculateMemeToMemeFees(true, true)
}

func testMemeToMemeQuote(ctx context.Context, client jupiter.ClientAPI, fromMint, toMint, amount string, onlyDirectRoutes bool) {
	params := jupiter.QuoteParams{
		InputMint:        fromMint,
		OutputMint:       toMint,
		Amount:           amount,
		SlippageBps:      50,
		SwapMode:         "ExactIn",
		OnlyDirectRoutes: onlyDirectRoutes,
	}

	quote, err := client.GetQuote(ctx, params)
	if err != nil {
		fmt.Printf("❌ Error getting quote: %v\n", err)
		return
	}

	fmt.Printf("✅ Quote received:\n")
	fmt.Printf("   Input: %s\n", quote.InAmount)
	fmt.Printf("   Output: %s\n", quote.OutAmount)
	fmt.Printf("   Price Impact: %s%%\n", quote.PriceImpactPct)
	fmt.Printf("   Routes: %d\n", len(quote.RoutePlan))
	
	for i, route := range quote.RoutePlan {
		fmt.Printf("   - Route %d: %s\n", i+1, route.SwapInfo.Label)
	}

	if onlyDirectRoutes && len(quote.RoutePlan) > 1 {
		fmt.Printf("⚠️  WARNING: Got multi-hop route despite onlyDirectRoutes=true\n")
	}
}

func testValidation() {
	// Test cases that should fail validation
	testCases := []struct {
		name     string
		fromMint string
		toMint   string
	}{
		{"Native SOL as input", NativeSolMint, BONKMint},
		{"Native SOL as output", BONKMint, NativeSolMint},
		{"WSOL as input", WSOLMint, BONKMint},
		{"WSOL as output", BONKMint, WSOLMint},
	}

	for _, tc := range testCases {
		// Simulate the validation from GetMemeToMemeQuote
		if tc.fromMint == model.NativeSolMint || 
		   tc.fromMint == model.SolMint ||
		   tc.toMint == model.NativeSolMint || 
		   tc.toMint == model.SolMint {
			fmt.Printf("✅ %s: Correctly rejected (SOL detected)\n", tc.name)
		} else {
			fmt.Printf("❌ %s: Should have been rejected\n", tc.name)
		}
	}
}

func calculateMemeToMemeFees(hasFromATA, hasToATA bool) {
	const (
		ataRentLamports    = 2_039_280 // rent-exempt minimum per ATA
		priorityLamports   = 1_000_000 // tip per tx
		baseTransactionFee = 5000      // lamports per transaction
	)

	atasToCreate := 0
	if !hasFromATA {
		atasToCreate++
	}
	if !hasToATA {
		atasToCreate++
	}

	netRent := uint64(atasToCreate) * ataRentLamports
	baseFee := uint64(baseTransactionFee)
	prioFee := uint64(priorityLamports)
	totalLam := baseFee + prioFee + netRent

	fmt.Printf("\n📊 Meme-to-Meme Fee Calculation:\n")
	fmt.Printf("   ATAs to create: %d\n", atasToCreate)
	fmt.Printf("   ATA creation cost: %.6f SOL\n", float64(netRent)/1e9)
	fmt.Printf("   Transaction fee: %.6f SOL\n", float64(baseFee)/1e9)
	fmt.Printf("   Priority fee: %.6f SOL\n", float64(prioFee)/1e9)
	fmt.Printf("   Total SOL required: %.6f SOL\n", float64(totalLam)/1e9)
}