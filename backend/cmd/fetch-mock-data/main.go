package main

import (
	"log"
	"os"
)

func main() {
	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		log.Fatal("BIRDEYE_API_KEY environment variable is required")
	}

	if err := fetchAndStorePriceHistory(apiKey); err != nil {
		log.Fatalf("Error fetching price history: %v", err)
	}

	log.Println("✨ Successfully fetched and stored mock price history data")
}
