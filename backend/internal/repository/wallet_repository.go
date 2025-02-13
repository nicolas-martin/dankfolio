package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v4"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// WalletRepository defines the interface for wallet data access
type WalletRepository interface {
	GetWallet(ctx context.Context, userID string) (*model.Wallet, error)
	CreateWallet(ctx context.Context, tx pgx.Tx, userID string, publicKey string, privateKey string, encryptedPrivateKey string) error
	CreateDeposit(ctx context.Context, tx pgx.Tx, deposit *model.DepositInfo, userID string, paymentType string) (string, error)
	CreateWithdrawal(ctx context.Context, tx pgx.Tx, withdrawal *model.WithdrawalInfo, userID string, destinationAddress string) error
	UpdateWalletBalance(ctx context.Context, tx pgx.Tx, userID string, amount float64) error
	GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error)
	CreateWalletWithBalance(ctx context.Context, wallet *model.Wallet, privateKeyStr string, encryptedPrivateKey string) error
	ExecuteDeposit(ctx context.Context, deposit *model.DepositInfo, userID string, paymentType string) error
	ExecuteWithdrawal(ctx context.Context, withdrawal *model.WithdrawalInfo, userID string, destinationAddress string, amount float64) error
}

// walletRepository implements WalletRepository interface
type walletRepository struct {
	db db.DB
}

// NewWalletRepository creates a new WalletRepository instance
func NewWalletRepository(db db.DB) WalletRepository {
	return &walletRepository{db: db}
}

func (r *walletRepository) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	query := `
		SELECT id, user_id, public_key, balance, last_updated
		FROM wallets
		WHERE user_id = $1
	`

	wallet := &model.Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.PublicKey,
		&wallet.Balance,
		&wallet.LastUpdated,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}

	return wallet, nil
}

func (r *walletRepository) CreateWallet(ctx context.Context, tx pgx.Tx, userID string, publicKey string, privateKey string, encryptedPrivateKey string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO wallets (id, user_id, public_key, private_key, encrypted_private_key)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, userID, publicKey, privateKey, encryptedPrivateKey)

	if err != nil {
		return fmt.Errorf("failed to create user wallet: %w", err)
	}

	return nil
}

func (r *walletRepository) CreateDeposit(ctx context.Context, tx pgx.Tx, deposit *model.DepositInfo, userID string, paymentType string) (string, error) {
	query := `
		INSERT INTO deposits (
			id, user_id, amount, payment_type, address, 
			payment_url, qr_code, expires_at, status,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := tx.Exec(ctx, query,
		deposit.ID,
		userID,
		deposit.Amount,
		paymentType,
		deposit.Address,
		deposit.PaymentURL,
		deposit.QRCode,
		deposit.ExpiresAt,
		deposit.Status,
		deposit.CreatedAt,
		deposit.UpdatedAt,
	)

	if err != nil {
		return "", fmt.Errorf("failed to create deposit record: %w", err)
	}

	return deposit.ID, nil
}

func (r *walletRepository) CreateWithdrawal(ctx context.Context, tx pgx.Tx, withdrawal *model.WithdrawalInfo, userID string, destinationAddress string) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO withdrawals (
			user_id, amount, fee, destination_address, status
		) VALUES ($1, $2, $3, $4, 'pending')
		RETURNING id
	`,
		userID, withdrawal.Amount, withdrawal.Fee, destinationAddress,
	).Scan(&withdrawal.ID)

	if err != nil {
		return fmt.Errorf("failed to create withdrawal record: %w", err)
	}

	return nil
}

func (r *walletRepository) UpdateWalletBalance(ctx context.Context, tx pgx.Tx, userID string, amount float64) error {
	_, err := tx.Exec(ctx,
		"UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
		amount, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}

	return nil
}

func (r *walletRepository) GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	query := `
		SELECT 
			id, type, amount, status, COALESCE(tx_hash, ''), created_at, updated_at
		FROM transactions
		WHERE user_id = $1 AND ($2 = '' OR type = $2)
		ORDER BY created_at DESC
		LIMIT $3
	`

	rows, err := r.db.Query(ctx, query, userID, txType, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query transaction history: %w", err)
	}
	defer rows.Close()

	var transactions []model.Transaction
	for rows.Next() {
		var tx model.Transaction
		err := rows.Scan(
			&tx.ID,
			&tx.Type,
			&tx.Amount,
			&tx.Status,
			&tx.TxHash,
			&tx.CreatedAt,
			&tx.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transaction row: %w", err)
		}
		transactions = append(transactions, tx)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating transaction rows: %w", err)
	}

	return transactions, nil
}

func (r *walletRepository) CreateWalletWithBalance(ctx context.Context, wallet *model.Wallet, privateKeyStr string, encryptedPrivateKey string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO wallets (id, user_id, public_key, private_key, encrypted_private_key, balance, created_at, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err = tx.Exec(ctx, query,
		wallet.ID,
		wallet.UserID,
		wallet.PublicKey,
		privateKeyStr,
		encryptedPrivateKey,
		wallet.Balance,
		wallet.CreatedAt,
		wallet.LastUpdated,
	)
	if err != nil {
		return fmt.Errorf("failed to create wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *walletRepository) ExecuteDeposit(ctx context.Context, deposit *model.DepositInfo, userID string, paymentType string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = r.CreateDeposit(ctx, tx, deposit, userID, paymentType)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *walletRepository) ExecuteWithdrawal(ctx context.Context, withdrawal *model.WithdrawalInfo, userID string, destinationAddress string, amount float64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	err = r.CreateWithdrawal(ctx, tx, withdrawal, userID, destinationAddress)
	if err != nil {
		return err
	}

	err = r.UpdateWalletBalance(ctx, tx, userID, amount)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
