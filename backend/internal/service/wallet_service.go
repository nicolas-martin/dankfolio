package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/errors"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

type WalletService struct {
	db db.DB
}

func NewWalletService(db db.DB) *WalletService {
	return &WalletService{db: db}
}

func (s *WalletService) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	query := `
		SELECT id, user_id, public_key, balance, last_updated
		FROM wallets
		WHERE user_id = $1
	`

	wallet := &model.Wallet{}
	err := s.db.QueryRow(ctx, query, userID).Scan(
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

func (s *WalletService) CreateWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	wallet := &model.Wallet{
		UserID:      userID,
		PublicKey:   generateWalletAddress(),
		Balance:     0,
		LastUpdated: time.Now(),
	}

	query := `
		INSERT INTO wallets (user_id, public_key, balance, last_updated)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	err = tx.QueryRow(ctx, query,
		wallet.UserID,
		wallet.PublicKey,
		wallet.Balance,
		wallet.LastUpdated,
	).Scan(&wallet.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return wallet, nil
}

func (s *WalletService) InitiateDeposit(ctx context.Context, userID string, req model.DepositRequest) (*model.DepositInfo, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create deposit record
	depositInfo := &model.DepositInfo{
		Address:   generateDepositAddress(),
		Amount:    req.Amount,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	if req.PaymentType != "crypto" {
		depositInfo.PaymentURL = generatePaymentURL(req.PaymentType, req.Amount)
		depositInfo.QRCode = generateQRCode(depositInfo.PaymentURL)
	}

	// Insert deposit record
	query := `
		INSERT INTO deposits (
			user_id, amount, payment_type, address, 
			payment_url, qr_code, expires_at, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
		RETURNING id
	`

	var depositID string
	err = tx.QueryRow(ctx, query,
		userID, req.Amount, req.PaymentType, depositInfo.Address,
		depositInfo.PaymentURL, depositInfo.QRCode, depositInfo.ExpiresAt,
	).Scan(&depositID)
	if err != nil {
		return nil, fmt.Errorf("failed to create deposit record: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return depositInfo, nil
}

func (s *WalletService) InitiateWithdrawal(ctx context.Context, userID string, req model.WithdrawalRequest) (*model.WithdrawalInfo, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check balance
	var balance float64
	err = tx.QueryRow(ctx, "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&balance)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet balance: %w", err)
	}

	if balance < req.Amount {
		return nil, errors.NewValidationError("insufficient balance")
	}

	// Calculate fee
	fee := calculateWithdrawalFee(req.Amount)
	totalAmount := req.Amount + fee

	// Create withdrawal record
	withdrawalInfo := &model.WithdrawalInfo{
		Amount:        req.Amount,
		Fee:           fee,
		TotalAmount:   totalAmount,
		Status:        "pending",
		EstimatedTime: "10-30 minutes",
	}

	query := `
		INSERT INTO withdrawals (
			user_id, amount, fee, destination_address, status
		) VALUES ($1, $2, $3, $4, 'pending')
		RETURNING id
	`

	err = tx.QueryRow(ctx, query,
		userID, req.Amount, fee, req.DestinationAddress,
	).Scan(&withdrawalInfo.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to create withdrawal record: %w", err)
	}

	// Update wallet balance
	_, err = tx.Exec(ctx,
		"UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
		totalAmount, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return withdrawalInfo, nil
}

func (s *WalletService) GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	query := `
		SELECT 
			id, type, amount, status, tx_hash, created_at, updated_at
		FROM (
			SELECT 
				id, 'deposit' as type, amount, status, 
				tx_hash, created_at, updated_at
			FROM deposits
			WHERE user_id = $1
			UNION ALL
			SELECT 
				id, 'withdrawal' as type, amount, status,
				tx_hash, created_at, updated_at
			FROM withdrawals
			WHERE user_id = $1
		) t
		WHERE ($2 = '' OR type = $2)
		ORDER BY created_at DESC
		LIMIT $3
	`

	rows, err := s.db.Query(ctx, query, userID, txType, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query transaction history: %w", err)
	}
	defer rows.Close()

	var transactions []model.Transaction
	for rows.Next() {
		var tx model.Transaction
		err := rows.Scan(
			&tx.ID, &tx.Type, &tx.Amount, &tx.Status,
			&tx.TxHash, &tx.CreatedAt, &tx.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transaction row: %w", err)
		}
		transactions = append(transactions, tx)
	}

	return transactions, nil
}

func calculateWithdrawalFee(amount float64) float64 {
	return amount * 0.001 // 0.1% fee
}

func generateDepositAddress() string {
	// Implementation for generating deposit address
	return "0x..."
}

func generatePaymentURL(paymentType string, amount float64) string {
	// Implementation for generating payment URL
	return "https://payment.provider.com/..."
}

func generateQRCode(url string) string {
	// Implementation for generating QR code
	return "data:image/png;base64,..."
}

func generateWalletAddress() string {
	// Implementation for generating wallet address
	return "0x..."
}

func (s *WalletService) ExecuteTradeTransaction(ctx context.Context, tx pgx.Tx, userID string, trade *model.Trade) error {
	// Get current wallet balance
	var balance float64
	err := tx.QueryRow(ctx, "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&balance)
	if err != nil {
		return fmt.Errorf("failed to get wallet balance: %w", err)
	}

	// Calculate total cost including fee
	totalCost := trade.Amount * trade.Price
	if trade.Type == "buy" {
		totalCost += trade.Fee
		if balance < totalCost {
			return errors.NewValidationError("insufficient balance")
		}
		// Deduct total cost from balance
		_, err = tx.Exec(ctx,
			"UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
			totalCost, userID,
		)
	} else { // sell
		// Add proceeds minus fee to balance
		_, err = tx.Exec(ctx,
			"UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
			totalCost-trade.Fee, userID,
		)
	}

	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}

	return nil
}

func (s *WalletService) ValidateWithdrawal(ctx context.Context, userID string, req model.WithdrawalRequest) error {
	// Get current wallet balance
	var balance float64
	err := s.db.QueryRow(ctx, "SELECT balance FROM wallets WHERE user_id = $1", userID).Scan(&balance)
	if err != nil {
		return fmt.Errorf("failed to get wallet balance: %w", err)
	}

	// Calculate fee
	fee := calculateWithdrawalFee(req.Amount)
	totalAmount := req.Amount + fee

	// Check if user has sufficient balance
	if balance < totalAmount {
		return errors.NewValidationError("insufficient balance")
	}

	// Validate destination address format
	if !isValidAddress(req.DestinationAddress) {
		return errors.NewValidationError("invalid destination address")
	}

	return nil
}

func isValidAddress(address string) bool {
	// TODO: Implement proper address validation based on the blockchain/network
	return len(address) > 0
}
