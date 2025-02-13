package testhelpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/service"
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
	CoinService   *service.CoinService
	TradeService  *service.TradeService
	SolanaService *service.SolanaTradeService
	DB            db.DB
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

	err := insertTestCoin(ctx, db, testCoin)
	require.NoError(t, err)
}

// SetupTestDB creates a new test database and returns it with a cleanup function
func SetupTestDB(t *testing.T) (*TestDB, func()) {
	// Setup test database
	dbURL := fmt.Sprintf("postgres://postgres:postgres@localhost:5434/dankfolio_test?sslmode=disable")
	config, err := pgxpool.ParseConfig(dbURL)
	require.NoError(t, err)

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	require.NoError(t, err)

	testDB := db.NewDB(pool)

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

	return &TestDB{
			DB: testDB,
			Cleanup: func() {
				pool.Close()
			},
		}, func() {
			pool.Close()
		}
}

// SetupTestServices creates a new test services with all dependencies
func SetupTestServices(t *testing.T) (*TestServices, func()) {
	// Setup test database
	dbURL := fmt.Sprintf("postgres://postgres:postgres@localhost:5434/dankfolio_test?sslmode=disable")
	config, err := pgxpool.ParseConfig(dbURL)
	require.NoError(t, err)

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	require.NoError(t, err)

	testDB := db.NewDB(pool)

	// Create repositories
	coinRepo := repository.NewCoinRepository(testDB)
	tradeRepo := repository.NewTradeRepository(testDB)

	// Create services
	coinService := service.NewCoinService(coinRepo)
	solanaService, err := service.NewSolanaTradeService(
		"https://api.devnet.solana.com",
		"wss://api.devnet.solana.com",
		"program_id",
		"pool_wallet",
		"private_key",
	)
	require.NoError(t, err)

	tradeService := service.NewTradeService(coinService, solanaService, tradeRepo)

	services := &TestServices{
		CoinService:   coinService,
		TradeService:  tradeService,
		SolanaService: solanaService,
		DB:            testDB,
	}

	// Setup test data
	err = setupTestData(context.Background(), testDB)
	require.NoError(t, err)

	cleanup := func() {
		pool.Close()
	}

	return services, cleanup
}

func setupTestData(ctx context.Context, db db.DB) error {
	// Clean up any existing test data
	_, err := db.Exec(ctx, "DELETE FROM trades")
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, "DELETE FROM price_history")
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, "DELETE FROM meme_coins")
	if err != nil {
		return err
	}

	// Insert test meme coins
	coins := []model.MemeCoin{
		{
			ID:              "test_coin_1",
			Symbol:          "TEST1",
			Name:            "Test Coin 1",
			ContractAddress: "addr1",
			Description:     "Test coin 1 description",
			Price:           100.0,
			CurrentPrice:    100.0,
			Change24h:       5.0,
			Volume24h:       1000000.0,
			MarketCap:       10000000.0,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		},
		{
			ID:              "test_coin_2",
			Symbol:          "TEST2",
			Name:            "Test Coin 2",
			ContractAddress: "addr2",
			Description:     "Test coin 2 description",
			Price:           200.0,
			CurrentPrice:    200.0,
			Change24h:       -2.0,
			Volume24h:       2000000.0,
			MarketCap:       20000000.0,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		},
	}

	for _, coin := range coins {
		err := insertTestCoin(ctx, db, coin)
		if err != nil {
			return err
		}
	}

	// Insert test trades
	trades := []model.Trade{
		{
			ID:          "test_trade_1",
			CoinID:      "test_coin_1",
			Type:        "buy",
			Amount:      1.0,
			Price:       100.0,
			Fee:         1.0,
			Status:      "completed",
			CreatedAt:   time.Now(),
			CompletedAt: time.Now(),
		},
		{
			ID:          "test_trade_2",
			CoinID:      "test_coin_2",
			Type:        "sell",
			Amount:      0.5,
			Price:       200.0,
			Fee:         1.0,
			Status:      "completed",
			CreatedAt:   time.Now(),
			CompletedAt: time.Now(),
		},
	}

	for _, trade := range trades {
		err := insertTestTrade(ctx, db, trade)
		if err != nil {
			return err
		}
	}

	return nil
}

func insertTestCoin(ctx context.Context, db db.DB, coin model.MemeCoin) error {
	query := `
		INSERT INTO meme_coins (
			id, symbol, name, contract_address, description,
			price, current_price, change_24h, volume_24h, market_cap,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := db.Exec(ctx, query,
		coin.ID,
		coin.Symbol,
		coin.Name,
		coin.ContractAddress,
		coin.Description,
		coin.Price,
		coin.CurrentPrice,
		coin.Change24h,
		coin.Volume24h,
		coin.MarketCap,
		coin.CreatedAt,
		coin.UpdatedAt,
	)

	return err
}

func insertTestTrade(ctx context.Context, db db.DB, trade model.Trade) error {
	query := `
		INSERT INTO trades (
			id, coin_id, type, amount, price,
			fee, status, created_at, completed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := db.Exec(ctx, query,
		trade.ID,
		trade.CoinID,
		trade.Type,
		trade.Amount,
		trade.Price,
		trade.Fee,
		trade.Status,
		trade.CreatedAt,
		trade.CompletedAt,
	)

	return err
}
