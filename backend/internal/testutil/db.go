package testutil

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	testDBHost     = "localhost"
	testDBPort     = "5434" // Changed from 5433 to avoid conflicts
	testDBUser     = "postgres"
	testDBPassword = "postgres"
	testDBName     = "meme_trader_test"
)

// SetupTestDB creates a new test database and returns it with a cleanup function
func SetupTestDB(t *testing.T) (db.DB, func()) {
	// Get database connection string from environment variable
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5434/meme_trader_test?sslmode=disable"
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

// startPostgresContainer starts a PostgreSQL container for testing
func startPostgresContainer(t *testing.T) (string, error) {
	cmd := exec.Command("docker", "run", "-d",
		"-e", fmt.Sprintf("POSTGRES_USER=%s", testDBUser),
		"-e", fmt.Sprintf("POSTGRES_PASSWORD=%s", testDBPassword),
		"-e", fmt.Sprintf("POSTGRES_DB=%s", testDBName),
		"-p", fmt.Sprintf("%s:5432", testDBPort),
		"postgres:13-alpine")

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to start postgres container: %w\nOutput: %s", err, string(output))
	}

	containerID := string(output)[:12] // First 12 chars of container ID
	return containerID, nil
}

// stopContainer stops and removes the test container
func stopContainer(t *testing.T, containerID string) {
	exec.Command("docker", "stop", containerID).Run()
	exec.Command("docker", "rm", containerID).Run()
}

// waitForDB waits for the database to be ready
func waitForDB(dbURL string) error {
	var db *pgxpool.Pool
	var err error
	maxRetries := 30
	for i := 0; i < maxRetries; i++ {
		db, err = pgxpool.Connect(context.Background(), dbURL)
		if err == nil {
			db.Close()
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("database not ready after %d attempts: %w", maxRetries, err)
}

// runMigrations runs the database migrations
func runMigrations(t *testing.T, dbURL string) error {
	// Find migrations directory relative to the project root
	wd, err := os.Getwd()
	if err != nil {
		return err
	}

	// Navigate up to find the migrations directory
	migrationsPath := filepath.Join(filepath.Dir(filepath.Dir(wd)), "db", "migrations")

	// Run migrate command
	cmd := exec.Command("migrate",
		"-path", migrationsPath,
		"-database", dbURL,
		"up",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w\nOutput: %s", err, output)
	}

	return nil
}

// InsertTestCoin inserts a test coin into the database
func InsertTestCoin(ctx context.Context, db db.DB, coin model.MemeCoin) error {
	query := `
		INSERT INTO meme_coins (
			id, symbol, name, description, contract_address,
			logo_url, website_url, image_url,
			price, current_price, change_24h, volume_24h,
			market_cap, supply, labels, socials,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18
		)
	`

	_, err := db.Exec(ctx, query,
		coin.ID,
		coin.Symbol,
		coin.Name,
		coin.Description,
		coin.ContractAddress,
		coin.LogoURL,
		coin.WebsiteURL,
		coin.ImageURL,
		coin.Price,
		coin.CurrentPrice,
		coin.Change24h,
		coin.Volume24h,
		coin.MarketCap,
		coin.Supply,
		coin.Labels,
		coin.Socials,
		coin.CreatedAt,
		coin.UpdatedAt,
	)

	return err
}

// InsertTestWallet inserts a test wallet into the database
func InsertTestWallet(ctx context.Context, db db.DB, wallet model.Wallet) error {
	query := `
		INSERT INTO wallets (id, user_id, public_key, private_key, encrypted_private_key, balance, created_at, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

// SetupTestSchema sets up the test database schema
func SetupTestSchema(ctx context.Context, db db.DB) error {
	// Create tables in correct order (parent tables first)
	_, err := db.Exec(ctx, `
		-- Users table
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) UNIQUE NOT NULL,
			username VARCHAR(50) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		-- Wallets table
		CREATE TABLE IF NOT EXISTS wallets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id),
			public_key VARCHAR(255) NOT NULL,
			private_key TEXT NOT NULL,
			encrypted_private_key TEXT NOT NULL,
			balance DECIMAL(24,12) NOT NULL DEFAULT 0,
			last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		-- Meme coins table
		CREATE TABLE IF NOT EXISTS meme_coins (
			id VARCHAR(50) PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL,
			name VARCHAR(100) NOT NULL,
			contract_address VARCHAR(255) NOT NULL,
			description TEXT,
			logo_url TEXT,
			website_url TEXT,
			image_url TEXT,
			price DECIMAL(24,12),
			current_price DECIMAL(24,12),
			change_24h DECIMAL(24,12),
			volume_24h DECIMAL(24,2),
			market_cap DECIMAL(24,2),
			supply DECIMAL(24,12),
			labels JSONB DEFAULT '[]',
			socials JSONB DEFAULT '[]',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);

		-- Price history table
		CREATE TABLE IF NOT EXISTS price_history (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			coin_id VARCHAR(50) NOT NULL,
			price DECIMAL(24,12) NOT NULL,
			market_cap DECIMAL(24,2),
			volume_24h DECIMAL(24,2),
			timestamp BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (coin_id) REFERENCES meme_coins(id)
		);

		-- User portfolios table
		CREATE TABLE IF NOT EXISTS portfolios (
			id VARCHAR(50) PRIMARY KEY,
			user_id VARCHAR(50) NOT NULL,
			coin_id VARCHAR(50) NOT NULL,
			amount DECIMAL(24,12) NOT NULL,
			average_buy_price DECIMAL(24,12) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (coin_id) REFERENCES meme_coins(id),
			CONSTRAINT portfolios_user_coin_unique UNIQUE(user_id, coin_id)
		);

		-- Trades table
		CREATE TABLE IF NOT EXISTS trades (
			id VARCHAR(50) PRIMARY KEY,
			user_id VARCHAR(50) NOT NULL,
			coin_id VARCHAR(50) NOT NULL,
			coin_symbol VARCHAR(20),
			type VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
			amount DECIMAL(24,12) NOT NULL,
			price DECIMAL(24,12) NOT NULL,
			fee DECIMAL(24,12) NOT NULL,
			transaction_hash VARCHAR(255),
			status VARCHAR(20) NOT NULL DEFAULT 'pending' 
				CHECK (status IN ('pending', 'completed', 'failed')),
			completed_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (coin_id) REFERENCES meme_coins(id)
		);

		-- Create indexes
		CREATE INDEX IF NOT EXISTS idx_price_history_coin_id_timestamp ON price_history(coin_id, timestamp);
		CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
		CREATE INDEX IF NOT EXISTS idx_trades_coin_id ON trades(coin_id);
		CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
	`)

	return err
}

// CleanupTestSchema drops all test tables
func CleanupTestSchema(ctx context.Context, db db.DB) error {
	// Drop tables in correct order (child tables first)
	_, err := db.Exec(ctx, `
		DROP TABLE IF EXISTS price_history CASCADE;
		DROP TABLE IF EXISTS portfolios CASCADE;
		DROP TABLE IF EXISTS trades CASCADE;
		DROP TABLE IF EXISTS meme_coins CASCADE;
		DROP TABLE IF EXISTS wallets CASCADE;
		DROP TABLE IF EXISTS users CASCADE;
	`)
	return err
}
