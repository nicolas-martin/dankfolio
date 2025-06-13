package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
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

	// Test parameters
	address := "So11111111111111111111111111111111111111112" // SOL token
	addressType := "token"
	historyType := "1H"
	timeFrom := time.Now().Add(-24 * time.Hour)
	timeTo := time.Now()

	// Build URL manually first
	baseURL := endpoint + "/defi"
	queryParams := url.Values{}
	queryParams.Add("address", address)
	queryParams.Add("address_type", addressType)
	queryParams.Add("type", historyType)
	queryParams.Add("time_from", strconv.FormatInt(timeFrom.Unix(), 10))
	queryParams.Add("time_to", strconv.FormatInt(timeTo.Unix(), 10))

	fullURL := fmt.Sprintf("%s/history_price?%s", baseURL, queryParams.Encode())
	log.Printf("🌐 Testing URL: %s", fullURL)

	// Make raw HTTP request
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		log.Printf("❌ Failed to create request: %v", err)
		return
	}

	// Set headers
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-KEY", apiKey)
	req.Header.Set("x-chain", "solana")

	log.Printf("📋 Request headers:")
	for name, values := range req.Header {
		for _, value := range values {
			if name == "X-API-KEY" {
				log.Printf("   %s: %s...", name, value[:8])
			} else {
				log.Printf("   %s: %s", name, value)
			}
		}
	}

	// Make the request
	log.Println("🚀 Making request...")
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ Failed to make request: %v", err)
		return
	}
	defer resp.Body.Close()

	log.Printf("📊 Response status: %d %s", resp.StatusCode, resp.Status)
	log.Printf("📋 Response headers:")
	for name, values := range resp.Header {
		for _, value := range values {
			log.Printf("   %s: %s", name, value)
		}
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Failed to read body: %v", err)
		return
	}

	log.Printf("📄 Response body length: %d bytes", len(body))

	// Check if it's HTML
	bodyStr := string(body)
	if len(bodyStr) > 0 {
		if bodyStr[0] == '<' || len(bodyStr) > 15 && bodyStr[:15] == "<!DOCTYPE html>" {
			log.Println("❌ Response is HTML!")
			log.Printf("📄 HTML content (first 500 chars):\n%s", bodyStr[:min(500, len(bodyStr))])
		} else {
			log.Println("✅ Response appears to be JSON")
			log.Printf("📄 JSON content (first 500 chars):\n%s", bodyStr[:min(500, len(bodyStr))])
		}
	}

	// Now test with the BirdEye client
	log.Println("\n🔧 Testing with BirdEye client...")
	birdeyeClient := birdeye.NewClient(httpClient, baseURL, apiKey, nil)

	params := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: historyType,
		TimeFrom:    timeFrom,
		TimeTo:      timeTo,
	}

	priceHistory, err := birdeyeClient.GetPriceHistory(ctx, params)
	if err != nil {
		log.Printf("❌ BirdEye client failed: %v", err)
	} else {
		log.Printf("✅ BirdEye client succeeded! Got %d price points", len(priceHistory.Data.Items))
		if len(priceHistory.Data.Items) > 0 {
			first := priceHistory.Data.Items[0]
			last := priceHistory.Data.Items[len(priceHistory.Data.Items)-1]
			log.Printf("   First point: %s = $%.6f", time.Unix(first.UnixTime, 0).Format("2006-01-02 15:04:05"), first.Value)
			log.Printf("   Last point:  %s = $%.6f", time.Unix(last.UnixTime, 0).Format("2006-01-02 15:04:05"), last.Value)
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
