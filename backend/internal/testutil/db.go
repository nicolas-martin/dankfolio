package testutil

import (
	"context"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// SetupTestDB creates a test database connection and returns a cleanup function
func SetupTestDB(t *testing.T) (db.DB, func()) {
	// Use environment variable or default to test database
	dbURL := "postgres://postgres:postgres@localhost:5432/dankfolio_test?sslmode=disable"

	config, err := pgxpool.ParseConfig(dbURL)
	require.NoError(t, err)

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	require.NoError(t, err)

	// Create a cleanup function
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
			market_cap, supply, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13
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
		coin.Supply,
		coin.CreatedAt,
		coin.UpdatedAt,
	)

	return err
}

// InsertTestWallet inserts a test wallet into the database
func InsertTestWallet(ctx context.Context, db db.DB, wallet model.Wallet) error {
	query := `
		INSERT INTO wallets (
			id, user_id, public_key, private_key, encrypted_private_key, balance, created_at, last_updated
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
	`

	_, err := db.Exec(ctx, query,
		wallet.ID,
		wallet.UserID,
		wallet.PublicKey,
		wallet.PrivateKey,
		wallet.PrivateKey, // Using private key as encrypted key for testing
		wallet.Balance,
		wallet.CreatedAt,
		wallet.LastUpdated,
	)

	return err
}

// GetUserPortfolio gets a user's holdings for a specific coin
func GetUserPortfolio(ctx context.Context, db db.DB, userID string, coinID string) (*model.MemeHolding, error) {
	query := `
		SELECT 
			coin_id, amount, average_buy_price,
			COALESCE(amount, 0) as quantity,
			COALESCE(amount * average_buy_price, 0) as value,
			CURRENT_TIMESTAMP as updated_at
		FROM portfolios
		WHERE user_id = $1 AND coin_id = $2
	`

	holding := &model.MemeHolding{}
	err := db.QueryRow(ctx, query, userID, coinID).Scan(
		&holding.CoinID,
		&holding.Amount,
		&holding.AverageBuyPrice,
		&holding.Quantity,
		&holding.Value,
		&holding.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return holding, nil
}

// SetupTestSchema creates the necessary tables for testing
func SetupTestSchema(ctx context.Context, db db.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS meme_coins (
			id TEXT PRIMARY KEY,
			symbol TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			contract_address TEXT NOT NULL,
			logo_url TEXT,
			image_url TEXT,
			price DECIMAL,
			current_price DECIMAL,
			change_24h DECIMAL,
			volume_24h DECIMAL,
			market_cap DECIMAL,
			supply DECIMAL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS price_history (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			coin_id TEXT NOT NULL REFERENCES meme_coins(id),
			price DECIMAL NOT NULL,
			market_cap DECIMAL,
			volume_24h DECIMAL,
			timestamp BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS wallets (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			public_key TEXT NOT NULL,
			private_key TEXT,
			encrypted_private_key TEXT,
			balance DECIMAL DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS deposits (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			amount DECIMAL NOT NULL,
			payment_type TEXT NOT NULL,
			address TEXT,
			payment_url TEXT,
			qr_code TEXT,
			status TEXT NOT NULL,
			tx_hash TEXT,
			expires_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS withdrawals (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			amount DECIMAL NOT NULL,
			fee DECIMAL NOT NULL,
			total_amount DECIMAL NOT NULL,
			destination_chain TEXT NOT NULL,
			destination_address TEXT NOT NULL,
			status TEXT NOT NULL,
			tx_hash TEXT,
			estimated_time TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE OR REPLACE VIEW transactions AS
			SELECT 
				id, 'deposit' as type, user_id, amount, status, tx_hash, created_at, updated_at
			FROM deposits
			UNION ALL
			SELECT 
				id, 'withdrawal' as type, user_id, amount, status, tx_hash, created_at, updated_at
			FROM withdrawals
		`,
		`CREATE INDEX IF NOT EXISTS idx_price_history_coin_id_timestamp ON price_history(coin_id, timestamp)`,
	}

	for _, query := range queries {
		_, err := db.Exec(ctx, query)
		if err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	return nil
}

// CleanupTestSchema drops all test tables
func CleanupTestSchema(ctx context.Context, db db.DB) error {
	queries := []string{
		"DROP VIEW IF EXISTS transactions",
		"DROP TABLE IF EXISTS withdrawals",
		"DROP TABLE IF EXISTS deposits",
		"DROP TABLE IF EXISTS portfolios",
		"DROP TABLE IF EXISTS trades",
		"DROP TABLE IF EXISTS price_history",
		"DROP TABLE IF EXISTS wallets",
		"DROP TABLE IF EXISTS meme_coins",
	}

	for _, query := range queries {
		_, err := db.Exec(ctx, query)
		if err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	return nil
}
