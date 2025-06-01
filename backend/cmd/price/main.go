package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
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
	birdeyeClient := birdeye.NewClient("https://public-api.birdeye.so/defi", apiKey)
	jupiterClient := jupiter.NewClient(httpClient, "https://api.jup.ag", "")

	// Initialize price service with clients
	s := price.NewService(birdeyeClient, jupiterClient, nil)

	mintAdd := "6pKHwNCpzgZuC9o5FzvCZkYSUGfQddhUYtMyDbEVpump"
	from := time.Now().Add(-24 * time.Hour).Unix() // 24 hours ago
	to := time.Now().Unix()
	addType := "token"
	histType := "30m"

	// func (s *Service) GetPriceHistory(ctx context.Context, address string, historyType string, timeFrom, timeTo int64, addressType string) (*model.PriceHistoryResponse, error) {
	resp, err := s.GetPriceHistory(context.Background(), mintAdd, histType, fmt.Sprintf("%d", from), fmt.Sprintf("%d", to), addType)
	if err != nil {
		fmt.Println(err)
		return
	}
	b, _ := json.Marshal(resp)
	fmt.Println(string(b))
}
