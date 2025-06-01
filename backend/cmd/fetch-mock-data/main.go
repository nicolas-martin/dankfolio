package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		log.Fatal("BIRDEYE_API_KEY environment variable is required")
	}

	if err := fetchAndStorePriceHistory(apiKey); err != nil {
		log.Fatalf("Error fetching price history: %v", err)
	}

	log.Println("✨ Successfully fetched and stored mock price history data")
}

type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

var timeframes = []string{"15m", "1H", "4H", "1D", "1W"}

func getCommonTokens() []TrendingToken {
	// Return a hardcoded list of common tokens for price history generation
	return []TrendingToken{
		{Symbol: "sol", Mint: "So11111111111111111111111111111111111111112", Volume: 0},
		{Symbol: "usdc", Mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", Volume: 0},
	}
}

func fetchAndStorePriceHistory(apiKey string) error {
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %w", err)
	}

	// Use hardcoded common tokens
	tokens := getCommonTokens()

	// Initialize clients
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}
	birdeyeClient := birdeye.NewClient("https://public-api.birdeye.so/defi", apiKey)
	jupiterClient := jupiter.NewClient(httpClient, "https://api.jup.ag", "")

	// Initialize price service with clients
	priceService := price.NewService(birdeyeClient, jupiterClient, nil)

	now := time.Now().Unix()

	log.Printf("🔄 Found %d tokens to fetch price history for", len(tokens))

	for i, token := range tokens {
		log.Printf("Fetching price history for %s (%s) [%d/%d]", token.Symbol, token.Mint, i+1, len(tokens))

		for j, timeframe := range timeframes {
			// Add a delay between requests to avoid rate limiting
			if j > 0 {
				log.Printf("Waiting 2 seconds before next request...")
				time.Sleep(2 * time.Second)
			}

			var points int64 = 100
			var duration int64

			switch timeframe {
			case "15m":
				duration = 900
			case "1H":
				duration = 3600
			case "4H":
				duration = 14400
			case "1D":
				duration = 86400
			case "1W":
				duration = 604800
			}

			timeTo := time.Unix(now, 0).UTC().Format(time.RFC3339)
			timeFrom := time.Unix(now-(points*duration), 0).UTC().Format(time.RFC3339)

			history, err := priceService.GetPriceHistory(context.Background(), token.Mint, timeframe, timeFrom, timeTo, "token")
			if err != nil {
				log.Printf("Error fetching price history for %s (%s): %v", token.Symbol, timeframe, err)
				continue
			}

			// Create directory if it doesn't exist
			dirPath := filepath.Join(wd, "..", "..", "data", "price_history", token.Symbol)
			if err := os.MkdirAll(dirPath, 0o755); err != nil {
				return fmt.Errorf("failed to create directory %s: %w", dirPath, err)
			}

			// Save to file
			filename := filepath.Join(dirPath, fmt.Sprintf("%s.json", timeframe))
			file, err := os.Create(filename)
			if err != nil {
				return fmt.Errorf("failed to create file %s: %w", filename, err)
			}

			encoder := json.NewEncoder(file)
			encoder.SetIndent("", "  ")
			if err := encoder.Encode(history); err != nil {
				file.Close()
				return fmt.Errorf("failed to encode price history for %s (%s): %w", token.Symbol, timeframe, err)
			}
			file.Close()

			log.Printf("✅ Saved price history for %s (%s) to %s", token.Symbol, timeframe, filename)
		}

		// Add a longer delay between tokens
		if i < len(tokens)-1 {
			log.Printf("Waiting 5 seconds before fetching next token...")
			time.Sleep(5 * time.Second)
		}
	}

	return nil
}
