package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
)

const (
	TestnetRPCEndpoint = "https://api.testnet.solana.com"
	TestnetWSEndpoint  = "wss://api.testnet.solana.com"
	TestProgramID      = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"  // SPL Token Program
	TestPoolWallet     = "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1" // Random valid address
	TestTokenMint      = "So11111111111111111111111111111111111111112"  // Wrapped SOL mint
)

func setupTestTradeService(t *testing.T) (*TradeService, *CoinService, *WalletService, *SolanaTradeService, func()) {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Create repositories
	coinRepo := repository.NewCoinRepository(testDB)
	walletRepo := repository.NewWalletRepository(testDB)
	tradeRepo := repository.NewTradeRepository(testDB)

	// Create service instances
	coinService := NewCoinService(coinRepo)
	walletService := NewWalletService(TestnetRPCEndpoint, walletRepo)
	solanaService, err := NewSolanaTradeService(
		TestnetRPCEndpoint,
		TestnetWSEndpoint,
		TestProgramID,
		TestPoolWallet,
		testDB,
	)
	require.NoError(t, err)

	// Create trade service
	tradeService := NewTradeService(coinService, walletService, solanaService, tradeRepo)

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

func setupTestUser(t *testing.T, ctx context.Context, walletService *WalletService) uuid.UUID {
	userID := uuid.New()
	wallet, err := walletService.CreateWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, wallet)
	return userID
}

