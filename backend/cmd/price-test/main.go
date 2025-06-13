package main

import (
	"context"
	"encoding/json"
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
	log.Println("🔍 Testing Price Service exactly like main application...")

	// Get environment variables like main app
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

	// Create HTTP client exactly like main app
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Initialize clients exactly like main app (with nil tracker for testing)
	birdeyeClient := birdeye.NewClient(httpClient, birdeyeEndpoint+"/defi", birdeyeAPIKey, nil)
	jupiterClient := jupiter.NewClient(httpClient, jupiterAPIURL, jupiterAPIKey, nil)

	// Create price cache like main app
	priceCache, err := price.NewGoCacheAdapter()
	if err != nil {
		log.Printf("❌ Failed to create price cache: %v", err)
		return
	}

	// Initialize price service exactly like main app
	priceService := price.NewService(birdeyeClient, jupiterClient, nil, priceCache)

	// Test parameters - use SOL token like our working test
	address := "So11111111111111111111111111111111111111112" // SOL token
	addressType := "token"
	historyType := pb.GetPriceHistoryRequest_ONE_HOUR

	// Get config exactly like the gRPC handler does
	config, ok := price.TimeframeConfigMap[historyType]
	if !ok {
		log.Printf("❌ Unsupported history type: %s", historyType.String())
		return
	}

	log.Printf("📋 Using config: %+v", config)

	// Create time exactly like gRPC handler
	currentTime := time.Now()
	timeStr := currentTime.Format("2006-01-02T15:04:05Z")

	log.Printf("🕐 Using time: %s", timeStr)
	log.Printf("🎯 Testing address: %s", address)
	log.Printf("📊 Address type: %s", addressType)

	// Call GetPriceHistory exactly like the gRPC handler
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Println("🚀 Calling GetPriceHistory...")
	priceHistory, err := priceService.GetPriceHistory(ctx, address, config, timeStr, addressType)
	if err != nil {
		log.Printf("❌ GetPriceHistory failed: %v", err)
		return
	}

	log.Printf("✅ GetPriceHistory succeeded! Got %d price points", len(priceHistory.Data.Items))
	if len(priceHistory.Data.Items) > 0 {
		first := priceHistory.Data.Items[0]
		last := priceHistory.Data.Items[len(priceHistory.Data.Items)-1]
		log.Printf("   First point: %s = $%.6f", time.Unix(first.UnixTime, 0).Format("2006-01-02 15:04:05"), first.Value)
		log.Printf("   Last point:  %s = $%.6f", time.Unix(last.UnixTime, 0).Format("2006-01-02 15:04:05"), last.Value)
	}

	// Pretty print the response
	responseJSON, _ := json.MarshalIndent(priceHistory, "", "  ")
	log.Printf("📄 Full response:\n%s", string(responseJSON))

	log.Println("🏁 Test completed successfully!")
}
