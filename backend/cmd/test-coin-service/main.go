package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
)

// Minimal config for testing
type Config struct {
	DBURL           string `envconfig:"DB_URL" required:"true"`
	BirdEyeEndpoint string `envconfig:"BIRDEYE_ENDPOINT" required:"true"`
	BirdEyeAPIKey   string `envconfig:"BIRDEYE_API_KEY" required:"true"`
}

func main() {
	// Load environment
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Could not load .env: %v", err)
	}

	// Parse config
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Set up structured logging
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	})
	slog.SetDefault(slog.New(handler))

	ctx := context.Background()

	// Initialize database
	store, err := postgres.NewStore(cfg.DBURL, false, slog.LevelInfo, "")
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize clients
	httpClient := &http.Client{Timeout: 30 * time.Second}
	birdeyeClient := birdeye.NewClient(httpClient, cfg.BirdEyeEndpoint, cfg.BirdEyeAPIKey)
	
	// Create a simple in-memory cache
	type inMemoryCache struct{}
	func (c *inMemoryCache) Get(ctx context.Context, key string) (interface{}, error) {
		return nil, fmt.Errorf("not found")
	}
	func (c *inMemoryCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
		return nil
	}
	func (c *inMemoryCache) Delete(ctx context.Context, key string) error {
		return nil
	}
	coinCache := &inMemoryCache{}

	// Create coin service with minimal config
	coinConfig := &coin.Config{
		InitializeXStocksOnStartup: false,
	}
	
	coinService := coin.NewService(
		coinConfig,
		nil,    // jupiter client not needed for this test
		store,
		nil,    // chain client not needed
		birdeyeClient,
		nil,    // api tracker not needed
		nil,    // offchain client not needed
		coinCache,
	)

	// Test tokens
	testTokens := []struct {
		name    string
		address string
	}{
		{"ANI", "9tqjeRS1swj36Ee5C1iGiwAxjQJNGAVCzaTLwFY8bonk"},
		{"BONK", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"},
		{"WIF", "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"},
		{"Native SOL", "11111111111111111111111111111111"},
		{"Wrapped SOL", "So11111111111111111111111111111111111111112"},
		{"MASK", "6MQpbiTC2YcogidTmKqMLK82qvE9z5QEm7EP3AEDpump"},
	}

	fmt.Println("=== Testing Coin Service with Enhanced Logging ===\n")

	for _, token := range testTokens {
		fmt.Printf("\n--- Testing %s ---\n", token.name)
		fmt.Printf("Address: %s\n", token.address)

		coin, err := coinService.GetCoinByAddress(ctx, token.address)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			continue
		}

		fmt.Printf("✅ Success!\n")
		fmt.Printf("   ID: %d\n", coin.ID)
		fmt.Printf("   Symbol: %s\n", coin.Symbol)
		fmt.Printf("   Name: %s\n", coin.Name)
		fmt.Printf("   Address: %s\n", coin.Address)
		fmt.Printf("   Decimals: %d\n", coin.Decimals)
		fmt.Printf("   Price: $%.6f\n", coin.Price)
		fmt.Printf("   Market Cap: $%.2f\n", coin.Marketcap)
		fmt.Printf("   24h Volume: $%.2f\n", coin.Volume24hUSD)
		fmt.Printf("   Last Updated: %s\n", coin.LastUpdated)
	}

	// Test invalid address
	fmt.Printf("\n--- Testing Invalid Address ---\n")
	_, err = coinService.GetCoinByAddress(ctx, "invalid-address")
	if err != nil {
		fmt.Printf("✅ Expected error: %v\n", err)
	} else {
		fmt.Printf("❌ Should have failed for invalid address\n")
	}

	// Test non-existent token
	fmt.Printf("\n--- Testing Non-existent Token ---\n")
	_, err = coinService.GetCoinByAddress(ctx, "11111111111111111111111111111112") // Random valid-looking address
	if err != nil {
		fmt.Printf("✅ Expected error: %v\n", err)
	} else {
		fmt.Printf("❌ Should have failed for non-existent token\n")
	}

	fmt.Println("\n✅ Coin service test completed. Check logs above for detailed information.")
}