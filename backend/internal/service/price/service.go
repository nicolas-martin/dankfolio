package price

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

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

	// Get the symbol for the address
	fmt.Printf("🔍 Looking up symbol for address: %s\n", address)
	symbol, ok := addressToSymbol[address]
	if !ok {
		fmt.Printf("❌ Address not found in mapping. Available addresses:\n")
		for addr, sym := range addressToSymbol {
			fmt.Printf("  %s -> %s\n", addr, sym)
		}
		return nil, fmt.Errorf("no mock data available for address: %s", address)
	}
	fmt.Printf("✅ Found symbol: %s\n", symbol)

	// Construct the path to the mock data file
	filename := filepath.Join("cmd", "fetch-mock-data", "price_history", symbol, fmt.Sprintf("%s.json", historyType))
	fmt.Printf("📂 Looking for mock data file: %s\n", filename)

	// Get current working directory for debugging
	cwd, _ := os.Getwd()
	fmt.Printf("📍 Current working directory: %s\n", cwd)

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
