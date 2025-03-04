package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Pool represents a liquidity pool on Raydium
type Pool struct {
	Market      string  `json:"market"`
	BaseMint    string  `json:"baseMint"`
	QuoteMint   string  `json:"quoteMint"`
	Volume24h   float64 `json:"volume24h"`
	TokenSymbol string  `json:"name"`
}

// TrendingToken represents a trending token with its details
type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

// FetchRaydiumPools gets liquidity pools from Raydium's API
func FetchRaydiumPools() ([]Pool, error) {
	url := "https://api.raydium.io/v2/main/pairs"

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("error fetching data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	var pools []Pool
	if err := json.Unmarshal(body, &pools); err != nil {
		return nil, fmt.Errorf("error unmarshalling JSON: %v", err)
	}

	return pools, nil
}

// GetTrendingTokens fetches and sorts tokens by 24h volume
func GetTrendingTokens() ([]TrendingToken, error) {
	pools, err := FetchRaydiumPools()
	if err != nil {
		return nil, err
	}

	// Sort pools by trading volume (descending)
	sort.Slice(pools, func(i, j int) bool {
		return pools[i].Volume24h > pools[j].Volume24h
	})

	// Get top 10 tokens and format them
	var trendingTokens []TrendingToken
	seenMints := make(map[string]bool)

	for _, pool := range pools {
		if len(trendingTokens) >= 10 {
			break
		}

		// Skip if we've already seen this token
		if seenMints[pool.BaseMint] || seenMints[pool.QuoteMint] {
			continue
		}

		// Add the token that isn't SOL
		if pool.BaseMint != "So11111111111111111111111111111111111111112" {
			// Extract token symbol from pool name (usually in format "WSOL/TOKEN")
			symbol := pool.TokenSymbol
			if parts := strings.Split(symbol, "/"); len(parts) == 2 {
				if strings.ToUpper(parts[0]) == "WSOL" {
					symbol = strings.TrimSpace(parts[1])
				} else {
					symbol = strings.TrimSpace(parts[0])
				}
			}

			trendingTokens = append(trendingTokens, TrendingToken{
				Symbol: symbol,
				Mint:   pool.BaseMint,
				Volume: pool.Volume24h,
			})
			seenMints[pool.BaseMint] = true
		} else if pool.QuoteMint != "So11111111111111111111111111111111111111112" {
			// Extract token symbol from pool name (usually in format "WSOL/TOKEN")
			symbol := pool.TokenSymbol
			if parts := strings.Split(symbol, "/"); len(parts) == 2 {
				if strings.ToUpper(parts[0]) == "WSOL" {
					symbol = strings.TrimSpace(parts[1])
				} else {
					symbol = strings.TrimSpace(parts[0])
				}
			}

			trendingTokens = append(trendingTokens, TrendingToken{
				Symbol: symbol,
				Mint:   pool.QuoteMint,
				Volume: pool.Volume24h,
			})
			seenMints[pool.QuoteMint] = true
		}
	}

	return trendingTokens, nil
}

func main() {
	trendingTokens, err := GetTrendingTokens()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Top 10 Trending Tokens by 24h Volume:")
	for i, token := range trendingTokens {
		fmt.Printf("%d. %s (Mint: %s) - Volume: %.2f\n", i+1, token.Symbol, token.Mint, token.Volume)
	}

	// Write to file for trim-mainnet to use
	outputFile := "./trending_tokens.json"

	// Create parent directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(outputFile), 0755); err != nil {
		fmt.Println("Error creating directory:", err)
		return
	}

	file, err := json.MarshalIndent(trendingTokens, "", "  ")
	if err != nil {
		fmt.Println("Error marshalling JSON:", err)
		return
	}

	if err := os.WriteFile(outputFile, file, 0644); err != nil {
		fmt.Println("Error writing file:", err)
		return
	}

	fmt.Printf("\nTrending tokens written to %s\n", outputFile)
}
