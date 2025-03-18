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
		// Try to load mock data
		mockData, err := s.loadMockPriceHistory(address, historyType)
		if err == nil {
			return mockData, nil
		}
		// If we can't load mock data, log the error and continue with real API
		fmt.Printf("⚠️ Failed to load mock price history data: %v\n", err)
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
		"7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx": "STAR10",
		"9nusLQeFKiocswDt6NQsiErm1DnGdnxW8CKNtJoZFA1F": "Telepathy",
		"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU": "PWEASE",
		"FoRGERiW7odcCBGU1bztZi16osPBHjxharvDathL5eds": "DEER",
		"ALCH3njvs3MGXmBv8YyL3rmyQ8KTZvjPgGvGNhvvuEK":  "ALCH",
		"BABYb6HHrGpF7mWiKNzh5zcGt7ZhWgkxp7Y9KZTwM8i":  "Baby",
		"7VGqBvGvZWSHmyNsqYZVpNyqh1E4UnKDLtEjQZrVrHhk": "100",
		"9WMwGcY6TcbSfy9XPpQymY3qNEsvEaYL3wivdwPG2fpp": "Fartcoin",
	}

	// Get the symbol for the address
	symbol, ok := addressToSymbol[address]
	if !ok {
		return nil, fmt.Errorf("no mock data available for address: %s", address)
	}

	// Construct the path to the mock data file
	filename := filepath.Join("cmd", "fetch-mock-data", "price_history", symbol, fmt.Sprintf("%s.json", historyType))
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open mock data file: %w", err)
	}
	defer file.Close()

	var priceHistory model.PriceHistoryResponse
	if err := json.NewDecoder(file).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("failed to decode mock data: %w", err)
	}

	return &priceHistory, nil
}
