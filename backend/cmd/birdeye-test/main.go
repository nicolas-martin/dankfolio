package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

func init() {
	// Load .env.prod file from the backend directory
	if err := godotenv.Load(".env.prod"); err != nil {
		fmt.Printf("Warning: Error loading .env.prod file: %v\n", err)
	}
}

func main() {
	log.Println("🔍 Testing BirdEye API directly...")

	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		log.Println("❌ BIRDEYE_API_KEY not found in environment")
		return
	}

	endpoint := os.Getenv("BIRDEYE_ENDPOINT")
	if endpoint == "" {
		endpoint = "https://public-api.birdeye.so" // fallback
		log.Println("⚠️  BIRDEYE_ENDPOINT not found, using default")
	}

	log.Printf("✅ Found API key: %s...", apiKey[:8])
	log.Printf("✅ Using endpoint: %s", endpoint)

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// // Test parameters - let's test our new time calculation logic
	// address := "So11111111111111111111111111111111111111112" // SOL token - should have lots of data
	// addressType := "token"
	// historyType := "1D"

	// // Use the same time calculation logic as our fixed service
	// inputTime := time.Date(2025, 6, 13, 3, 21, 33, 0, time.UTC) // Same as the failing request
	// defaultViewDuration := 24 * time.Hour
	// rounding := 10 * time.Minute

	// // Calculate time range like our fixed service
	// timeFrom := inputTime.Add(-defaultViewDuration)
	// timeTo := inputTime

	// // Apply our new rounding logic
	// roundedTimeFrom := roundDateDown(timeFrom, rounding)
	// roundedTimeTo := roundDateDown(timeTo, rounding)

	// // Apply minimum time span adjustment
	// minTimeSpan := defaultViewDuration / 4
	// if roundedTimeTo.Sub(roundedTimeFrom) < minTimeSpan {
	// 	roundedTimeFrom = roundedTimeTo.Add(-defaultViewDuration)
	// }

	// actualTimeSpan := roundedTimeTo.Sub(roundedTimeFrom)

	// log.Printf("🎯 Testing with our FIXED time calculation logic:")
	// log.Printf("   Address: %s", address)
	// log.Printf("   Type: %s", historyType)
	// log.Printf("   Input time: %s", inputTime.Format("2006-01-02 15:04:05 UTC"))
	// log.Printf("   Time From: %s (Unix: %d)", roundedTimeFrom.Format("2006-01-02 15:04:05 UTC"), roundedTimeFrom.Unix())
	// log.Printf("   Time To: %s (Unix: %d)", roundedTimeTo.Format("2006-01-02 15:04:05 UTC"), roundedTimeTo.Unix())
	// log.Printf("   Time Span: %v", actualTimeSpan)

	// // Build URL manually first
	baseURL := endpoint
	// queryParams := url.Values{}
	// queryParams.Add("address", address)
	// queryParams.Add("address_type", addressType)
	// queryParams.Add("type", historyType)
	// queryParams.Add("time_from", strconv.FormatInt(timeFrom.Unix(), 10))
	// queryParams.Add("time_to", strconv.FormatInt(timeTo.Unix(), 10))

	// fullURL := fmt.Sprintf("%s/history_price?%s", baseURL, queryParams.Encode())
	// log.Printf("🌐 Testing URL: %s", fullURL)

	// // Make raw HTTP request
	// ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	// defer cancel()

	// req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	// if err != nil {
	// 	log.Printf("❌ Failed to create request: %v", err)
	// 	return
	// }

	// Set headers
	// req.Header.Set("Accept", "application/json")
	// req.Header.Set("X-API-KEY", apiKey)
	// req.Header.Set("x-chain", "solana")

	// log.Printf("📋 Request headers:")
	// for name, values := range req.Header {
	// 	for _, value := range values {
	// 		if name == "X-API-KEY" {
	// 			log.Printf("   %s: %s...", name, value[:8])
	// 		} else {
	// 			log.Printf("   %s: %s", name, value)
	// 		}
	// 	}
	// }

	// // Make the request
	// log.Println("🚀 Making request...")
	// resp, err := httpClient.Do(req)
	// if err != nil {
	// 	log.Printf("❌ Failed to make request: %v", err)
	// 	return
	// }
	// defer resp.Body.Close()

	// log.Printf("📊 Response status: %d %s", resp.StatusCode, resp.Status)
	// log.Printf("📋 Response headers:")
	// for name, values := range resp.Header {
	// 	for _, value := range values {
	// 		log.Printf("   %s: %s", name, value)
	// 	}
	// }

	// // Read response body
	// body, err := io.ReadAll(resp.Body)
	// if err != nil {
	// 	log.Printf("❌ Failed to read body: %v", err)
	// 	return
	// }

	// log.Printf("📄 Response body length: %d bytes", len(body))

	// // Check if it's HTML
	// bodyStr := string(body)
	// if len(bodyStr) > 0 {
	// 	if bodyStr[0] == '<' || len(bodyStr) > 15 && bodyStr[:15] == "<!DOCTYPE html>" {
	// 		log.Println("❌ Response is HTML!")
	// 		log.Printf("📄 HTML content (first 500 chars):\n%s", bodyStr[:min(500, len(bodyStr))])
	// 	} else {
	// 		log.Println("✅ Response appears to be JSON")
	// 		log.Printf("📄 JSON content (first 500 chars):\n%s", bodyStr[:min(500, len(bodyStr))])
	// 	}
	// }

	// // Now test with the BirdEye client
	// log.Println("\n🔧 Testing with BirdEye client...")
	birdeyeClient := birdeye.NewClient(httpClient, baseURL, apiKey, nil)

	// params := birdeye.PriceHistoryParams{
	// 	Address:     address,
	// 	AddressType: addressType,
	// 	HistoryType: historyType,
	// 	TimeFrom:    timeFrom,
	// 	TimeTo:      timeTo,
	// }

	// priceHistory, err := birdeyeClient.GetPriceHistory(ctx, params)
	// if err != nil {
	// 	log.Printf("❌ BirdEye client failed: %v", err)
	// } else {
	// 	log.Printf("✅ BirdEye client succeeded! Got %d price points", len(priceHistory.Data.Items))
	// 	if len(priceHistory.Data.Items) > 0 {
	// 		first := priceHistory.Data.Items[0]
	// 		last := priceHistory.Data.Items[len(priceHistory.Data.Items)-1]
	// 		log.Printf("   First point: %s = $%.6f", time.Unix(first.UnixTime, 0).Format("2006-01-02 15:04:05"), first.Value)
	// 		log.Printf("   Last point:  %s = $%.6f", time.Unix(last.UnixTime, 0).Format("2006-01-02 15:04:05"), last.Value)
	// 	}
	// }

	// Test the new listing tokens endpoint
	log.Println("\n🆕 Testing GetNewListingTokens endpoint...")

	// Test with meme platform enabled (the key to getting new tokens!)
	newListingParams := birdeye.NewListingTokensParams{
		Limit:               10, // Reasonable limit
		Offset:              0,
		MemePlatformEnabled: true, // This is the key parameter!
	}

	newListingResponse, err := birdeyeClient.GetNewListingTokens(context.Background(), newListingParams)
	if err != nil {
		log.Printf("❌ GetNewListingTokens failed: %v", err)
	} else {
		log.Printf("✅ GetNewListingTokens succeeded! Got %d new tokens", len(newListingResponse.Data.Items))

		if len(newListingResponse.Data.Items) > 0 {
			log.Printf("📋 New tokens found:")
			for i, token := range newListingResponse.Data.Items[:min(5, len(newListingResponse.Data.Items))] {
				log.Printf("   %d. %s (%s) - %s",
					i+1, token.Name, token.Symbol, token.Address)
				log.Printf("      Source: %s | Liquidity: $%.2f | Added: %s",
					token.Source, token.Liquidity, token.LiquidityAddedAt.Format("2006-01-02 15:04:05"))
			}
		} else {
			log.Println("📝 No new tokens found")
		}
	}

	log.Println("🏁 Test completed!")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Helper function for rounding (copied from our service)
func roundDateDown(dateToRound time.Time, granularityMinutes time.Duration) time.Time {
	if granularityMinutes <= 0 {
		log.Printf("⚠️  roundDateDown called with zero granularityMinutes, returning original time")
		return dateToRound
	}

	// Convert granularity to minutes for proper rounding
	granularityInMinutes := int(granularityMinutes / time.Minute)
	if granularityInMinutes <= 0 {
		granularityInMinutes = 1 // Default to 1 minute if invalid
	}

	// Truncate to the hour first, then add back the rounded minutes
	truncatedToHour := dateToRound.Truncate(time.Hour)

	// Get the minutes past the hour
	minutesPastHour := dateToRound.Minute()

	// Round down to the nearest granularity
	roundedMinutes := (minutesPastHour / granularityInMinutes) * granularityInMinutes

	return truncatedToHour.Add(time.Duration(roundedMinutes) * time.Minute)
}
