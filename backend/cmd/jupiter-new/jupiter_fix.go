package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
)

func main() {
	log.Println("Testing Jupiter API fixes...")

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create API tracker

	// Test with the free API endpoint (lite-api.jup.ag)
	jupiterClient := jupiter.NewClient(httpClient, "https://lite-api.jup.ag", "", nil)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// First, let's make a raw HTTP request to see the complete payload
	log.Println("🔍 Making raw HTTP request to see complete payload...")
	rawURL := "https://lite-api.jup.ag/tokens/v1/new?limit=3&offset=0"

	req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
	if err != nil {
		log.Printf("❌ Failed to create request: %v", err)
		return
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ Failed to make request: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Bad status code: %d", resp.StatusCode)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Failed to read body: %v", err)
		return
	}

	log.Printf("📄 Raw response body: %s", string(body))

	// Parse as array of map[string]any to see all fields
	var rawTokens []map[string]any
	if err := json.Unmarshal(body, &rawTokens); err != nil {
		log.Printf("❌ Failed to unmarshal as array: %v", err)
		return
	}

	log.Printf("✅ Got %d raw tokens", len(rawTokens))

	if len(rawTokens) > 0 {
		log.Printf("🔍 First token complete structure:")
		firstToken := rawTokens[0]
		for key, value := range firstToken {
			log.Printf("   %s: %v (type: %T)", key, value, value)
		}

		// Pretty print the first token
		prettyJSON, _ := json.MarshalIndent(firstToken, "   ", "  ")
		log.Printf("🔍 First token JSON:\n%s", string(prettyJSON))
	}

	// Now test the structured client
	log.Println("\nTesting GetNewCoins with structured client...")
	limit := 5
	offset := 0
	params := &jupiter.NewCoinsParams{
		Limit:  limit,
		Offset: offset,
	}

	newCoins, err := jupiterClient.GetNewCoins(ctx, params)
	if err != nil {
		log.Printf("❌ GetNewCoins failed: %v", err)
	} else {
		log.Printf("✅ GetNewCoins succeeded! Got %d coins", len(newCoins))
		if len(newCoins) > 0 {
			log.Printf("   First coin: %s (%s)", newCoins[0].Name, newCoins[0].Symbol)

			// Debug: Print the first coin's details
			firstCoin := newCoins[0]
			log.Printf("   🔍 First coin details:")
			log.Printf("      Address: '%s'", firstCoin.Mint) // Changed Address to Mint
			log.Printf("      Name: '%s'", firstCoin.Name)
			log.Printf("      Symbol: '%s'", firstCoin.Symbol)
			log.Printf("      Decimals: %d", firstCoin.Decimals)
			log.Printf("      LogoURI: '%s'", firstCoin.LogoURI)

			// Convert to RawCoin and check
			rawCoin := firstCoin.ToRawCoin()
			log.Printf("   🔍 Converted RawCoin:")
			log.Printf("      MintAddress: '%s'", rawCoin.Address)
			log.Printf("      Name: '%s'", rawCoin.Name)
			log.Printf("      Symbol: '%s'", rawCoin.Symbol)
		}
	}

	// Test GetCoinPrices
	log.Println("Testing GetCoinPrices...")
	prices, err := jupiterClient.GetCoinPrices(ctx, []string{"So11111111111111111111111111111111111111112"}) // SOL
	if err != nil {
		log.Printf("❌ GetCoinPrices failed: %v", err)
	} else {
		log.Printf("✅ GetCoinPrices succeeded! Got %d prices", len(prices))
		for addr, price := range prices {
			log.Printf("   %s: $%.2f", addr, price)
		}
	}

	log.Println("Test completed!")
}
