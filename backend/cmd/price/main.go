package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

type PriceResponse struct {
	Data struct {
		Items []PriceItem `json:"items"`
	} `json:"data"`
	Success bool `json:"success"`
}

type PriceItem struct {
	Address  string  `json:"address"`
	UnixTime int64   `json:"unixTime"`
	Value    float64 `json:"value"`
}

func main() {
	// SOL token address
	tokenAddress := "So11111111111111111111111111111111111111112"
	timeFrom := time.Now().Add(-24 * time.Hour).Unix()
	timeTo := time.Now().Unix()

	url := fmt.Sprintf("https://public-api.birdeye.so/defi/history_price?address=%s&address_type=token&type=15m&time_from=%d&time_to=%d",
		tokenAddress, timeFrom, timeTo)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	// Set required headers
	req.Header.Set("accept", "application/json")
	req.Header.Set("x-chain", "solana")
	req.Header.Set("X-API-KEY", os.Getenv("BIRDEYE_API_KEY"))
	req.Header.Set("User-Agent", "dankfolio/1.0")

	// Create a client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	// Print raw response for debugging
	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	fmt.Printf("Raw Response:\n%s\n\n", string(body))

	// Try to parse the response
	if resp.StatusCode == http.StatusOK {
		var priceResp PriceResponse
		if err := json.Unmarshal(body, &priceResp); err != nil {
			log.Fatalf("Failed to parse response: %v", err)
		}

		// Print parsed response
		fmt.Printf("Parsed Response:\n")
		fmt.Printf("Success: %v\n", priceResp.Success)
		if priceResp.Success && len(priceResp.Data.Items) > 0 {
			fmt.Printf("First Price Item:\n")
			item := priceResp.Data.Items[0]
			fmt.Printf("  Time: %s\n", time.Unix(item.UnixTime, 0))
			fmt.Printf("  Address: %s\n", item.Address)
			fmt.Printf("  Value: %f\n", item.Value)
		}
	}
}
