package testhelpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/service"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
)

// Test constants
const (
	// Local test validator endpoints (fallback to testnet if local not available)
	LocalnetRPCEndpoint = "http://localhost:8899"
	TestnetRPCEndpoint  = "https://api.testnet.solana.com"
	TestnetWSEndpoint   = "wss://api.testnet.solana.com"
	// Using valid Solana addresses for testing
	TestProgramID  = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"  // SPL Token Program
	TestPoolWallet = "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1" // Random valid address
	TestTokenMint  = "So11111111111111111111111111111111111111112"  // Wrapped SOL mint
)

// TestDB holds the test database and cleanup function
type TestDB struct {
	DB      db.DB
	Cleanup func()
}

// TestServices holds all the services and dependencies needed for testing
type TestServices struct {
	DB            db.DB
	TradeService  interface{}
	CoinService   interface{}
	WalletService interface{}
	SolanaService interface{}
	Cleanup       func()
}

// InsertTestCoin inserts a test coin into the database
func InsertTestCoin(t *testing.T, ctx context.Context, db db.DB, coinID string) {
	testCoin := model.MemeCoin{
		ID:              coinID,
		Symbol:          fmt.Sprintf("%s_symbol", coinID),
		Name:            fmt.Sprintf("%s coin", coinID),
		Description:     "Test coin",
		ContractAddress: fmt.Sprintf("0x123...%s", coinID),
		Price:           0.1,
		CurrentPrice:    0.1,
		Change24h:       5.0,
		Volume24h:       500000,
		MarketCap:       1000000,
		Supply:          1000000000,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err := testutil.InsertTestCoin(ctx, db, testCoin)
	require.NoError(t, err)
}

// SetupTestUser creates a test user with a wallet
func SetupTestUser(t *testing.T, ctx context.Context, db db.DB) string {
	userID := fmt.Sprintf("test_user_%d", time.Now().UnixNano())

	// Clean up any existing wallets for this user
	_, err := db.Exec(ctx, "DELETE FROM wallets WHERE user_id = $1", userID)
	require.NoError(t, err)

	// Create a test wallet with some initial balance
	testWallet := solana.NewWallet()
	privateKeyStr := testWallet.PrivateKey.String()

	wallet := model.Wallet{
		ID:          fmt.Sprintf("wallet_%d", time.Now().UnixNano()),
		UserID:      userID,
		PublicKey:   testWallet.PublicKey().String(),
		PrivateKey:  privateKeyStr,
		Balance:     1000.0, // Initial balance for testing
		LastUpdated: time.Now(),
	}

	err = testutil.InsertTestWallet(ctx, db, wallet)
	require.NoError(t, err)

	return userID
}

// SetupTestDB creates a new test database and returns it with a cleanup function
func SetupTestDB(t *testing.T) (*TestDB, func()) {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Clean up any existing test data
	ctx := context.Background()
	_, err := testDB.Exec(ctx, "DELETE FROM price_history")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM portfolios")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM trades")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM meme_coins")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM wallets")
	require.NoError(t, err)

	return &TestDB{
		DB:      testDB,
		Cleanup: cleanup,
	}, cleanup
}

// SetupTestTradeService creates a new test trade service with all dependencies
func SetupTestTradeService(t *testing.T) *TestServices {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Create repositories
	coinRepo := repository.NewCoinRepository(testDB)
	walletRepo := repository.NewWalletRepository(testDB)
	tradeRepo := repository.NewTradeRepository(testDB)

	// Create service instances
	coinService := service.NewCoinService(coinRepo)
	walletService := service.NewWalletService(TestnetRPCEndpoint, walletRepo)
	solanaService, err := service.NewSolanaTradeService(
		TestnetRPCEndpoint,
		TestnetWSEndpoint,
		TestProgramID,
		TestPoolWallet,
		testDB,
	)
	require.NoError(t, err)

	// Create trade service
	tradeService := service.NewTradeService(coinService, walletService, solanaService, tradeRepo)

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

	return &TestServices{
		DB:            testDB,
		TradeService:  tradeService,
		CoinService:   coinService,
		WalletService: walletService,
		SolanaService: solanaService,
		Cleanup:       cleanup,
	}
}

// SetupTestCoinService creates a new test coin service with all dependencies
func SetupTestCoinService(t *testing.T) *TestServices {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Clean up any existing test data
	ctx := context.Background()
	_, err := testDB.Exec(ctx, "DELETE FROM price_history")
	require.NoError(t, err)
	_, err = testDB.Exec(ctx, "DELETE FROM meme_coins")
	require.NoError(t, err)

	// Create coin repository
	coinRepo := repository.NewCoinRepository(testDB)
	coinService := service.NewCoinService(coinRepo)

	return &TestServices{
		DB:          testDB,
		CoinService: coinService,
		Cleanup:     cleanup,
	}
}
