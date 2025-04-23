package price

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles price-related operations
type Service struct {
	birdeyeClient *birdeye.Client
	jupiterClient jupiter.ClientAPI
}

var (
	addressToSymbolCache map[string]string
	addressToSymbolOnce  sync.Once
)

// NewService creates a new price service
func NewService(birdeyeClient *birdeye.Client, jupiterClient jupiter.ClientAPI) *Service {
	return &Service{
		birdeyeClient: birdeyeClient,
		jupiterClient: jupiterClient,
	}
}

// GetPriceHistory retrieves price history for a given token
func (s *Service) GetPriceHistory(ctx context.Context, address, historyType, timeFrom, timeTo, addressType string) (*birdeye.PriceHistory, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		log.Print("x-debug-mode: true")
		return s.loadMockPriceHistory(address, historyType)
	}

	startTime, err := time.Parse(time.RFC3339, timeFrom)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_from: %w", err)
	}
	endTime, err := time.Parse(time.RFC3339, timeTo)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_to: %w", err)
	}

	params := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: historyType,
		TimeFrom:    startTime,
		TimeTo:      endTime,
	}

	return s.birdeyeClient.GetPriceHistory(ctx, params)
}

func (s *Service) loadMockPriceHistory(address string, historyType string) (*birdeye.PriceHistory, error) {
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

	var priceHistory birdeye.PriceHistory
	if err := json.NewDecoder(file).Decode(&priceHistory); err != nil {
		log.Printf("failed to decode mock data: %s", err)
		return s.generateRandomPriceHistory(address)
	}

	return &priceHistory, nil
}

func (s *Service) generateRandomPriceHistory(address string) (*birdeye.PriceHistory, error) {
	log.Printf("🎲 Generating random price history for unknown token: %s", address)
	// Default to 100 points for smoother chart
	numPoints := 100
	volatility := 0.03                // Base volatility for normal movements
	trendBias := rand.Float64()*2 - 1 // Random trend between -1 and 1

	// Generate a more diverse base price between $0.01 and $1.00
	magnitude := rand.Float64() * 2             // Random number between 0 and 2
	basePrice := 0.01 * math.Pow(10, magnitude) // This gives us a range from 0.01 to 1.00

	// Generate price points
	var items []birdeye.PriceHistoryItem
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

		items = append(items, birdeye.PriceHistoryItem{
			UnixTime: pointTime.Unix(),
			Value:    currentPrice,
		})
	}

	log.Printf("🎲 Generated %d random price points for %s with base price %.6f",
		len(items), address, basePrice)

	return &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: items,
		},
		Success: true,
	}, nil
}

// GetTokenPrices returns current prices for multiple tokens
func (s *Service) GetTokenPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		// Return mock prices for debug mode
		mockPrices := make(map[string]float64)
		for _, addr := range tokenAddresses {
			mockPrices[addr] = 1.0 + rand.Float64() // Random price between 1.0 and 2.0
		}
		return mockPrices, nil
	}

	// Get real prices from Jupiter API
	return s.jupiterClient.GetTokenPrices(tokenAddresses)
}

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
					for address, symbol := range symbolToAddress {
						if strings.ToLower(symbol) == dirSymbol {
							addressToSymbolCache[address] = dirSymbol
							log.Printf("[DEBUG] Added mapping: %s -> %s", address, dirSymbol)
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
