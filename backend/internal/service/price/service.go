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
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles price-related operations
type Service struct {
	httpClient    *http.Client
	baseURL       string
	birdEyeAPIKEY string
}

// PriceHistory represents the response from the price history API
type PriceHistory struct {
	Data    PriceHistoryData `json:"data"`
	Success bool             `json:"success"`
}

// PriceHistoryData contains the price history items
type PriceHistoryData struct {
	Items []PriceHistoryItem `json:"items"`
}

// PriceHistoryItem represents a single price point
type PriceHistoryItem struct {
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

var (
	addressToSymbolCache map[string]string
	addressToSymbolOnce  sync.Once
)

func loadAddressToSymbol() map[string]string {
	addressToSymbolOnce.Do(func() {
		addressToSymbolCache = map[string]string{}
		wd, _ := os.Getwd()
		trendingPath := filepath.Join(wd, "data", "trending_solana_tokens_enriched.json")
		priceHistoryPath := filepath.Join(wd, "data", "price_history")
		log.Printf("[DEBUG] Opening %s...", trendingPath)
		file, err := os.Open(trendingPath)
		var symbolToAddress map[string]string
		if err == nil {
			defer file.Close()
			log.Printf("[DEBUG] Successfully opened trending_solana_tokens_enriched.json")
			var enriched struct {
				Tokens []struct {
					ID     string `json:"id"`
					Symbol string `json:"symbol"`
				} `json:"tokens"`
			}
			if err := json.NewDecoder(file).Decode(&enriched); err == nil {
				log.Printf("[DEBUG] Successfully parsed trending_solana_tokens_enriched.json, found %d tokens", len(enriched.Tokens))
				symbolToAddress = make(map[string]string)
				for _, t := range enriched.Tokens {
					if t.ID != "" && t.Symbol != "" {
						symbolToAddress[t.ID] = t.Symbol
					}
				}
			} else {
				log.Printf("[DEBUG] Failed to parse trending_solana_tokens_enriched.json: %v", err)
			}
		} else {
			log.Printf("[DEBUG] Failed to open trending_solana_tokens_enriched.json: %v", err)
		}
		log.Printf("[DEBUG] Reading %s directory...", priceHistoryPath)
		entries, err := os.ReadDir(priceHistoryPath)
		if err == nil {
			log.Printf("[DEBUG] Found %d symbol directories in price_history", len(entries))
			for _, entry := range entries {
				if entry.IsDir() {
					dirSymbol := strings.ToLower(entry.Name())
					if symbolToAddress != nil {
						for address, symbol := range symbolToAddress {
							if strings.ToLower(symbol) == dirSymbol {
								addressToSymbolCache[address] = dirSymbol
								log.Printf("[DEBUG] Added mapping: %s -> %s", address, dirSymbol)
							}
						}
					}
				}
			}
		} else {
			log.Printf("[DEBUG] Failed to read price_history directory: %v", err)
		}
		log.Printf("addressToSymbolCache: %+v", addressToSymbolCache)
		addressToSymbolCache["So11111111111111111111111111111111111111112"] = "sol"
		addressToSymbolCache["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"] = "usdc"
	})
	return addressToSymbolCache
}

// NewService creates a new price service
func NewService(baseURL string, birdEyeAPIKEY string) *Service {
	return &Service{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL:       baseURL,
		birdEyeAPIKEY: birdEyeAPIKEY,
	}
}

// TODO: We have another birdeye call here... they're everywhere 😥
// GetPriceHistory retrieves price history for a given token
func (s *Service) GetPriceHistory(ctx context.Context, address, historyType, timeFrom, timeTo, addressType string) (*PriceHistory, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		log.Print("x-debug-mode: true")
		return s.loadMockPriceHistory(address, historyType)
	}
	// RFC3339     = "2006-01-02T15:04:05Z07:00"
	startMili, err := time.Parse(time.RFC3339, timeFrom)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_from: %w", err)
	}
	endMili, err := time.Parse(time.RFC3339, timeTo)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_to: %w", err)
	}
	queryParams := url.Values{}
	queryParams.Add("address", address)
	queryParams.Add("address_type", addressType)
	queryParams.Add("type", historyType)
	queryParams.Add("time_from", strconv.FormatInt(startMili.Unix(), 10))
	queryParams.Add("time_to", strconv.FormatInt(endMili.Unix(), 10))
	fullURL := fmt.Sprintf("%s/history_price?%s", s.baseURL, queryParams.Encode())

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("accept", "application/json")
	req.Header.Set("X-API-KEY", s.birdEyeAPIKEY)
	req.Header.Set("x-chain", "solana")
	log.Printf("Request URL: %s", req.URL.String())
	log.Printf("Request Headers: %v", req.Header)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var priceHistory PriceHistory
	if err := json.NewDecoder(resp.Body).Decode(&priceHistory); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &priceHistory, nil
}

func (s *Service) loadMockPriceHistory(address string, historyType string) (*PriceHistory, error) {
	addressToSymbol := loadAddressToSymbol()
	log.Printf("Looking up address: %s", address)
	symbol, exists := addressToSymbol[address]
	if !exists {
		log.Printf("Address not found in addressToSymbolCache: %s", address)
		return s.generateRandomPriceHistory(address)
	}

	// Construct the path to the mock data file
	wd, _ := os.Getwd()
	filename := filepath.Join(wd, "data", "price_history", symbol, fmt.Sprintf("%s.json", historyType))
	fmt.Printf("📂 Looking for mock data file: %s\n", filename)

	file, err := os.Open(filename)
	if err != nil {
		log.Printf("failed to open mock data file %s: %s", filename, err)
		return s.generateRandomPriceHistory(address)
	}
	defer file.Close()

	var priceHistory PriceHistory
	if err := json.NewDecoder(file).Decode(&priceHistory); err != nil {
		log.Printf("failed to decode mock data: %s", err)
		return s.generateRandomPriceHistory(address)
	}

	return &priceHistory, nil
}

func (s *Service) generateRandomPriceHistory(address string) (*PriceHistory, error) {
	log.Printf("🎲 Generating random price history for unknown token: %s", address)
	// Default to 100 points for smoother chart
	numPoints := 100
	volatility := 0.03                // Base volatility for normal movements
	trendBias := rand.Float64()*2 - 1 // Random trend between -1 and 1

	// Generate a more diverse base price between $0.01 and $1.00
	magnitude := rand.Float64() * 2             // Random number between 0 and 2
	basePrice := 0.01 * math.Pow(10, magnitude) // This gives us a range from 0.01 to 1.00

	// Generate price points
	var items []PriceHistoryItem
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

		items = append(items, PriceHistoryItem{
			UnixTime: pointTime.Unix(), // No need for string conversion
			Value:    currentPrice,
		})
	}

	log.Printf("🎲 Generated %d random price points for %s with base price %.6f",
		len(items), address, basePrice)

	response := &PriceHistory{
		Data: struct {
			Items []PriceHistoryItem `json:"items"`
		}{
			Items: items,
		},
		Success: true,
	}

	return response, nil
}
