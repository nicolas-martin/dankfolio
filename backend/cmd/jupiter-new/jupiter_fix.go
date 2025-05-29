package main

import (
	"context"
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

	// Test with the free API endpoint (lite-api.jup.ag)
	jupiterClient := jupiter.NewClient(httpClient, "https://lite-api.jup.ag", "")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test GetNewCoins with pagination
	log.Println("Testing GetNewCoins...")
	limit := 5
	offset := 0
	params := &jupiter.NewCoinsParams{
		Limit:  &limit,
		Offset: &offset,
	}

	newCoins, err := jupiterClient.GetNewCoins(ctx, params)
	if err != nil {
		log.Printf("❌ GetNewCoins failed: %v", err)
	} else {
		log.Printf("✅ GetNewCoins succeeded! Got %d coins", len(newCoins.Coins))
		if len(newCoins.Coins) > 0 {
			log.Printf("   First coin: %s (%s)", newCoins.Coins[0].Name, newCoins.Coins[0].Symbol)
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
