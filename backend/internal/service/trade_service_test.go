package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err = testutil.InsertTestCoin(ctx, db, testCoin)
	require.NoError(t, err)

	// Create repositories and services
	coinRepo := repository.NewCoinRepository(db)
	tradeRepo := repository.NewTradeRepository(db)
	coinService := NewCoinService(coinRepo)
	solanaService, err := NewSolanaTradeService(
		TestnetRPCEndpoint,
		TestnetWSEndpoint,
		TestProgramID,
		TestPoolWallet,
		"test_private_key",
	)
	require.NoError(t, err)

	tradeService := NewTradeService(coinService, solanaService, tradeRepo)

	t.Run("Trade Preview", func(t *testing.T) {
		// Test buy preview
		buyReq := model.TradeRequest{
			CoinID: testCoin.ID,
			Type:   "buy",
			Amount: 100,
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
			CoinID: testCoin.ID,
			Type:   "sell",
			Amount: 50,
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
			CoinID: testCoin.ID,
			Type:   "buy",
			Amount: 100,
		}

		buyTrade, err := tradeService.ExecuteTrade(ctx, buyReq)
		require.NoError(t, err)
		assert.NotNil(t, buyTrade)
		assert.Equal(t, "completed", buyTrade.Status)
		assert.NotEmpty(t, buyTrade.TransactionHash)

		// Test sell execution
		sellReq := model.TradeRequest{
			CoinID: testCoin.ID,
			Type:   "sell",
			Amount: 50,
		}

		sellTrade, err := tradeService.ExecuteTrade(ctx, sellReq)
		require.NoError(t, err)
		assert.NotNil(t, sellTrade)
		assert.Equal(t, "completed", sellTrade.Status)
		assert.NotEmpty(t, sellTrade.TransactionHash)

		// Verify trades in database
		trades, err := tradeRepo.ListTrades(ctx)
		require.NoError(t, err)
		require.NotNil(t, trades)

		// Should have at least two trades from the previous tests
		assert.GreaterOrEqual(t, len(trades), 2)

		// Verify trade properties
		for _, trade := range trades {
			assert.NotEmpty(t, trade.ID)
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

	// Create repositories and services
	coinRepo := repository.NewCoinRepository(db)
	tradeRepo := repository.NewTradeRepository(db)
	coinService := NewCoinService(coinRepo)
	solanaService, err := NewSolanaTradeService(
		TestnetRPCEndpoint,
		TestnetWSEndpoint,
		TestProgramID,
		TestPoolWallet,
		"test_private_key",
	)
	require.NoError(t, err)

	tradeService := NewTradeService(coinService, solanaService, tradeRepo)

	t.Run("Invalid Coin ID", func(t *testing.T) {
		req := model.TradeRequest{
			CoinID: "invalid_coin_id",
			Type:   "buy",
			Amount: 100,
		}

		_, err := tradeService.PreviewTrade(ctx, req)
		assert.Error(t, err)

		_, err = tradeService.ExecuteTrade(ctx, req)
		assert.Error(t, err)
	})

	t.Run("Invalid Trade Type", func(t *testing.T) {
		req := model.TradeRequest{
			CoinID: TestTokenMint,
			Type:   "invalid_type",
			Amount: 100,
		}

		_, err := tradeService.PreviewTrade(ctx, req)
		assert.Error(t, err)

		_, err = tradeService.ExecuteTrade(ctx, req)
		assert.Error(t, err)
	})

	t.Run("Zero Amount", func(t *testing.T) {
		req := model.TradeRequest{
			CoinID: TestTokenMint,
			Type:   "buy",
			Amount: 0,
		}

		_, err := tradeService.PreviewTrade(ctx, req)
		assert.Error(t, err)

		_, err = tradeService.ExecuteTrade(ctx, req)
		assert.Error(t, err)
	})

	t.Run("Negative Amount", func(t *testing.T) {
		req := model.TradeRequest{
			CoinID: TestTokenMint,
			Type:   "buy",
			Amount: -100,
		}

		_, err := tradeService.PreviewTrade(ctx, req)
		assert.Error(t, err)

		_, err = tradeService.ExecuteTrade(ctx, req)
		assert.Error(t, err)
	})
}
