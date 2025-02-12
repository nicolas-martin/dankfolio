package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
)

func setupTestTradeService(t *testing.T) (*TradeService, *CoinService, *WalletService, *SolanaTradeService, func()) {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Create service instances
	coinService := NewCoinService(testDB)
	walletService := NewWalletService(testDB)
	solanaService, err := NewSolanaTradeService(
		"https://api.testnet.solana.com",
		"wss://api.testnet.solana.com",
		"your-test-program-id",
		"your-test-pool-wallet",
	)
	require.NoError(t, err)
	tradeService := NewTradeService(testDB, coinService, walletService, solanaService)

	// Clean up any existing test data
	ctx := context.Background()
	_, err = testDB.Exec(ctx, "DELETE FROM price_history")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM portfolios")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM trades")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM meme_coins")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM wallets")
	require.NoError(t, err)

	return tradeService, coinService, walletService, solanaService, cleanup
}

func setupTestUser(t *testing.T, ctx context.Context, walletService *WalletService) string {
	userID := "test_user"

	// Clean up any existing wallets for this user
	_, err := walletService.db.Exec(ctx, "DELETE FROM wallets WHERE user_id = $1", userID)
	require.NoError(t, err)

	// Create a test wallet with some initial balance
	wallet := model.Wallet{
		ID:          "test_wallet",
		UserID:      userID,
		PublicKey:   "0x123...",
		Balance:     1000.0, // Initial balance for testing
		LastUpdated: time.Now(),
	}

	err = testutil.InsertTestWallet(ctx, walletService.db, wallet)
	require.NoError(t, err)

	return userID
}

func TestTradeService_PreviewTrade(t *testing.T) {
	// Setup
	tradeService, coinService, _, _, cleanup := setupTestTradeService(t)
	defer cleanup()

	ctx := context.Background()

	// Insert test coin
	coinID := "doge1"
	insertTestCoin(t, ctx, coinService, coinID)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    coinID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err := coinService.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Test buy preview
	buyReq := model.TradeRequest{
		UserID:    "test_user",
		CoinID:    coinID,
		Type:      "buy",
		Amount:    100,
		OrderType: "market",
	}

	buyPreview, err := tradeService.PreviewTrade(ctx, buyReq)
	require.NoError(t, err)
	assert.NotNil(t, buyPreview)
	assert.Equal(t, "buy", buyPreview.Type)
	assert.Equal(t, 100.0, buyPreview.Amount)
	assert.Equal(t, 0.1, buyPreview.Price)
	assert.Equal(t, 10.0, buyPreview.TotalCost) // 100 * 0.1
	assert.Greater(t, buyPreview.Fee, 0.0)      // Should have some fee

	// Test sell preview
	sellReq := model.TradeRequest{
		UserID:    "test_user",
		CoinID:    coinID,
		Type:      "sell",
		Amount:    50,
		OrderType: "market",
	}

	sellPreview, err := tradeService.PreviewTrade(ctx, sellReq)
	require.NoError(t, err)
	assert.NotNil(t, sellPreview)
	assert.Equal(t, "sell", sellPreview.Type)
	assert.Equal(t, 50.0, sellPreview.Amount)
	assert.Equal(t, 0.1, sellPreview.Price)
	assert.Equal(t, 5.0, sellPreview.TotalCost) // 50 * 0.1
	assert.Greater(t, sellPreview.Fee, 0.0)     // Should have some fee
}

func TestTradeService_ExecuteTrade(t *testing.T) {
	// Setup
	tradeService, coinService, walletService, _, cleanup := setupTestTradeService(t)
	defer cleanup()

	ctx := context.Background()

	// Setup test user and wallet
	userID := setupTestUser(t, ctx, walletService)

	// Insert test coin
	coinID := "doge2"
	insertTestCoin(t, ctx, coinService, coinID)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    coinID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err := coinService.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Test buy execution
	buyReq := model.TradeRequest{
		UserID:    userID,
		CoinID:    coinID,
		Type:      "buy",
		Amount:    100,
		OrderType: "market",
	}

	buyTrade, err := tradeService.ExecuteTrade(ctx, buyReq)
	require.NoError(t, err)
	assert.NotNil(t, buyTrade)
	assert.Equal(t, "completed", buyTrade.Status)
	assert.Equal(t, userID, buyTrade.UserID)
	assert.Equal(t, coinID, buyTrade.CoinID)
	assert.Equal(t, "buy", buyTrade.Type)
	assert.Equal(t, 100.0, buyTrade.Amount)
	assert.Equal(t, 0.1, buyTrade.Price)

	// Verify portfolio was updated
	portfolio, err := testutil.GetUserPortfolio(ctx, tradeService.db, userID, coinID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, portfolio.Amount)
	assert.Equal(t, 0.1, portfolio.AverageBuyPrice)

	// Test sell execution
	sellReq := model.TradeRequest{
		UserID:    userID,
		CoinID:    coinID,
		Type:      "sell",
		Amount:    50,
		OrderType: "market",
	}

	sellTrade, err := tradeService.ExecuteTrade(ctx, sellReq)
	require.NoError(t, err)
	assert.NotNil(t, sellTrade)
	assert.Equal(t, "completed", sellTrade.Status)
	assert.Equal(t, userID, sellTrade.UserID)
	assert.Equal(t, coinID, sellTrade.CoinID)
	assert.Equal(t, "sell", sellTrade.Type)
	assert.Equal(t, 50.0, sellTrade.Amount)
	assert.Equal(t, 0.1, sellTrade.Price)

	// Verify portfolio was updated after sell
	portfolio, err = testutil.GetUserPortfolio(ctx, tradeService.db, userID, coinID)
	require.NoError(t, err)
	assert.Equal(t, 50.0, portfolio.Amount) // 100 - 50
}

