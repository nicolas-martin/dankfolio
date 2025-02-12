package testutil

import (
	"context"
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
			id, user_id, public_key, balance, last_updated
		) VALUES (
			$1, $2, $3, $4, $5
		)
	`

	_, err := db.Exec(ctx, query,
		wallet.ID,
		wallet.UserID,
		wallet.PublicKey,
		wallet.Balance,
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
