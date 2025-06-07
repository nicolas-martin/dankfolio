package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

func init() {
	// Load .env file from the project root
	if err := godotenv.Load("../../.env"); err != nil {
		fmt.Printf("Warning: Error loading .env file: %v\n", err)
	}
}

func main() {
	apiKey := os.Getenv("BIRDEYE_API_KEY")
	if apiKey == "" {
		fmt.Println("BIRDEYE_API_KEY not found in environment")
		return
	}

	// Initialize clients
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}
	// Create API tracker
	apiTracker := clients.NewAPICallTracker()

	birdeyeClient := birdeye.NewClient(httpClient, "https://public-api.birdeye.so/defi", apiKey, apiTracker)
	jupiterClient := jupiter.NewClient(httpClient, "https://api.jup.ag", "", apiTracker)

	// Initialize price service with clients
	s := price.NewService(birdeyeClient, jupiterClient, nil, nil)

	mintAdd := "6pKHwNCpzgZuC9o5FzvCZkYSUGfQddhUYtMyDbEVpump"
	from := time.Now().Add(-24 * time.Hour).Unix() // 24 hours ago
	c := price.BackendTimeframeConfig{
		BirdeyeType:         "1H",
		DefaultViewDuration: 1 * time.Hour,
		Rounding:            1 * time.Minute,
		HistoryType:         pb.GetPriceHistoryRequest_PriceHistoryType_name[int32(pb.GetPriceHistoryRequest_ONE_HOUR)],
	}
	resp, err := s.GetPriceHistory(context.Background(), mintAdd, c, fmt.Sprintf("%d", from), "token")
	if err != nil {
		fmt.Println(err)
		return
	}
	b, _ := json.Marshal(resp)
	fmt.Println(string(b))
}
