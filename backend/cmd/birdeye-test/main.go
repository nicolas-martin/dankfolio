package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/olekukonko/tablewriter"
)

func init() {
	// Load .env.prod file from the backend directory
	if err := godotenv.Load(".env.prod"); err != nil {
		fmt.Printf("Warning: Error loading .env.prod file: %v\n", err)
	}
}

func main() {
	log.Println("🔍 Testing BirdEye API Icon URLs...")

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

	birdeyeClient := birdeye.NewClient(httpClient, endpoint, apiKey)
	ctx := context.Background()

	// Step 1: Get trending tokens
	log.Println("\n📈 Fetching trending tokens...")
	trendingParams := birdeye.TrendingTokensParams{
		Limit:  15, // Get 15 trending tokens
		Offset: 0,
	}

	trendingTokens, err := birdeyeClient.GetTrendingTokens(ctx, trendingParams)
	if err != nil {
		log.Printf("❌ Failed to get trending tokens: %v", err)
		return
	}

	if len(trendingTokens.Data.Tokens) == 0 {
		log.Println("❌ No trending tokens found")
		return
	}

	log.Printf("✅ Found %d trending tokens", len(trendingTokens.Data.Tokens))

	// Extract addresses for batch metadata fetch
	addresses := make([]string, 0, len(trendingTokens.Data.Tokens))
	for _, token := range trendingTokens.Data.Tokens {
		addresses = append(addresses, token.Address)
	}

	// Limit to 10 for the test
	if len(addresses) > 10 {
		addresses = addresses[:10]
	}

	// Step 2: Get metadata for these tokens using individual calls (since batch endpoint requires higher permissions)
	log.Printf("\n🔍 Fetching metadata for %d tokens using individual calls...", len(addresses))
	tokensData := []birdeye.TokenOverviewData{}
	
	for i, address := range addresses {
		log.Printf("   [%d/%d] Fetching %s...", i+1, len(addresses), address)
		tokenOverview, err := birdeyeClient.GetTokenOverview(ctx, address)
		if err != nil {
			log.Printf("   ❌ Failed to get token overview for %s: %v", address, err)
			continue
		}
		tokensData = append(tokensData, tokenOverview.Data)
	}

	// Step 3: Display results in a table
	log.Printf("\n✅ Successfully fetched metadata for %d tokens\n", len(tokensData))

	table := tablewriter.NewWriter(os.Stdout)
	table.Header([]string{"#", "Symbol", "Name", "Icon URL Type", "Icon URL"})

	for i, token := range tokensData {
		// Determine the type of icon URL
		urlType := classifyIconURL(token.LogoURI)
		
		// Truncate long URLs for display
		displayURL := token.LogoURI
		if len(displayURL) > 60 {
			displayURL = displayURL[:57] + "..."
		}

		// Truncate name if too long
		displayName := token.Name
		if len(displayName) > 20 {
			displayName = displayName[:17] + "..."
		}

		table.Append([]string{
			fmt.Sprintf("%d", i+1),
			token.Symbol,
			displayName,
			urlType,
			displayURL,
		})
	}

	table.Render()

	// Step 4: Analyze URL types
	log.Println("\n📊 Icon URL Analysis:")
	urlTypes := make(map[string]int)
	for _, token := range tokensData {
		urlType := classifyIconURL(token.LogoURI)
		urlTypes[urlType]++
	}

	for urlType, count := range urlTypes {
		log.Printf("   %s: %d tokens (%.1f%%)", urlType, count, float64(count)/float64(len(tokensData))*100)
	}

	// Step 5: Show full URLs for IPFS types
	log.Println("\n🌐 IPFS URLs found:")
	ipfsCount := 0
	for _, token := range tokensData {
		if isIPFSURL(token.LogoURI) {
			ipfsCount++
			log.Printf("   %s (%s): %s", token.Symbol, token.Name, token.LogoURI)
		}
	}
	
	if ipfsCount == 0 {
		log.Println("   None - all URLs are standard HTTP/HTTPS")
	}

	log.Println("\n🏁 Test completed!")
}

// classifyIconURL determines the type of icon URL
func classifyIconURL(url string) string {
	if url == "" {
		return "Empty"
	}

	// Check for IPFS URLs
	if strings.HasPrefix(url, "ipfs://") {
		return "IPFS Protocol"
	}
	
	if strings.Contains(url, "ipfs.io") {
		return "IPFS Gateway (ipfs.io)"
	}
	
	if strings.Contains(url, "cf-ipfs.com") {
		return "IPFS Gateway (cf-ipfs)"
	}
	
	if strings.Contains(url, "ipfs.dweb.link") {
		return "IPFS Gateway (dweb)"
	}
	
	if strings.Contains(url, "gateway.pinata.cloud") {
		return "IPFS Gateway (pinata)"
	}
	
	if strings.Contains(url, "cloudflare-ipfs.com") {
		return "IPFS Gateway (cloudflare)"
	}

	// Check for other common sources
	if strings.Contains(url, "pump.fun") {
		return "Pump.fun"
	}
	
	if strings.Contains(url, "arweave.net") {
		return "Arweave"
	}
	
	if strings.Contains(url, "shdw-drive.genesysgo.net") {
		return "Shadow Drive"
	}
	
	if strings.Contains(url, "amazonaws.com") || strings.Contains(url, "s3.") {
		return "AWS S3"
	}
	
	if strings.HasPrefix(url, "https://") {
		return "HTTPS"
	}
	
	if strings.HasPrefix(url, "http://") {
		return "HTTP"
	}

	return "Unknown"
}

// isIPFSURL checks if a URL is an IPFS URL
func isIPFSURL(url string) bool {
	return strings.HasPrefix(url, "ipfs://") ||
		strings.Contains(url, "ipfs.io") ||
		strings.Contains(url, "cf-ipfs.com") ||
		strings.Contains(url, "ipfs.dweb.link") ||
		strings.Contains(url, "gateway.pinata.cloud") ||
		strings.Contains(url, "cloudflare-ipfs.com")
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