func TestTradeService_Integration(t *testing.T) {
	ctx := context.Background()

	// Setup test database
	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	// Setup test schema
	err := testutil.SetupTestSchema(ctx, db)
	require.NoError(t, err)
	defer func() {
		err := testutil.CleanupTestSchema(ctx, db)
		require.NoError(t, err)
	}()

	// Create repositories
	coinRepo := repository.NewCoinRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	tradeRepo := repository.NewTradeRepository(db)

	// Create services
	coinService := NewCoinService(coinRepo)
	walletService := NewWalletService(TestnetRPCEndpoint, walletRepo)
	solanaService, err := NewSolanaTradeService(
		TestnetRPCEndpoint,
		TestnetWSEndpoint,
		TestProgramID,
		TestPoolWallet,
		db,
	)
	require.NoError(t, err)

	// Create trade service
	tradeService := NewTradeService(coinService, walletService, solanaService, tradeRepo)

	// Insert test coin
	testCoin := model.MemeCoin{
		ID:              TestTokenMint,
		Symbol:          "WSOL",
		Name:            "Wrapped SOL",
		Description:     "Test coin",
		ContractAddress: TestTokenMint,
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err = testutil.InsertTestCoin(ctx, db, testCoin)
	require.NoError(t, err)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    testCoin.ID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err = coinRepo.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Create test user with wallet
	userID := setupTestUser(t, ctx, walletService)

	t.Run("Trade Preview", func(t *testing.T) {
		// Test buy preview
		buyReq := model.TradeRequest{
			UserID:    userID.String(),
			CoinID:    testCoin.ID,
			Type:      "buy",
			Amount:    100,
			OrderType: "market",
		}

		buyPreview, err := tradeService.PreviewTrade(ctx, buyReq)
		require.NoError(t, err)
		assert.NotNil(t, buyPreview)
		assert.Equal(t, "buy", buyPreview.Type)
		assert.Equal(t, float64(100), buyPreview.Amount)
		assert.Equal(t, float64(0.1), buyPreview.Price)
		assert.Equal(t, float64(10.0), buyPreview.TotalCost) // 100 * 0.1
		assert.Greater(t, buyPreview.Fee, float64(0))        // Should have some fee

		// Test sell preview
		sellReq := model.TradeRequest{
			UserID:    userID.String(),
			CoinID:    testCoin.ID,
			Type:      "sell",
			Amount:    50,
			OrderType: "market",
		}

		sellPreview, err := tradeService.PreviewTrade(ctx, sellReq)
		require.NoError(t, err)
		assert.NotNil(t, sellPreview)
		assert.Equal(t, "sell", sellPreview.Type)
		assert.Equal(t, float64(50), sellPreview.Amount)
		assert.Equal(t, float64(0.1), sellPreview.Price)
		assert.Equal(t, float64(5.0), sellPreview.TotalCost) // 50 * 0.1
		assert.Greater(t, sellPreview.Fee, float64(0))       // Should have some fee
	})

	t.Run("Execute Trade", func(t *testing.T) {
		// Test buy execution
		buyReq := model.TradeRequest{
			UserID:    userID.String(),
			CoinID:    testCoin.ID,
			Type:      "buy",
			Amount:    100,
			OrderType: "market",
		}

		buyTrade, err := tradeService.ExecuteTrade(ctx, buyReq)
		require.NoError(t, err)
		assert.NotNil(t, buyTrade)
		assert.Equal(t, "completed", buyTrade.Status)
		assert.NotEmpty(t, buyTrade.TransactionHash)

		// Test sell execution
		sellReq := model.TradeRequest{
			UserID:    userID.String(),
			CoinID:    testCoin.ID,
			Type:      "sell",
			Amount:    50,
			OrderType: "market",
		}

		sellTrade, err := tradeService.ExecuteTrade(ctx, sellReq)
		require.NoError(t, err)
		assert.NotNil(t, sellTrade)
		assert.Equal(t, "completed", sellTrade.Status)
		assert.NotEmpty(t, sellTrade.TransactionHash)
	})

	t.Run("Trade History", func(t *testing.T) {
		history, err := tradeService.GetTradeHistory(ctx, userID.String())
		require.NoError(t, err)
		require.NotNil(t, history)

		// Should have at least two trades from the previous tests
		assert.GreaterOrEqual(t, len(history), 2)

		// Verify trade properties
		for _, trade := range history {
			assert.NotEmpty(t, trade.ID)
			assert.Equal(t, userID.String(), trade.UserID)
			assert.Equal(t, testCoin.ID, trade.CoinID)
			assert.NotZero(t, trade.Amount)
			assert.NotZero(t, trade.Price)
			assert.NotZero(t, trade.Fee)
			assert.Equal(t, "completed", trade.Status)
			assert.NotEmpty(t, trade.TransactionHash)
			assert.False(t, trade.CreatedAt.IsZero())
			assert.False(t, trade.CompletedAt.IsZero())
		}
	})
}

func TestTradeService_InvalidTrades(t *testing.T) {
	// Setup
	tradeService, coinService, walletService, _, cleanup := setupTestTradeService(t)
	defer cleanup()

	ctx := context.Background()

	// Setup test user and wallet
	userID := setupTestUser(t, ctx, walletService)

	// Insert test coin
	testCoin := model.MemeCoin{
		ID:              TestTokenMint,
		Symbol:          "WSOL",
		Name:            "Wrapped SOL",
		Description:     "Test coin",
		ContractAddress: TestTokenMint,
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Get the underlying database from the coin service
	var testDB db.DB
	if repo, ok := coinService.repo.(interface{ GetDB() db.DB }); ok {
		testDB = repo.GetDB()
	} else {
		t.Fatal("Could not get database from coin repository")
	}
	err := testutil.InsertTestCoin(ctx, testDB, testCoin)
	require.NoError(t, err)

	// Insert current price
	now := time.Now()
	priceUpdate := model.PriceUpdate{
		CoinID:    testCoin.ID,
		Price:     0.1,
		MarketCap: 1000000,
		Volume24h: 500000,
		Timestamp: time.Unix(now.Unix(), 0),
	}

	err = coinService.UpdatePrices(ctx, []model.PriceUpdate{priceUpdate})
	require.NoError(t, err)

	// Test invalid coin ID
	invalidCoinReq := model.TradeRequest{
		UserID:    userID.String(),
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
		UserID:    userID.String(),
		CoinID:    testCoin.ID,
		Type:      "buy",
		Amount:    100,
		OrderType: "market",
	}

	_, err = tradeService.ExecuteTrade(ctx, buyReq)
	require.NoError(t, err)

	// Try to sell more than owned
	invalidSellReq := model.TradeRequest{
		UserID:    userID.String(),
		CoinID:    testCoin.ID,
		Type:      "sell",
		Amount:    200, // More than the 100 bought
		OrderType: "market",
	}

	_, err = tradeService.ExecuteTrade(ctx, invalidSellReq)
	assert.Error(t, err)

	// Verify portfolio still has original amount
	portfolio, err := testutil.GetUserPortfolio(ctx, testDB, userID, testCoin.ID)
	require.NoError(t, err)
	assert.Equal(t, 100.0, portfolio.Amount)
}
