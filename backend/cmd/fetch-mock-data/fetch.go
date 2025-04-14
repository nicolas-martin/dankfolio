package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

var timeframes = []string{"15m", "1H", "4H", "1D", "1W"}

func loadTrendingTokens(wd string) ([]TrendingToken, error) {
	// Try different possible paths for the trending tokens file
	paths := []string{
		filepath.Join(wd, "cmd", "trending", "trending_tokens.json"),
		filepath.Join("cmd", "trending", "trending_tokens.json"),
	}

	var file *os.File
	var err error
	for _, path := range paths {
		file, err = os.Open(path)
		if err == nil {
			defer file.Close()
			break
		}
	}
	if err != nil {
		return nil, fmt.Errorf("failed to open trending tokens file: %w", err)
	}

	var tokens []TrendingToken
	if err := json.NewDecoder(file).Decode(&tokens); err != nil {
		return nil, fmt.Errorf("failed to decode trending tokens: %w", err)
	}

	return tokens, nil
}

func fetchAndStorePriceHistory(apiKey string) error {
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %w", err)
	}

	// Load trending tokens
	tokens, err := loadTrendingTokens(wd)
	if err != nil {
		return fmt.Errorf("failed to load trending tokens: %w", err)
	}

	priceService := price.NewService(apiKey)
	now := time.Now().Unix()

	// Add SOL and USDC to the beginning of the list
	defaultTokens := []TrendingToken{
		{Symbol: "SOL", Mint: "So11111111111111111111111111111111111111112", Volume: 0},
		{Symbol: "USDC", Mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", Volume: 0},
	}
	tokens = append(defaultTokens, tokens...)

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

			timeTo := fmt.Sprintf("%d", now)
			timeFrom := fmt.Sprintf("%d", now-(points*duration))

			history, err := priceService.GetPriceHistory(nil, token.Mint, timeframe, timeFrom, timeTo, "token")
			if err != nil {
				log.Printf("Error fetching price history for %s (%s): %v", token.Symbol, timeframe, err)
				continue
			}

			// Create directory if it doesn't exist
			dirPath := filepath.Join(wd, "cmd", "fetch-mock-data", "price_history", token.Symbol)
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
