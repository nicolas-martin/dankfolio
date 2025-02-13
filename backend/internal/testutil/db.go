package testutil

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v4/pgxpool"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	testDBHost     = "localhost"
	testDBPort     = "5434"
	testDBUser     = "postgres"
	testDBPassword = "postgres"
	testDBName     = "dankfolio_test"
)

// SetupTestDB creates a new test database and returns it with a cleanup function
func SetupTestDB(t *testing.T) (db.DB, func()) {
	// Get database connection string from environment variable
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			testDBUser, testDBPassword, testDBHost, testDBPort, testDBName)
	}

	// Create database connection pool
	config, err := pgxpool.ParseConfig(dbURL)
	require.NoError(t, err)

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	require.NoError(t, err)

	// Return cleanup function
	cleanup := func() {
		pool.Close()
	}

	return db.NewDB(pool), cleanup
}

// InsertTestCoin inserts a test coin into the database
func InsertTestCoin(ctx context.Context, db db.DB, coin model.MemeCoin) error {
	query := `
		INSERT INTO meme_coins (
			id, symbol, name, description, contract_address,
			price, current_price, change_24h, volume_24h,
			market_cap, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
	`

	_, err := db.Exec(ctx, query,
		coin.ID,
		coin.Symbol,
		coin.Name,
		coin.Description,
		coin.ContractAddress,
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

// InsertTestTrade inserts a test trade into the database
func InsertTestTrade(ctx context.Context, db db.DB, trade model.Trade) error {
	query := `
		INSERT INTO trades (
			id, coin_id, type, amount, price,
			fee, status, tx_hash, created_at, completed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`

	_, err := db.Exec(ctx, query,
		trade.ID,
		trade.CoinID,
		trade.Type,
		trade.Amount,
		trade.Price,
		trade.Fee,
		trade.Status,
		trade.TransactionHash,
		trade.CreatedAt,
		trade.CompletedAt,
	)

	return err
}

// SetupTestSchema sets up the test database schema
func SetupTestSchema(ctx context.Context, db db.DB) error {
	// Create tables in correct order
	_, err := db.Exec(ctx, `
		-- Meme coins table
		CREATE TABLE IF NOT EXISTS meme_coins (
			id VARCHAR(255) PRIMARY KEY,
			symbol VARCHAR(255) NOT NULL,
			name VARCHAR(100) NOT NULL,
			contract_address VARCHAR(255) NOT NULL,
			description TEXT,
			price DECIMAL(24,12),
			current_price DECIMAL(24,12),
			change_24h DECIMAL(24,12),
			volume_24h DECIMAL(24,2),
			market_cap DECIMAL(24,2),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		-- Price history table
		CREATE TABLE IF NOT EXISTS price_history (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			coin_id VARCHAR(255) NOT NULL REFERENCES meme_coins(id),
			price DECIMAL(24,12) NOT NULL,
			market_cap DECIMAL(24,2),
			volume_24h DECIMAL(24,2),
			timestamp BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		-- Trades table
		CREATE TABLE IF NOT EXISTS trades (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			coin_id VARCHAR(255) NOT NULL REFERENCES meme_coins(id),
			amount DECIMAL(24,12) NOT NULL,
			price DECIMAL(24,12) NOT NULL,
			type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			tx_hash VARCHAR(255),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)

	return err
}

// CleanupTestSchema drops all test tables
func CleanupTestSchema(ctx context.Context, db db.DB) error {
	_, err := db.Exec(ctx, `
		DROP TABLE IF EXISTS trades;
		DROP TABLE IF EXISTS price_history;
		DROP TABLE IF EXISTS meme_coins;
	`)
	return err
}
