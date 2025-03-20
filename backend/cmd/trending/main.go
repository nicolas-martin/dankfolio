package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

// BirdeyeResponse represents the response from Birdeye API
type BirdeyeResponse struct {
	Success bool        `json:"success"`
	Data    BirdeyeData `json:"data"`
}

// BirdeyeData represents the data field in the response
type BirdeyeData struct {
	UpdateUnixTime int64          `json:"updateUnixTime"`
	UpdateTime     string         `json:"updateTime"`
	Tokens         []BirdeyeToken `json:"tokens"`
	Total          int            `json:"total"`
}

// BirdeyeToken represents a token from Birdeye API
type BirdeyeToken struct {
	Address                string  `json:"address"`
	Decimals               int     `json:"decimals"`
	Liquidity              float64 `json:"liquidity"`
	LogoURI                string  `json:"logoURI"`
	Name                   string  `json:"name"`
	Symbol                 string  `json:"symbol"`
	Volume24hUSD           float64 `json:"volume24hUSD"`
	Volume24hChangePercent float64 `json:"volume24hChangePercent"`
	Rank                   int     `json:"rank"`
	Price                  float64 `json:"price"`
	Price24hChangePercent  float64 `json:"price24hChangePercent"`
	FDV                    float64 `json:"fdv"`
	Marketcap              float64 `json:"marketcap"`
}

// TrendingToken represents a trending token with its details
type TrendingToken struct {
	Symbol string  `json:"symbol"`
	Mint   string  `json:"mint"`
	Volume float64 `json:"volume"`
}

// FetchBirdeyeTrendingTokensParams represents the parameters for fetching trending tokens
type FetchBirdeyeTrendingTokensParams struct {
	SortBy   string `json:"sort_by"`   // Defaults to "rank", can be "volume24hUSD" or "liquidity"
	SortType string `json:"sort_type"` // Defaults to "asc"
	Offset   int    `json:"offset"`    // Defaults to 0
	Limit    int    `json:"limit"`     // Defaults to 20 (1 to 20)
}

func init() {
	// Load .env file from the project root
	if err := godotenv.Load("../../.env"); err != nil {
		fmt.Printf("Warning: Error loading .env file: %v\n", err)
	}
}

// FetchBirdeyeTrendingTokens gets trending tokens from Birdeye API
func FetchBirdeyeTrendingTokens(params *FetchBirdeyeTrendingTokensParams) ([]BirdeyeToken, error) {
	baseURL := "https://public-api.birdeye.so/defi/token_trending"
	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("BIRDEYE_API_KEY not found in environment")
	}

	// Set default values if params is nil
	if params == nil {
		params = &FetchBirdeyeTrendingTokensParams{
			SortBy:   "rank",
			SortType: "asc",
			Offset:   0,
			Limit:    20,
		}
	}

	// Build query parameters
	query := fmt.Sprintf("?sort_by=%s&sort_type=%s&offset=%d&limit=%d",
		params.SortBy,
		params.SortType,
		params.Offset,
		params.Limit,
	)

	req, err := http.NewRequest("GET", baseURL+query, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}
	fmt.Println("--------------------------------")
	fmt.Println(string(body))
	fmt.Println("--------------------------------")

	var response BirdeyeResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("error unmarshalling JSON: %v", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("API returned unsuccessful response")
	}

	return response.Data.Tokens, nil
}

// GetTrendingTokens fetches and formats tokens by 24h volume
func GetTrendingTokens() ([]TrendingToken, error) {
	// Using default parameters (rank, asc, limit 10)
	params := &FetchBirdeyeTrendingTokensParams{
		SortBy:   "rank",
		SortType: "asc",
		Offset:   0,
		Limit:    10,
	}

	tokens, err := FetchBirdeyeTrendingTokens(params)
	if err != nil {
		return nil, err
	}

	var trendingTokens []TrendingToken

	for _, token := range tokens {

		// Clean up symbol (remove any /USDC or similar suffixes)
		symbol := strings.Split(token.Symbol, "/")[0]
		symbol = strings.TrimSpace(symbol)

		trendingTokens = append(trendingTokens, TrendingToken{
			Symbol: symbol,
			Mint:   token.Address,
			Volume: token.Volume24hUSD,
		})
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
	if err = os.MkdirAll(filepath.Dir(outputFile), 0o755); err != nil {
		fmt.Println("Error creating directory:", err)
		return
	}

	file, err := json.MarshalIndent(trendingTokens, "", "  ")
	if err != nil {
		fmt.Println("Error marshalling JSON:", err)
		return
	}

	if err := os.WriteFile(outputFile, file, 0o644); err != nil {
		fmt.Println("Error writing file:", err)
		return
	}

	fmt.Printf("\nTrending tokens written to %s\n", outputFile)
}
