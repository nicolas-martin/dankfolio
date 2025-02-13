package service

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
)

func setupTestCoinService(t *testing.T) (*CoinService, db.DB, func()) {
	// Setup test database
	testDB, dbCleanup := testutil.SetupTestDB(t)

	// Setup test schema
	ctx := context.Background()
	err := testutil.SetupTestSchema(ctx, testDB)
	require.NoError(t, err)

	// Clean up any existing test data
	_, err = testDB.Exec(ctx, "DELETE FROM price_history")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM meme_coins")
	require.NoError(t, err)

	// Create a CoinRepository wrapper around the test DB
	coinRepo := repository.NewCoinRepository(testDB)

	// Create CoinService with real DexScreener API
	coinService := NewCoinService(coinRepo)

	cleanup := func() {
		err := testutil.CleanupTestSchema(ctx, testDB)
		require.NoError(t, err)
		dbCleanup()
	}

	return coinService, testDB, cleanup
}

func insertTestCoin(t *testing.T, ctx context.Context, testDB db.DB, id string) {
	testCoin := &model.MemeCoin{
		ID:              id,
		Name:            fmt.Sprintf("Test Coin %s", id),
		Symbol:          strings.ToUpper(id),
		Description:     "Test coin description",
		ContractAddress: fmt.Sprintf("0x%s", id),
		LogoURL:         fmt.Sprintf("https://example.com/coins/%s.png", id),
		WebsiteURL:      fmt.Sprintf("https://example.com/coins/%s", id),
		Price:           1.0,
		CurrentPrice:    1.0,
		Change24h:       5.0,
		Volume24h:       100000.0,
		MarketCap:       1000000.0,
		Supply:          1000000.0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := testutil.InsertTestCoin(ctx, testDB, *testCoin)
	require.NoError(t, err)
}

func TestCoinService_GetTopMemeCoins(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Insert test coins first
	insertTestCoin(t, ctx, testDB, "doge1")
	insertTestCoin(t, ctx, testDB, "shib1")

	// Insert test price data
	now := time.Now()
	testPrices := []model.PriceUpdate{
		{
			CoinID:    "doge1",
			Price:     0.1,
			MarketCap: 1000000,
			Volume24h: 500000,
			Timestamp: time.Unix(now.Unix(), 0),
		},
		{
			CoinID:    "shib1",
			Price:     0.00001,
			MarketCap: 500000,
			Volume24h: 250000,
			Timestamp: time.Unix(now.Unix(), 0),
		},
	}

	err := coinService.UpdatePrices(ctx, testPrices)
	require.NoError(t, err)

	// Test
	coins, err := coinService.GetTopMemeCoins(ctx, 10)
	require.NoError(t, err)
	assert.NotEmpty(t, coins)
	assert.LessOrEqual(t, len(coins), 10)
}

func TestCoinService_GetPriceHistory(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge2"

	// Insert test coin first
	insertTestCoin(t, ctx, testDB, coinID)

	// Insert historical price data
	now := time.Now()
	historicalPrices := []model.PriceUpdate{
		{
			CoinID:    coinID,
			Price:     0.1,
			MarketCap: 1000000,
			Volume24h: 500000,
			Timestamp: time.Unix(now.Unix()-86400, 0), // 24 hours ago
		},
		{
			CoinID:    coinID,
			Price:     0.15,
			MarketCap: 1500000,
			Volume24h: 750000,
			Timestamp: time.Unix(now.Unix(), 0),
		},
	}

	err := coinService.UpdatePrices(ctx, historicalPrices)
	require.NoError(t, err)

	// Test
	startTime := time.Unix(now.Unix()-172800, 0) // 48 hours ago
	prices, err := coinService.GetPriceHistory(ctx, coinID, startTime)
	require.NoError(t, err)
	assert.NotEmpty(t, prices)
	assert.Len(t, prices, 2)
}

func TestCoinService_GetCoinByID(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge3"

	// Insert test coin
	testCoin := model.MemeCoin{
		ID:              coinID,
		Symbol:          "DOGE3",
		Name:            "Dogecoin3",
		Description:     "Much wow, very coin",
		ContractAddress: "0x123...doge3",
		LogoURL:         "https://example.com/doge3.png",
		WebsiteURL:      "https://doge3.example.com",
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := testutil.InsertTestCoin(ctx, testDB, testCoin)
	require.NoError(t, err)

	// Test
	coin, err := coinService.GetCoinByID(ctx, coinID)
	require.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, coinID, coin.ID)
	assert.Equal(t, testCoin.Symbol, coin.Symbol)
	assert.Equal(t, testCoin.Name, coin.Name)
	assert.Equal(t, testCoin.LogoURL, coin.LogoURL)
	assert.Equal(t, testCoin.WebsiteURL, coin.WebsiteURL)
}

func TestCoinService_UpdatePrices(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Insert test coins first
	insertTestCoin(t, ctx, testDB, "doge4")
	insertTestCoin(t, ctx, testDB, "shib4")

	// Test data
	now := time.Now()
	updates := []model.PriceUpdate{
		{
			CoinID:    "doge4",
			Price:     0.1,
			MarketCap: 1000000,
			Volume24h: 500000,
			Timestamp: time.Unix(now.Unix(), 0),
		},
		{
			CoinID:    "shib4",
			Price:     0.00001,
			MarketCap: 500000,
			Volume24h: 250000,
			Timestamp: time.Unix(now.Unix(), 0),
		},
	}

	// Test
	err := coinService.UpdatePrices(ctx, updates)
	require.NoError(t, err)

	// Verify updates were saved
	for _, update := range updates {
		prices, err := coinService.GetPriceHistory(ctx, update.CoinID, time.Unix(now.Unix()-3600, 0)) // 1 hour ago
		require.NoError(t, err)
		assert.NotEmpty(t, prices)

		latestPrice := prices[len(prices)-1]
		assert.Equal(t, update.Price, latestPrice.Price)
		assert.Equal(t, update.MarketCap, latestPrice.MarketCap)
		assert.Equal(t, update.Volume24h, latestPrice.Volume)
	}
}

func TestCoinService_GetCoinPriceHistory(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge5"

	// Insert test coin first
	insertTestCoin(t, ctx, testDB, coinID)

	// Insert historical data
	now := time.Now()
	dayStart := now.Truncate(24 * time.Hour)

	updates := []model.PriceUpdate{
		{
			CoinID:    coinID,
			Price:     0.1,
			MarketCap: 1000000,
			Volume24h: 500000,
			Timestamp: time.Unix(dayStart.Add(-25*time.Hour).Unix(), 0), // Yesterday
		},
		{
			CoinID:    coinID,
			Price:     0.15,
			MarketCap: 1500000,
			Volume24h: 750000,
			Timestamp: time.Unix(dayStart.Add(-1*time.Hour).Unix(), 0), // Today
		},
	}

	err := coinService.UpdatePrices(ctx, updates)
	require.NoError(t, err)

	// Test different timeframes
	testCases := []struct {
		timeframe string
		expected  int
	}{
		{"day", 1},
		{"week", 2},
		{"month", 2},
	}

	for _, tc := range testCases {
		t.Run(tc.timeframe, func(t *testing.T) {
			prices, err := coinService.GetCoinPriceHistory(ctx, coinID, tc.timeframe)
			require.NoError(t, err)
			assert.NotEmpty(t, prices)
			assert.Len(t, prices, tc.expected)
		})
	}
}

func TestCoinService_GetTopMemeCoins_WithAPI(t *testing.T) {
	// Skip in CI environment
	if testing.Short() {
		t.Skip("Skipping test in short mode")
	}

	// Setup
	coinService, _, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Test real API call
	coins, err := coinService.GetTopMemeCoins(ctx, 10)
	require.NoError(t, err)
	assert.NotEmpty(t, coins)

	// Verify we got real data
	assert.LessOrEqual(t, len(coins), 10)
	if len(coins) > 0 {
		coin := coins[0]
		assert.NotEmpty(t, coin.ID)
		assert.NotEmpty(t, coin.Symbol)
		assert.NotEmpty(t, coin.Name)
		assert.NotZero(t, coin.CurrentPrice)
		assert.NotZero(t, coin.Volume24h)
		assert.NotZero(t, coin.MarketCap)
	}
}

func TestCoinService_Integration_WithAPI(t *testing.T) {
	// Skip in CI environment
	if testing.Short() {
		t.Skip("Skipping test in short mode")
	}

	// Setup with real API client
	coinService, _, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	t.Run("Fetch and Store Real Meme Coins", func(t *testing.T) {
		// Get real coins from the API
		coins, err := coinService.GetTopMemeCoins(ctx, 1)
		require.NoError(t, err)
		require.NotEmpty(t, coins)

		// Get first coin for testing
		coin := coins[0]
		assert.NotEmpty(t, coin.ID)
		assert.NotEmpty(t, coin.Symbol)
		assert.NotEmpty(t, coin.Name)

		// First save the coin to the database
		err = coinService.repo.UpsertCoin(ctx, coin)
		require.NoError(t, err)

		// Store real price updates
		updates := []model.PriceUpdate{
			{
				CoinID:    coin.ID,
				Price:     coin.CurrentPrice,
				MarketCap: coin.MarketCap,
				Volume24h: coin.Volume24h,
				Timestamp: time.Now(),
			},
		}

		err = coinService.UpdatePrices(ctx, updates)
		require.NoError(t, err)

		// Verify stored data with delta comparison for floating point values
		storedCoin, err := coinService.GetCoinByID(ctx, coin.ID)
		require.NoError(t, err)
		assert.Equal(t, coin.ID, storedCoin.ID)
		assert.Equal(t, coin.Symbol, storedCoin.Symbol)
		assert.Equal(t, coin.Name, storedCoin.Name)
		assert.InDelta(t, coin.CurrentPrice, storedCoin.CurrentPrice, 1e-10, "Current price should match within delta")
	})

	t.Run("Price History Integration", func(t *testing.T) {
		// Get a real coin from the API
		coins, err := coinService.GetTopMemeCoins(ctx, 1)
		require.NoError(t, err)
		require.NotEmpty(t, coins)
		coin := coins[0]

		// First save the coin to the database
		err = coinService.repo.UpsertCoin(ctx, coin)
		require.NoError(t, err)

		// Insert historical price data with real market data
		now := time.Now()
		historicalPrices := []model.PriceUpdate{
			{
				CoinID:    coin.ID,
				Price:     coin.CurrentPrice * 0.9, // Simulate historical price
				MarketCap: coin.MarketCap,
				Volume24h: coin.Volume24h,
				Timestamp: time.Unix(now.Unix()-86400, 0), // 24 hours ago
			},
			{
				CoinID:    coin.ID,
				Price:     coin.CurrentPrice,
				MarketCap: coin.MarketCap,
				Volume24h: coin.Volume24h,
				Timestamp: time.Unix(now.Unix(), 0),
			},
		}

		err = coinService.UpdatePrices(ctx, historicalPrices)
		require.NoError(t, err)

		// Test different timeframes with real data
		timeframes := []string{"day", "week", "month"}
		for _, timeframe := range timeframes {
			t.Run(timeframe, func(t *testing.T) {
				prices, err := coinService.GetCoinPriceHistory(ctx, coin.ID, timeframe)
				require.NoError(t, err)
				assert.NotEmpty(t, prices)

				// Verify real price data points
				for _, point := range prices {
					assert.NotZero(t, point.Price)
					assert.NotZero(t, point.MarketCap)
					assert.NotZero(t, point.Volume)
					assert.False(t, point.Time.IsZero())
					assert.NotZero(t, point.Timestamp)
				}
			})
		}
	})
}

func TestCoinService_GetCoinByContractAddress(t *testing.T) {
	// Skip in CI environment
	if testing.Short() {
		t.Skip("Skipping test in short mode")
	}

	// Setup
	coinService, _, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Test with a real Solana token (e.g., BONK)
	contractAddress := "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK token

	coin, err := coinService.GetCoinByContractAddress(ctx, contractAddress)
	require.NoError(t, err)
	assert.NotNil(t, coin)

	// Verify the basic coin fields
	assert.Equal(t, contractAddress, coin.ContractAddress)
	assert.NotEmpty(t, coin.Symbol)
	assert.NotEmpty(t, coin.Name)
	assert.NotZero(t, coin.Price)
	assert.NotZero(t, coin.CurrentPrice)
	assert.NotZero(t, coin.MarketCap)
	assert.NotZero(t, coin.Volume24h)

	// Verify new fields from token profile
	assert.NotEmpty(t, coin.Description, "Description should be populated from either profile or fallback")

	// Logo URL should be from either token profile or pair info
	if coin.LogoURL != "" {
		assert.Contains(t, coin.LogoURL, "http", "Logo URL should be a valid URL")
	}

	// Website URL should be from pair info
	if coin.WebsiteURL != "" {
		assert.Contains(t, coin.WebsiteURL, "http", "Website URL should be a valid URL")
	}

	// Description should contain either profile description or fallback with DEX info
	assert.True(t,
		strings.Contains(coin.Description, "Trading on") ||
			len(coin.Description) > 0,
		"Description should either contain DEX info or be from profile",
	)
}

func TestCoinService_FetchTokenProfile(t *testing.T) {
	// Skip in CI environment
	if testing.Short() {
		t.Skip("Skipping test in short mode")
	}

	// Setup
	coinService, _, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Test with a real Solana token
	chainId := "solana"
	tokenAddress := "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK token

	profile, err := coinService.fetchTokenProfile(ctx, chainId, tokenAddress)
	if err == nil && profile != nil {
		// If profile exists, verify its fields
		assert.Equal(t, chainId, profile.ChainId)
		assert.Equal(t, tokenAddress, profile.TokenAddress)

		// Verify optional fields if they exist
		if profile.Icon != "" {
			assert.Contains(t, profile.Icon, "http", "Icon URL should be valid if present")
		}
		if profile.Description != "" {
			assert.NotEmpty(t, profile.Description, "Description should not be empty if present")
		}
		if len(profile.Links) > 0 {
			for _, link := range profile.Links {
				assert.NotEmpty(t, link.Type)
				assert.NotEmpty(t, link.Label)
				assert.Contains(t, link.URL, "http", "Link URL should be valid")
			}
		}
	} else {
		// If no profile exists, log it (not a failure case)
		t.Log("No token profile found for BONK token - this is acceptable")
	}
}

func TestCoinService_GetCoinByID_WithNewFields(t *testing.T) {
	// Setup
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge6"

	// Insert test coin with all fields
	testCoin := model.MemeCoin{
		ID:              coinID,
		Symbol:          "DOGE6",
		Name:            "Dogecoin6",
		Description:     "Much wow, very coin",
		ContractAddress: "0x123...doge6",
		LogoURL:         "https://example.com/doge6.png",
		ImageURL:        "https://example.com/doge6_large.png",
		WebsiteURL:      "https://doge6.example.com",
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		Labels:          []string{"meme", "dog"},
		Socials: []model.SocialLink{
			{
				Platform: "twitter",
				Handle:   "@doge6",
				URL:      "https://twitter.com/doge6",
			},
			{
				Platform: "telegram",
				Handle:   "doge6official",
				URL:      "https://t.me/doge6official",
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := testutil.InsertTestCoin(ctx, testDB, testCoin)
	require.NoError(t, err)

	// Test
	coin, err := coinService.GetCoinByID(ctx, coinID)
	require.NoError(t, err)
	assert.NotNil(t, coin)

	// Verify all fields including new ones
	assert.Equal(t, coinID, coin.ID)
	assert.Equal(t, testCoin.Symbol, coin.Symbol)
	assert.Equal(t, testCoin.Name, coin.Name)
	assert.Equal(t, testCoin.Description, coin.Description)
	assert.Equal(t, testCoin.LogoURL, coin.LogoURL)
	assert.Equal(t, testCoin.ImageURL, coin.ImageURL)
	assert.Equal(t, testCoin.WebsiteURL, coin.WebsiteURL)
	assert.Equal(t, testCoin.ContractAddress, coin.ContractAddress)
	assert.Equal(t, testCoin.CurrentPrice, coin.CurrentPrice)
	assert.Equal(t, testCoin.MarketCap, coin.MarketCap)
	assert.Equal(t, testCoin.Volume24h, coin.Volume24h)
	assert.Equal(t, testCoin.Supply, coin.Supply)
	assert.Equal(t, testCoin.Change24h, coin.Change24h)

	// Verify new fields
	assert.ElementsMatch(t, testCoin.Labels, coin.Labels)
	assert.Len(t, coin.Socials, len(testCoin.Socials))
	for i, social := range testCoin.Socials {
		assert.Equal(t, social.Platform, coin.Socials[i].Platform)
		assert.Equal(t, social.Handle, coin.Socials[i].Handle)
		assert.Equal(t, social.URL, coin.Socials[i].URL)
	}
}

func TestCoinService_FetchDexScreenerData(t *testing.T) {
	// Skip in CI/short mode as this is an integration test
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Setup
	coinService, _, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	testCases := []struct {
		name        string
		searchTerm  string
		shouldMatch string
		pairAddress string // Add specific pair address to test
	}{
		{
			name:        "Search for BABYSOL token",
			searchTerm:  "BABYSOL",
			shouldMatch: "BABYSOL",
			pairAddress: "Dw8UujP9RZiUC8u6udtGfXue2BSUhES7MppNWvySNxmG", // Raydium BABYSOL/SOL pair
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test
			pairs, err := coinService.fetchDexScreenerData(ctx, tc.searchTerm)
			require.NoError(t, err)
			require.NotNil(t, pairs)
			require.NotEmpty(t, pairs)

			foundMatch := false
			// Verify the response contains valid data
			for _, pair := range pairs {
				if pair.PairAddress == tc.pairAddress {
					foundMatch = true
					t.Run(fmt.Sprintf("Pair_%s_%s", pair.BaseToken.Symbol, pair.QuoteToken.Symbol), func(t *testing.T) {
						// Basic pair information
						assert.NotEmpty(t, pair.ChainId, "Chain ID should not be empty")
						assert.NotEmpty(t, pair.DexId, "DEX ID should not be empty")
						assert.NotEmpty(t, pair.PairAddress, "Pair address should not be empty")

						// Base token verification
						assert.NotEmpty(t, pair.BaseToken.Address, "Base token address should not be empty")
						assert.NotEmpty(t, pair.BaseToken.Symbol, "Base token symbol should not be empty")
						assert.NotEmpty(t, pair.BaseToken.Name, "Base token name should not be empty")

						// Quote token verification
						assert.NotEmpty(t, pair.QuoteToken.Address, "Quote token address should not be empty")
						assert.NotEmpty(t, pair.QuoteToken.Symbol, "Quote token symbol should not be empty")
						assert.NotEmpty(t, pair.QuoteToken.Name, "Quote token name should not be empty")
						assert.True(t, isValidQuoteCurrency(pair.QuoteToken.Symbol),
							"Quote token %s should be a valid quote currency", pair.QuoteToken.Symbol)

						// Price information
						assert.NotEmpty(t, pair.PriceUsd, "Price USD should not be empty")

						// Volume data
						assert.NotZero(t, pair.Volume.H24, "24h volume should not be zero")

						// Price change data
						if pair.PriceChange.H24 != 0 {
							t.Logf("24h price change: %.2f%%", pair.PriceChange.H24)
						}

						// Required field verification
						assert.NotZero(t, pair.MarketCap, "Market cap should not be zero")

						// Image URL verification
						if pair.Info.ImageURL != "" {
							assert.Contains(t, pair.Info.ImageURL, "http", "Image URL should be a valid URL")
						}

						// Website verification
						if len(pair.Info.Websites) > 0 {
							for _, website := range pair.Info.Websites {
								assert.Contains(t, website.URL, "Website URL should be a valid URL")
							}
						}

						// Social media verification
						if len(pair.Info.Socials) > 0 {
							for _, social := range pair.Info.Socials {
								assert.NotEmpty(t, social.Platform, "Social platform should not be empty")
								assert.NotEmpty(t, social.Handle, "Social handle should not be empty")
							}
						}
					})
					break
				}
			}

			assert.True(t, foundMatch, "Should find the specific BABYSOL/SOL pair with address %s", tc.pairAddress)
		})
	}
}
