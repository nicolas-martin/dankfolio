package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"os"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

func main() {
	// Set up logging
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	// Database connection
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://user:password@localhost:5432/dankfolio_dev?sslmode=disable"
	}

	store, err := postgres.NewStore(dsn, false, slog.LevelDebug, "development")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	ctx := context.Background()

	// Test 1: Search coins sorted by jupiter_listed_at
	fmt.Println("=== Test 1: Search coins sorted by jupiter_listed_at ===")
	coins, err := store.SearchCoins(ctx, "", nil, 0, 10, 0, "jupiter_listed_at", true)
	if err != nil {
		log.Fatalf("Failed to search coins: %v", err)
	}

	fmt.Printf("Found %d coins\n", len(coins))
	for i, coin := range coins {
		jupiterListedAt := "nil"
		if coin.JupiterListedAt != nil && !coin.JupiterListedAt.IsZero() {
			jupiterListedAt = coin.JupiterListedAt.Format("2006-01-02 15:04:05")
		}
		fmt.Printf("%d. %s (%s) - JupiterListedAt: %s\n", i+1, coin.Symbol, coin.MintAddress, jupiterListedAt)
	}

	// Test 2: Get a few raw coins directly to see their jupiter_created_at values
	fmt.Println("\n=== Test 2: Direct raw coins query ===")
	limit := 5
	rawCoins, _, err := store.RawCoins().ListWithOpts(ctx, db.ListOptions{
		Limit: &limit,
	})
	if err != nil {
		log.Fatalf("Failed to get raw coins: %v", err)
	}

	fmt.Printf("Found %d raw coins\n", len(rawCoins))
	for i, coin := range rawCoins {
		jupiterCreatedAt := "nil"
		if !coin.JupiterCreatedAt.IsZero() {
			jupiterCreatedAt = coin.JupiterCreatedAt.Format("2006-01-02 15:04:05")
		}
		fmt.Printf("%d. %s (%s) - JupiterCreatedAt: %s\n", i+1, coin.Symbol, coin.Address, jupiterCreatedAt)
	}

	// Test 3: Test mapping functions directly with model objects
	fmt.Println("\n=== Test 3: Test mapping functions with model objects ===")
	if len(rawCoins) > 0 {
		// Test mapRawCoinsToModel with model objects
		mappedCoins := mapRawCoinsToModel(rawCoins[:1])
		if len(mappedCoins) > 0 {
			fmt.Printf("Model raw coin mapped - JupiterListedAt: %v\n", mappedCoins[0].JupiterListedAt)
			if mappedCoins[0].JupiterListedAt != nil && !mappedCoins[0].JupiterListedAt.IsZero() {
				fmt.Printf("Model raw coin mapped - JupiterListedAt formatted: %s\n", mappedCoins[0].JupiterListedAt.Format("2006-01-02 15:04:05"))
			}
		}
	}

	// Test 4: Compare raw coin data vs search result data
	fmt.Println("\n=== Test 4: Compare raw coin vs search result ===")
	if len(rawCoins) > 0 && len(coins) > 0 {
		// Find a matching coin by mint address
		for _, rawCoin := range rawCoins {
			for _, searchCoin := range coins {
				if rawCoin.Address == searchCoin.MintAddress {
					fmt.Printf("MATCH FOUND: %s (%s)\n", rawCoin.Symbol, rawCoin.Address)

					rawJupiter := "nil"
					if !rawCoin.JupiterCreatedAt.IsZero() {
						rawJupiter = rawCoin.JupiterCreatedAt.Format("2006-01-02 15:04:05")
					}

					searchJupiter := "nil"
					if searchCoin.JupiterListedAt != nil && !searchCoin.JupiterListedAt.IsZero() {
						searchJupiter = searchCoin.JupiterListedAt.Format("2006-01-02 15:04:05")
					}

					fmt.Printf("  Raw coin JupiterCreatedAt: %s\n", rawJupiter)
					fmt.Printf("  Search coin JupiterListedAt: %s\n", searchJupiter)
					fmt.Printf("  Raw coin JupiterCreatedAt (value): %v\n", rawCoin.JupiterCreatedAt) // Changed format to %v
					fmt.Printf("  Search coin JupiterListedAt (value): %v\n", searchCoin.JupiterListedAt) // Changed format to %v, and also pointer if it was intended
					break
				}
			}
		}
	}

	// Test 5: Convert one coin to JSON to see the full structure
	if len(coins) > 0 {
		fmt.Println("\n=== Test 5: JSON representation of first coin ===")
		jsonData, err := json.MarshalIndent(coins[0], "", "  ")
		if err != nil {
			log.Printf("Failed to marshal coin to JSON: %v", err)
		} else {
			fmt.Println(string(jsonData))
		}
	}

	// Test 6: Convert raw coin to JSON
	if len(rawCoins) > 0 {
		fmt.Println("\n=== Test 6: JSON representation of first raw coin ===")
		jsonData, err := json.MarshalIndent(rawCoins[0], "", "  ")
		if err != nil {
			log.Printf("Failed to marshal raw coin to JSON: %v", err)
		} else {
			fmt.Println(string(jsonData))
		}
	}

	// Test 7: Query raw coins with same ORDER BY as SearchCoins
	fmt.Println("\n=== Test 7: Raw coins with ORDER BY jupiter_created_at DESC ===")
	sortedRawCoins, _, err := store.RawCoins().ListWithOpts(ctx, db.ListOptions{
		Limit:    &limit,
		SortBy:   func() *string { s := "jupiter_created_at"; return &s }(),
		SortDesc: func() *bool { b := true; return &b }(),
	})
	if err != nil {
		log.Fatalf("Failed to get sorted raw coins: %v", err)
	}

	fmt.Printf("Found %d sorted raw coins\n", len(sortedRawCoins))
	for i, coin := range sortedRawCoins {
		jupiterCreatedAt := "nil"
		if !coin.JupiterCreatedAt.IsZero() {
			jupiterCreatedAt = coin.JupiterCreatedAt.Format("2006-01-02 15:04:05")
		}
		fmt.Printf("%d. %s (%s) - JupiterCreatedAt: %s\n", i+1, coin.Symbol, coin.Address, jupiterCreatedAt)
	}
}

// Copy the mapping function to test it directly with model.RawCoin
func mapRawCoinsToModel(rawCoins []model.RawCoin) []model.Coin {
	coins := make([]model.Coin, len(rawCoins))
	for i, rc := range rawCoins {
		fmt.Printf("DEBUG: Mapping model raw coin %s, JupiterCreatedAt: %v\n", rc.Symbol, rc.JupiterCreatedAt)
		coins[i] = model.Coin{
			ID:              rc.ID,
			MintAddress:     rc.Address,
			Name:            rc.Name,
			Symbol:          rc.Symbol,
			Decimals:        rc.Decimals,
			IconUrl:         rc.LogoUrl,
			JupiterListedAt: &rc.JupiterCreatedAt,
		}
		fmt.Printf("DEBUG: Mapped to model coin %s, JupiterListedAt: %v\n", coins[i].Symbol, coins[i].JupiterListedAt)
	}
	return coins
}