func TestTradeService_GetTradeHistory(t *testing.T) {
	// Setup
	tradeService, coinService, walletService, _, cleanup := setupTestTradeService(t)
	defer cleanup()

	ctx := context.Background()

	// Setup test user and wallet
	userID := setupTestUser(t, ctx, walletService)

	// Insert test coin
	coinID := "doge3"
	insertTestCoin(t, ctx, coinService, coinID)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    coinID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err := coinService.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Execute multiple trades
	trades := []model.TradeRequest{
		{
			UserID:    userID,
			CoinID:    coinID,
			Type:      "buy",
			Amount:    100,
			OrderType: "market",
		},
		{
			UserID:    userID,
			CoinID:    coinID,
			Type:      "sell",
			Amount:    50,
			OrderType: "market",
		},
		{
			UserID:    userID,
			CoinID:    coinID,
			Type:      "buy",
			Amount:    25,
			OrderType: "market",
		},
	}

	for _, trade := range trades {
		_, err := tradeService.ExecuteTrade(ctx, trade)
		require.NoError(t, err)
	}

	// Test get trade history
	history, err := tradeService.GetTradeHistory(ctx, userID)
	require.NoError(t, err)
	assert.NotEmpty(t, history)
	assert.Len(t, history, 3)

	// Verify trade history order (most recent first)
	assert.Equal(t, "buy", history[0].Type)
	assert.Equal(t, 25.0, history[0].Amount)
	assert.Equal(t, "sell", history[1].Type)
	assert.Equal(t, 50.0, history[1].Amount)
	assert.Equal(t, "buy", history[2].Type)
	assert.Equal(t, 100.0, history[2].Amount)

	// Verify all trades are completed
	for _, trade := range history {
		assert.Equal(t, "completed", trade.Status)
		assert.Equal(t, userID, trade.UserID)
		assert.Equal(t, coinID, trade.CoinID)
	}
}

func TestTradeService_InvalidTrades(t *testing.T) {
	// Setup
	tradeService, coinService, walletService, _, cleanup := setupTestTradeService(t)
	defer cleanup()

	ctx := context.Background()

	// Setup test user and wallet
	userID := setupTestUser(t, ctx, walletService)

	// Insert test coin
	coinID := "doge4"
	insertTestCoin(t, ctx, coinService, coinID)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    coinID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err := coinService.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Test invalid coin ID
	invalidCoinReq := model.TradeRequest{
		UserID:    userID,
		CoinID:    "invalid_coin",
		Type:      "buy",
		Amount:    100,
		OrderType: "market",
	}

	_, err = tradeService.ExecuteTrade(ctx, invalidCoinReq)
	assert.Error(t, err)

	// Test selling more than owned
	// First buy some coins
	buyReq := model.TradeRequest{
		UserID:    userID,
		CoinID:    coinID,
		Type:      "buy",
		Amount:    100,
		OrderType: "market",
	}

	_, err = tradeService.ExecuteTrade(ctx, buyReq)
	require.NoError(t, err)

	// Try to sell more than owned
	invalidSellReq := model.TradeRequest{
		UserID:    userID,
		CoinID:    coinID,
		Type:      "sell",
		Amount:    200, // More than the 100 bought
		OrderType: "market",
	}

	_, err = tradeService.ExecuteTrade(ctx, invalidSellReq)
	assert.Error(t, err)

	// Verify portfolio still has original amount
	portfolio, err := testutil.GetUserPortfolio(ctx, tradeService.db, userID, coinID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, portfolio.Amount)
}
