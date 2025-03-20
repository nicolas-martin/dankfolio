package price

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

type Service struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewService(apiKey string) *Service {
	return &Service{
		baseURL:    "https://public-api.birdeye.so",
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

func (s *Service) GetPriceHistory(ctx context.Context, address string, historyType string, timeFrom, timeTo string, addressType string) (*model.PriceHistoryResponse, error) {
	// Check if we're in development mode
	if os.Getenv("APP_ENV") == "development" {
		fmt.Println("🔍 Loading mock price history data")
		// Try to load mock data
		mockData, err := s.loadMockPriceHistory(address, historyType)
		if err == nil {
			return mockData, nil
		}
		// If we can't load mock data, return empty response in development
		fmt.Printf("⚠️ Failed to load mock price history data: %v\n", err)
		// Return empty response with proper structure
		emptyResponse := &model.PriceHistoryResponse{
			Success: true,
		}
		// Initialize the nested data structure
		emptyResponse.Data.Items = make([]model.PriceHistoryItem, 0)
		return emptyResponse, nil
	}

	url := fmt.Sprintf("%s/defi/history_price?address=%s&address_type=%s&type=%s&time_from=%s&time_to=%s",
		s.baseURL,
		address,
		addressType,
		historyType,
		timeFrom,
		timeTo,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("x-chain", "solana")
	req.Header.Set("X-API-KEY", s.apiKey)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error fetching data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	var priceHistory model.PriceHistoryResponse
	if err := json.NewDecoder(resp.Body).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %w", err)
	}

	return &priceHistory, nil
}

func (s *Service) loadMockPriceHistory(address string, historyType string) (*model.PriceHistoryResponse, error) {
	// Map of addresses to symbols
	addressToSymbol := map[string]string{
		"So11111111111111111111111111111111111111112":  "SOL",
		"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
		"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
		"9oqb8z7hyjjKG8raKtgexXskYRSN9Kcr5BoNkyekpump": "STAR10",
		"AibtWaMW9a5n6ZAKNhBM8Adm9FdiHRvou7QATkChye8U": "Telepathy",
		"CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump": "PWEASE",
		"E3DJkV7TG4ADDg6o7cA5ZNkmCMLhP9rxgfzxPoCpump":  "DEER",
		"HNg5PYJmtqcmzXrv6S9zP1CDKk5BgDuyFBxbvNApump":  "ALCH",
		"6pKHwNCpzgZuC9o5FzvCZkYSUGfQddhUYtMyDbEVpump": "Baby",
		"EKBZDhaSiAmUQNeJbkAkhJTEZPAN8WC5fShnUTyxpump": "100",
		"9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump": "Fartcoin",
		"ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82":  "BOME",
	}

	symbol, exists := addressToSymbol[address]
	if !exists {
		// If the coin is not in our map, generate random but believable data
		log.Printf("🎲 Generating random price history for unknown token: %s", address)
		return s.generateRandomPriceHistory(address)
	}

	// Construct the path to the mock data file
	filename := filepath.Join("cmd", "fetch-mock-data", "price_history", symbol, fmt.Sprintf("%s.json", historyType))
	fmt.Printf("📂 Looking for mock data file: %s\n", filename)

	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open mock data file %s: %w", filename, err)
	}
	defer file.Close()

	var priceHistory model.PriceHistoryResponse
	if err := json.NewDecoder(file).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("failed to decode mock data: %w", err)
	}

	return &priceHistory, nil
}

func (s *Service) generateRandomPriceHistory(address string) (*model.PriceHistoryResponse, error) {
	// Default to 100 points for smoother chart
	numPoints := 100
	volatility := 0.03                // Base volatility for normal movements
	trendBias := rand.Float64()*2 - 1 // Random trend between -1 and 1

	// Generate a more diverse base price between $0.01 and $1.00
	magnitude := rand.Float64() * 2             // Random number between 0 and 2
	basePrice := 0.01 * math.Pow(10, magnitude) // This gives us a range from 0.01 to 1.00

	// Generate price points
	var items []model.PriceHistoryItem
	currentPrice := basePrice
	now := time.Now()

	// Add some initial random jumps to create more diverse starting points
	for i := 0; i < 3; i++ {
		jump := 1 + (rand.Float64()*0.4 - 0.2) // Random jump between 0.8x and 1.2x
		currentPrice *= jump
	}

	for i := numPoints - 1; i >= 0; i-- {
		pointTime := now.Add(time.Duration(-i) * time.Hour)

		// Generate next price with random walk + trend
		change := (rand.Float64()*2-1)*volatility + (trendBias * volatility)

		// Occasionally add bigger price movements
		if rand.Float64() < 0.05 { // 5% chance of a bigger move
			change *= 1.5 // 1.5x normal volatility for spikes
		}

		currentPrice = currentPrice * (1 + change)

		// Ensure price doesn't go below 0.01
		if currentPrice < 0.01 {
			currentPrice = 0.01
		}

		items = append(items, model.PriceHistoryItem{
			UnixTime: pointTime.Unix(),
			Value:    currentPrice,
		})
	}

	log.Printf("🎲 Generated %d random price points for %s with base price %.6f",
		len(items), address, basePrice)

	response := &model.PriceHistoryResponse{
		Data: struct {
			Items []model.PriceHistoryItem `json:"items"`
		}{
			Items: items,
		},
		Success: true,
	}

	return response, nil
}
