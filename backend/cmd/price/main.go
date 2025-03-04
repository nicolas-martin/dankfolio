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
	O        float64 `json:"o"`
	H        float64 `json:"h"`
	L        float64 `json:"l"`
	C        float64 `json:"c"`
	V        float64 `json:"v"`
	Type     string  `json:"type"`
	UnixTime int64   `json:"unixTime"`
}

func main() {
	url := "https://public-api.birdeye.so/defi/ohlcv/base_quote?base_address=So11111111111111111111111111111111111111112&quote_address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&type=15m"

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
	client := &http.Client{}

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	// Try to parse the response
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Invalid status code %v, %v", resp.StatusCode, string(body))
	}
	var priceResp PriceResponse
	if err := json.Unmarshal(body, &priceResp); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
		return
	}

	fmt.Printf("Raw Response:\n%s\n\n", string(body))

	// Print parsed response
	fmt.Printf("Parsed Response:\n")
	fmt.Printf("Success: %v\n", priceResp.Success)
	if priceResp.Success && len(priceResp.Data.Items) > 0 {
		fmt.Printf("First Price Item:\n")
		item := priceResp.Data.Items[0]
		fmt.Printf("  Time: %s\n", time.Unix(item.UnixTime, 0))
		fmt.Printf("  Address: %s\n", item.Address)
		fmt.Printf("  Open: %f\n", item.O)
		fmt.Printf("  High: %f\n", item.H)
		fmt.Printf("  Low: %f\n", item.L)
		fmt.Printf("  Close: %f\n", item.C)
		fmt.Printf("  Volume: %f\n", item.V)
		fmt.Printf("  Type: %s\n", item.Type)
	}
}
