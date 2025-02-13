package repository

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// WalletRepository defines the interface for wallet data access
type WalletRepository interface {
	GetWallet(ctx context.Context, userID string) (*model.Wallet, error)
	CreateWallet(ctx context.Context, wallet *model.Wallet) error
	CreateTransaction(ctx context.Context, tx *model.Transaction) error
	ExecuteDeposit(ctx context.Context, tx *model.Transaction, userID string, paymentType string) error
	ExecuteWithdrawal(ctx context.Context, tx *model.Transaction, userID string) error
	GetTransactions(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error)
}

// PostgresWalletRepository implements WalletRepository interface
type PostgresWalletRepository struct {
	db db.DB
}

// NewWalletRepository creates a new WalletRepository instance
func NewWalletRepository(db db.DB) WalletRepository {
	return &PostgresWalletRepository{db: db}
}

func (r *PostgresWalletRepository) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	query := `
		SELECT id, user_id, public_key, balance, created_at, last_updated
		FROM wallets
		WHERE user_id = $1`

	wallet := &model.Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.PublicKey,
		&wallet.Balance,
		&wallet.CreatedAt,
		&wallet.LastUpdated,
	)

	if err != nil {
		return nil, err
	}

	return wallet, nil
}

func (r *PostgresWalletRepository) CreateWallet(ctx context.Context, wallet *model.Wallet) error {
	query := `
		INSERT INTO wallets (id, user_id, public_key, balance, created_at, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.Exec(ctx, query,
		wallet.ID,
		wallet.UserID,
		wallet.PublicKey,
		wallet.Balance,
		wallet.CreatedAt,
		wallet.LastUpdated,
	)

	return err
}

func (r *PostgresWalletRepository) CreateTransaction(ctx context.Context, tx *model.Transaction) error {
	query := `
		INSERT INTO transactions (id, user_id, type, amount, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.Exec(ctx, query,
		tx.ID,
		tx.UserID,
		tx.Type,
		tx.Amount,
		tx.Status,
		tx.CreatedAt,
		tx.UpdatedAt,
	)

	return err
}

func (r *PostgresWalletRepository) ExecuteDeposit(ctx context.Context, tx *model.Transaction, userID string, paymentType string) error {
	dbTx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer dbTx.Rollback(ctx)

	// Update transaction status
	updateTxQuery := `
		UPDATE transactions
		SET status = 'completed', updated_at = NOW()
		WHERE id = $1`

	_, err = dbTx.Exec(ctx, updateTxQuery, tx.ID)
	if err != nil {
		return err
	}

	// Update wallet balance
	updateWalletQuery := `
		UPDATE wallets
		SET balance = balance + $1, last_updated = NOW()
		WHERE user_id = $2`

	_, err = dbTx.Exec(ctx, updateWalletQuery, tx.Amount, userID)
	if err != nil {
		return err
	}

	return dbTx.Commit(ctx)
}

func (r *PostgresWalletRepository) ExecuteWithdrawal(ctx context.Context, tx *model.Transaction, userID string) error {
	dbTx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer dbTx.Rollback(ctx)

	// Update transaction status
	updateTxQuery := `
		UPDATE transactions
		SET status = 'completed', updated_at = NOW()
		WHERE id = $1`

	_, err = dbTx.Exec(ctx, updateTxQuery, tx.ID)
	if err != nil {
		return err
	}

	// Update wallet balance
	updateWalletQuery := `
		UPDATE wallets
		SET balance = balance - $1, last_updated = NOW()
		WHERE user_id = $2`

	_, err = dbTx.Exec(ctx, updateWalletQuery, tx.Amount, userID)
	if err != nil {
		return err
	}

	return dbTx.Commit(ctx)
}

func (r *PostgresWalletRepository) GetTransactions(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	query := `
		SELECT id, user_id, type, amount, status, created_at, updated_at
		FROM transactions
		WHERE user_id = $1`

	args := []interface{}{userID}

	if txType != "" {
		query += ` AND type = $2`
		args = append(args, txType)
	}

	query += ` ORDER BY created_at DESC`

	if limit > 0 {
		query += fmt.Sprintf(` LIMIT $%d`, len(args)+1)
		args = append(args, limit)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []model.Transaction
	for rows.Next() {
		var tx model.Transaction
		err := rows.Scan(
			&tx.ID,
			&tx.UserID,
			&tx.Type,
			&tx.Amount,
			&tx.Status,
			&tx.CreatedAt,
			&tx.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}

	return transactions, nil
}
