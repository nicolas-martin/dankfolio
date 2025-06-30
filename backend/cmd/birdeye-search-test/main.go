package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

func main() {
	// Parse command line flags
	keyword := flag.String("keyword", "PUMP", "Search keyword")
	searchBy := flag.String("search-by", "combination", "Search by: symbol, name, address, or combination")
	limit := flag.Int("limit", 10, "Number of results to return (max 50)")
	offset := flag.Int("offset", 0, "Pagination offset")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		fmt.Printf("Warning: Error loading .env file: %v\n", err)
	}

	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		log.Fatal("BIRDEYE_API_KEY not found in environment")
	}
	fmt.Printf("Using API key: %s...\n", apiKey[:8])

	endpoint := os.Getenv("BIRDEYE_ENDPOINT")
	if endpoint == "" {
		endpoint = "https://public-api.birdeye.so"
	}

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create Birdeye client
	client := birdeye.NewClient(httpClient, endpoint, apiKey, nil)

	// Create search parameters
	params := birdeye.SearchParams{
		Keyword:  *keyword,
		SearchBy: birdeye.SearchBy(*searchBy),
		Limit:    *limit,
		Offset:   *offset,
	}

	// Perform search
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("Searching for tokens with keyword: %s\n", *keyword)
	fmt.Printf("Search by: %s\n", *searchBy)
	fmt.Printf("Limit: %d, Offset: %d\n\n", *limit, *offset)

	response, err := client.Search(ctx, params)
	if err != nil {
		log.Fatal("Search failed:", err)
	}

	if !response.Success {
		log.Fatal("Search was not successful")
	}

	// Print results
	tokenCount := 0
	for _, item := range response.Data.Items {
		if item.Type == "token" {
			tokenCount += len(item.Result)
		}
	}
	fmt.Printf("Found %d tokens\n\n", tokenCount)

	tokenNum := 1
	for _, item := range response.Data.Items {
		if item.Type == "token" {
			for _, token := range item.Result {
				fmt.Printf("%d. %s (%s)\n", tokenNum, token.Name, token.Symbol)
				fmt.Printf("   Address: %s\n", token.Address)
				fmt.Printf("   Price: $%.6f\n", token.Price)
				fmt.Printf("   Market Cap: $%.2f\n", token.MarketCap)
				fmt.Printf("   24h Volume: $%.2f\n", token.Volume24hUSD)
				fmt.Printf("   24h Price Change: %.2f%%\n", token.Price24hChangePercent)
				fmt.Printf("   Liquidity: $%.2f\n", token.Liquidity)
				if len(token.Tags) > 0 {
					fmt.Printf("   Tags: %v\n", token.Tags)
				}
				fmt.Println()
				tokenNum++
			}
		}
	}

	// Optionally, print JSON output
	if os.Getenv("OUTPUT_JSON") == "true" {
		jsonData, err := json.MarshalIndent(response, "", "  ")
		if err != nil {
			log.Fatal("Failed to marshal JSON:", err)
		}
		fmt.Println("\nJSON Response:")
		fmt.Println(string(jsonData))
	}
}