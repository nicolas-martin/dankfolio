package service

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
)

func setupTestCoinService(t *testing.T) (*CoinService, func()) {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Clean up any existing test data
	ctx := context.Background()
	_, err := testDB.Exec(ctx, "DELETE FROM price_history")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM meme_coins")
	require.NoError(t, err)

	return NewCoinService(testDB), cleanup
}

func insertTestCoin(t *testing.T, ctx context.Context, coinService *CoinService, id string) {
	testCoin := model.MemeCoin{
		ID:              id,
		Symbol:          fmt.Sprintf("%s_symbol", id),
		Name:            fmt.Sprintf("%s coin", id),
		Description:     "Test coin",
		ContractAddress: fmt.Sprintf("0x123...%s", id),
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := testutil.InsertTestCoin(ctx, coinService.db, testCoin)
	require.NoError(t, err)
}

func TestCoinService_GetTopMemeCoins(t *testing.T) {
	// Setup
	coinService, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Insert test coins first
	insertTestCoin(t, ctx, coinService, "doge1")
	insertTestCoin(t, ctx, coinService, "shib1")

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
	coinService, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge2"

	// Insert test coin first
	insertTestCoin(t, ctx, coinService, coinID)

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
	coinService, cleanup := setupTestCoinService(t)
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

	err := testutil.InsertTestCoin(ctx, coinService.db, testCoin)
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
	coinService, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()

	// Insert test coins first
	insertTestCoin(t, ctx, coinService, "doge4")
	insertTestCoin(t, ctx, coinService, "shib4")

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
	coinService, cleanup := setupTestCoinService(t)
	defer cleanup()

	ctx := context.Background()
	coinID := "doge5"

	// Insert test coin first
	insertTestCoin(t, ctx, coinService, coinID)

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
