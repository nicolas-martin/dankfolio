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

	ctx := context.Background()

	// Setup test database
	coinService, testDB, cleanup := setupTestCoinService(t)
	defer cleanup()

	// Setup test schema
	err := testutil.SetupTestSchema(ctx, testDB)
	require.NoError(t, err)
	defer func() {
		err := testutil.CleanupTestSchema(ctx, testDB)
		require.NoError(t, err)
	}()

	t.Run("Fetch and Store Real Meme Coins", func(t *testing.T) {
		// First fetch coins from real API
		coins, err := coinService.GetTopMemeCoins(ctx, 10)
		require.NoError(t, err)
		require.NotEmpty(t, coins)

		// Get first coin for testing
		coin := coins[0]
		assert.NotEmpty(t, coin.ID)
		assert.NotEmpty(t, coin.Symbol)
		assert.NotEmpty(t, coin.Name)

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

		// Verify stored data
		storedCoin, err := coinService.GetCoinByID(ctx, coin.ID)
		require.NoError(t, err)
		assert.Equal(t, coin.ID, storedCoin.ID)
		assert.Equal(t, coin.Symbol, storedCoin.Symbol)
		assert.Equal(t, coin.Name, storedCoin.Name)
		assert.Equal(t, coin.CurrentPrice, storedCoin.CurrentPrice)
	})

	t.Run("Price History Integration", func(t *testing.T) {
		// Get a real coin from the API
		coins, err := coinService.GetTopMemeCoins(ctx, 1)
		require.NoError(t, err)
		require.NotEmpty(t, coins)
		coin := coins[0]

		// Insert historical price data
		now := time.Now()
		historicalPrices := []model.PriceUpdate{
			{
				CoinID:    coin.ID,
				Price:     coin.CurrentPrice * 0.9, // 10% lower price for history
				MarketCap: coin.MarketCap * 0.9,
				Volume24h: coin.Volume24h * 0.9,
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

		// Test different timeframes
		timeframes := []string{"day", "week", "month"}
		for _, timeframe := range timeframes {
			t.Run(timeframe, func(t *testing.T) {
				prices, err := coinService.GetCoinPriceHistory(ctx, coin.ID, timeframe)
				require.NoError(t, err)
				assert.NotEmpty(t, prices)

				// Verify price points
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
