package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

func init() {
	// Load .env.prod file from the backend directory
	if err := godotenv.Load(".env.prod"); err != nil {
		fmt.Printf("Warning: Error loading .env.prod file: %v\n", err)
		// Try regular .env as fallback
		if err := godotenv.Load(".env"); err != nil {
			fmt.Printf("Warning: Error loading .env file: %v\n", err)
		}
	}
}

func main() {
	log.Println("🔍 Testing Price Service with FIXED time calculation...")

	// Get environment variables
	birdeyeAPIKey := os.Getenv("BIRDEYE_API_KEY")
	if birdeyeAPIKey == "" {
		log.Println("❌ BIRDEYE_API_KEY not found in environment")
		return
	}

	birdeyeEndpoint := os.Getenv("BIRDEYE_ENDPOINT")
	if birdeyeEndpoint == "" {
		birdeyeEndpoint = "https://public-api.birdeye.so" // fallback
		log.Println("⚠️  BIRDEYE_ENDPOINT not found, using default")
	}

	jupiterAPIURL := os.Getenv("JUPITER_API_URL")
	if jupiterAPIURL == "" {
		jupiterAPIURL = "https://api.jup.ag" // fallback
	}

	jupiterAPIKey := os.Getenv("JUPITER_API_KEY")

	log.Printf("✅ BirdEye API key: %s...", birdeyeAPIKey[:8])
	log.Printf("✅ BirdEye endpoint: %s", birdeyeEndpoint)
	log.Printf("✅ Jupiter API URL: %s", jupiterAPIURL)

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Initialize clients (with nil tracker for testing)
	birdeyeClient := birdeye.NewClient(httpClient, birdeyeEndpoint+"/defi", birdeyeAPIKey, nil)
	jupiterClient := jupiter.NewClient(httpClient, jupiterAPIURL, jupiterAPIKey, nil)

	// Create price cache
	priceCache, err := price.NewGoCacheAdapter()
	if err != nil {
		log.Printf("❌ Failed to create price cache: %v", err)
		return
	}

	// Initialize price service
	priceService := price.NewService(birdeyeClient, jupiterClient, nil, priceCache)

	// Test scenarios
	testScenarios := []struct {
		name        string
		address     string
		historyType pb.GetPriceHistoryRequest_PriceHistoryType
		timeStr     string
		description string
	}{
		{
			name:        "SOL with future timestamp (original failing case)",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_ONE_DAY,
			timeStr:     "2025-06-13T03:21:33Z",
			description: "SOL token with future timestamp that was causing issues",
		},
		{
			name:        "Pump token with future timestamp (original failing case)",
			address:     "2KK4YMi24Tqo6tDn8mzYWkNdGjG3ufdXBjmLv7Fapump",
			historyType: pb.GetPriceHistoryRequest_ONE_DAY,
			timeStr:     "2025-06-13T03:21:33Z",
			description: "Pump token that was only returning 1 data point",
		},
		{
			name:        "SOL with 1H timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_ONE_HOUR,
			timeStr:     "2025-06-13T03:21:33Z",
			description: "SOL with 1 hour timeframe",
		},
		{
			name:        "SOL with 4H timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_FOUR_HOUR,
			timeStr:     "2025-06-13T03:21:33Z",
			description: "SOL with 4 hour timeframe",
		},
	}

	for i, scenario := range testScenarios {
		log.Printf("\n🧪 Test %d: %s", i+1, scenario.name)
		log.Printf("   Description: %s", scenario.description)
		log.Printf("   Address: %s", scenario.address)
		log.Printf("   History Type: %s", scenario.historyType.String())
		log.Printf("   Time: %s", scenario.timeStr)

		// Get config exactly like the gRPC handler does
		config, ok := price.TimeframeConfigMap[scenario.historyType]
		if !ok {
			log.Printf("   ❌ Unsupported history type: %s", scenario.historyType.String())
			continue
		}

		log.Printf("   Config: BirdeyeType=%s, Duration=%v, Rounding=%v",
			config.BirdeyeType, config.DefaultViewDuration, config.Rounding)

		// Call GetPriceHistory exactly like the gRPC handler
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)

		priceHistory, err := priceService.GetPriceHistory(ctx, scenario.address, config, scenario.timeStr, "token")
		cancel()

		if err != nil {
			log.Printf("   ❌ GetPriceHistory failed: %v", err)
			continue
		}

		log.Printf("   ✅ GetPriceHistory succeeded!")
		log.Printf("   📊 Success: %t", priceHistory.Success)
		log.Printf("   📈 Data points: %d", len(priceHistory.Data.Items))

		if len(priceHistory.Data.Items) > 0 {
			first := priceHistory.Data.Items[0]
			last := priceHistory.Data.Items[len(priceHistory.Data.Items)-1]
			log.Printf("   🕐 First point: %s = $%.6f",
				time.Unix(first.UnixTime, 0).Format("2006-01-02 15:04:05"), first.Value)
			log.Printf("   🕐 Last point:  %s = $%.6f",
				time.Unix(last.UnixTime, 0).Format("2006-01-02 15:04:05"), last.Value)

			timeSpan := time.Unix(last.UnixTime, 0).Sub(time.Unix(first.UnixTime, 0))
			log.Printf("   ⏱️  Time span: %v", timeSpan)

			if len(priceHistory.Data.Items) >= 2 {
				log.Printf("   🎉 SUCCESS: Got multiple data points!")
			} else {
				log.Printf("   ⚠️  WARNING: Only 1 data point (may be due to token/API limitations)")
			}
		} else {
			log.Printf("   ❌ No data points returned")
		}
	}

	log.Println("\n🏁 Price service test completed!")
}
