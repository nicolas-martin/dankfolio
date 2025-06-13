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
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/olekukonko/tablewriter"
)

func main() {
	godotenv.Load(".env.prod") // Load environment variables
	log.Println("🔍 Testing BirdEye API directly with SOL token...")

	// Initialize BirdEye client
	birdeyeAPIKey := os.Getenv("BIRDEYE_API_KEY")
	if birdeyeAPIKey == "" {
		log.Fatal("❌ BIRDEYE_API_KEY environment variable is required")
	}

	birdeyeEndpoint := os.Getenv("BIRDEYE_ENDPOINT")
	if birdeyeEndpoint == "" {
		birdeyeEndpoint = "https://public-api.birdeye.so"
	}

	log.Printf("✅ BirdEye API key: %s...", birdeyeAPIKey[:8])
	log.Printf("✅ BirdEye endpoint: %s", birdeyeEndpoint)

	// Initialize BirdEye client directly
	birdeyeClient := birdeye.NewClient(&http.Client{}, birdeyeEndpoint, birdeyeAPIKey, nil)

	// Test cases with current UTC time (2025)
	testCases := []struct {
		name        string
		description string
		address     string
		historyType pb.GetPriceHistoryRequest_PriceHistoryType
		timestamp   time.Time
	}{
		{
			name:        "SOL 1H",
			description: "SOL token with 1 hour timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_ONE_HOUR,
			timestamp:   time.Now().UTC(),
		},
		{
			name:        "SOL 4H",
			description: "SOL token with 4 hour timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_FOUR_HOUR,
			timestamp:   time.Now().UTC(),
		},
		{
			name:        "SOL 1D",
			description: "SOL token with 1 day timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_ONE_DAY,
			timestamp:   time.Now().UTC(),
		},
		{
			name:        "SOL 1W",
			description: "SOL token with 1 week timeframe",
			address:     "So11111111111111111111111111111111111111112",
			historyType: pb.GetPriceHistoryRequest_ONE_WEEK,
			timestamp:   time.Now().UTC(),
		},
	}

	// Create table
	table := tablewriter.NewWriter(os.Stdout)
	table.Header("Test", "Timeframe", "Success", "Data Points", "Time Span", "First Price", "Last Price", "Status")

	for _, tc := range testCases {
		log.Printf("\n🧪 %s", tc.name)
		log.Printf("   Description: %s", tc.description)
		log.Printf("   Address: %s", tc.address)
		log.Printf("   History Type: %s", tc.historyType)
		log.Printf("   Time: %s", tc.timestamp.Format(time.RFC3339))

		// Get the timeframe config
		config, exists := price.TimeframeConfigMap[tc.historyType]
		if !exists {
			log.Printf("   ❌ No config found for history type: %v", tc.historyType)
			continue
		}

		log.Printf("   Config: BirdeyeType=%s, Duration=%v, Rounding=%v",
			config.BirdeyeType, config.DefaultViewDuration, config.Rounding)

		// Calculate time range like the service does
		timeFrom := tc.timestamp.Add(-config.DefaultViewDuration)
		timeTo := tc.timestamp

		// Round the times to appropriate granularity
		roundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
		roundedTimeTo := roundDateDown(timeTo, config.Rounding)

		// Ensure minimum time span
		minTimeSpan := config.DefaultViewDuration / 4
		if roundedTimeTo.Sub(roundedTimeFrom) < minTimeSpan {
			roundedTimeFrom = roundedTimeTo.Add(-config.DefaultViewDuration)
			log.Printf("   📏 Adjusted time range to ensure minimum span: %v", minTimeSpan)
		}

		log.Printf("   ⏰ Time range: %s to %s (span: %v)",
			roundedTimeFrom.Format("2006-01-02 15:04:05"),
			roundedTimeTo.Format("2006-01-02 15:04:05"),
			roundedTimeTo.Sub(roundedTimeFrom))

		// Call BirdEye client directly
		ctx := context.Background()
		params := birdeye.PriceHistoryParams{
			Address:     tc.address,
			AddressType: "token",
			HistoryType: config.BirdeyeType,
			TimeFrom:    roundedTimeFrom,
			TimeTo:      roundedTimeTo,
		}

		result, err := birdeyeClient.GetPriceHistory(ctx, params)

		var row []string
		if err != nil {
			log.Printf("   ❌ Error: %v", err)
			row = []string{
				tc.name,
				tc.historyType.String(),
				"❌ FAILED",
				"0",
				"N/A",
				"N/A",
				"N/A",
				fmt.Sprintf("Error: %v", err),
			}
		} else {
			dataPoints := len(result.Data.Items)
			var timeSpan time.Duration
			var firstPrice, lastPrice string
			var status string

			if dataPoints == 0 {
				status = "⚠️ NO DATA"
				firstPrice = "N/A"
				lastPrice = "N/A"
			} else if dataPoints == 1 {
				status = "⚠️ SINGLE POINT"
				firstPrice = fmt.Sprintf("$%.6f", result.Data.Items[0].Value)
				lastPrice = firstPrice
			} else {
				status = "✅ MULTIPLE POINTS"
				firstTime := time.Unix(result.Data.Items[0].UnixTime, 0)
				lastTime := time.Unix(result.Data.Items[dataPoints-1].UnixTime, 0)
				timeSpan = lastTime.Sub(firstTime)
				firstPrice = fmt.Sprintf("$%.6f", result.Data.Items[0].Value)
				lastPrice = fmt.Sprintf("$%.6f", result.Data.Items[dataPoints-1].Value)
			}

			log.Printf("   ✅ BirdEye API call succeeded!")
			log.Printf("   📊 Success: %t", result.Success)
			log.Printf("   📈 Data points: %d", dataPoints)
			if dataPoints > 0 {
				log.Printf("   🕐 First point: %s = %s",
					time.Unix(result.Data.Items[0].UnixTime, 0).Format("2006-01-02 15:04:05"),
					firstPrice)
				if dataPoints > 1 {
					log.Printf("   🕐 Last point:  %s = %s",
						time.Unix(result.Data.Items[dataPoints-1].UnixTime, 0).Format("2006-01-02 15:04:05"),
						lastPrice)
				}
			}
			log.Printf("   ⏱️  Time span: %s", timeSpan)

			if dataPoints <= 1 {
				log.Printf("   ⚠️  WARNING: Only %d data point(s) - charts need multiple points to render!", dataPoints)
				log.Printf("   💡 This explains why your charts are not working!")
			}

			row = []string{
				tc.name,
				tc.historyType.String(),
				"✅ SUCCESS",
				fmt.Sprintf("%d", dataPoints),
				timeSpan.String(),
				params.TimeFrom.Format(time.RFC3339),
				params.TimeTo.Format(time.RFC3339),
				status,
			}
		}

		table.Append(row)
	}

	log.Println("\n📊 Summary Table:")
	table.Render()

	log.Println("\n🔍 Root Cause Analysis:")
	log.Println("   • If you see only 1 data point per request, this explains why charts aren't rendering")
	log.Println("   • Charts need at least 2 data points to draw lines")
	log.Println("   • The issue is likely:")
	log.Println("     - BirdEye API has limited data for future timestamps (2025)")
	log.Println("     - Time range calculations might be too narrow")
	log.Println("     - Granularity settings might not match available data")
	log.Printf("   • Current system time: %s (UTC)", time.Now().UTC().Format(time.RFC3339))
}

// Copy the roundDateDown function from the service
func roundDateDown(dateToRound time.Time, granularityMinutes time.Duration) time.Time {
	if granularityMinutes <= 0 {
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
