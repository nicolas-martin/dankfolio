package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
)

func main() {
	log.Println("🧪 Testing Raw Coin Conversion...")

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Test with the free API endpoint (lite-api.jup.ag)
	// Create API tracker

	jupiterClient := jupiter.NewClient(httpClient, "https://lite-api.jup.ag", "", nil)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test GetNewCoins with pagination
	log.Println("📥 Fetching new tokens...")
	limit := 10
	offset := 0
	params := &jupiter.NewCoinsParams{
		Limit:  &limit,
		Offset: &offset,
	}

	newCoins, err := jupiterClient.GetNewCoins(ctx, params)
	if err != nil {
		log.Printf("❌ GetNewCoins failed: %v", err)
		return
	}

	log.Printf("✅ GetNewCoins succeeded! Got %d coins", len(newCoins))

	// Test conversion to RawCoin for each token
	validTokens := 0
	emptyTokens := 0

	for i, coin := range newCoins {
		rawCoin := coin.ToRawCoin()

		log.Printf("🪙 Token %d:", i+1)
		log.Printf("   Name: %s", coin.Name)
		log.Printf("   Symbol: %s", coin.Symbol)
		log.Printf("   Address: %s", coin.Mint) // Changed Address to Mint
		log.Printf("   RawCoin MintAddress: %s", rawCoin.MintAddress)

		if rawCoin.MintAddress != "" {
			validTokens++
			log.Printf("   ✅ Valid mint address!")
		} else {
			emptyTokens++
			log.Printf("   ❌ Empty mint address!")
		}
		log.Println()
	}

	log.Printf("📊 Summary:")
	log.Printf("   Total tokens: %d", len(newCoins))
	log.Printf("   Valid mint addresses: %d", validTokens)
	log.Printf("   Empty mint addresses: %d", emptyTokens)

	if validTokens > 0 {
		log.Printf("🎉 SUCCESS: New tokens now have proper mint addresses!")
	} else {
		log.Printf("💥 FAILURE: All tokens still have empty mint addresses!")
	}

	log.Println("Test completed!")
}
