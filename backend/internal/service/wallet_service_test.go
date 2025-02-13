package service

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/db"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestWalletService(t *testing.T) (*WalletService, repository.WalletRepository, db.DB, func()) {
	// Setup test database
	testDB, cleanup := testutil.SetupTestDB(t)

	// Setup test schema
	ctx := context.Background()
	err := testutil.SetupTestSchema(ctx, testDB)
	require.NoError(t, err)

	// Create repositories and services
	walletRepo := repository.NewWalletRepository(testDB)
	walletService := NewWalletService("https://api.devnet.solana.com", walletRepo)

	return walletService, walletRepo, testDB, cleanup
}

func TestWalletService_CreateAndGetWallet(t *testing.T) {
	walletService, _, testDB, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New()

	// First create the test user
	_, err := testDB.Exec(ctx, `
		INSERT INTO users (id, email, username, password_hash)
		VALUES ($1, $2, $3, $4)
	`, userID, fmt.Sprintf("test_%s@example.com", userID), fmt.Sprintf("test_user_%s", userID), "test_password_hash")
	require.NoError(t, err)

	// Create a new wallet
	wallet, err := walletService.CreateWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Verify wallet properties
	assert.Equal(t, userID.String(), wallet.UserID)
	assert.NotEmpty(t, wallet.PublicKey)
	assert.Equal(t, float64(0), wallet.Balance)
	assert.False(t, wallet.CreatedAt.IsZero())
	assert.False(t, wallet.LastUpdated.IsZero())

	// Get the wallet
	retrieved, err := walletService.GetWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, retrieved)

	// Verify retrieved wallet matches created wallet
	assert.Equal(t, wallet.ID, retrieved.ID)
	assert.Equal(t, wallet.UserID, retrieved.UserID)
	assert.Equal(t, wallet.PublicKey, retrieved.PublicKey)
	assert.Equal(t, wallet.Balance, retrieved.Balance)
}

func TestWalletService_DepositFlow(t *testing.T) {
	walletService, walletRepo, testDB, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New()

	// First create the test user
	_, err := testDB.Exec(ctx, `
		INSERT INTO users (id, email, username, password_hash)
		VALUES ($1, $2, $3, $4)
	`, userID, fmt.Sprintf("test_%s@example.com", userID), fmt.Sprintf("test_user_%s", userID), "test_password_hash")
	require.NoError(t, err)

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, wallet)

	initialBalance := wallet.Balance

	// Create deposit request
	depositReq := model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}

	// Create deposit
	tx, err := walletService.CreateDeposit(ctx, userID.String(), depositReq)
	require.NoError(t, err)
	require.NotNil(t, tx)

	// Verify transaction info
	assert.NotEmpty(t, tx.ID)
	assert.Equal(t, depositReq.Amount, tx.Amount)
	assert.Equal(t, "pending", tx.Status)
	assert.Equal(t, "deposit", tx.Type)
	assert.False(t, tx.CreatedAt.IsZero())
	assert.False(t, tx.UpdatedAt.IsZero())

	// Verify wallet balance hasn't changed yet (deposit is pending)
	wallet, err = walletService.GetWallet(ctx, userID.String())
	require.NoError(t, err)
	assert.Equal(t, initialBalance, wallet.Balance)

	// Simulate deposit completion
	err = walletRepo.ExecuteDeposit(ctx, tx, userID.String(), depositReq.PaymentType)
	require.NoError(t, err)

	// Verify wallet balance after deposit
	wallet, err = walletService.GetWallet(ctx, userID.String())
	require.NoError(t, err)
	assert.Equal(t, initialBalance+depositReq.Amount, wallet.Balance)
}

func TestWalletService_WithdrawalFlow(t *testing.T) {
	walletService, walletRepo, testDB, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New()

	// First create the test user
	_, err := testDB.Exec(ctx, `
		INSERT INTO users (id, email, username, password_hash)
		VALUES ($1, $2, $3, $4)
	`, userID, fmt.Sprintf("test_%s@example.com", userID), fmt.Sprintf("test_user_%s", userID), "test_password_hash")
	require.NoError(t, err)

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Fund the wallet first
	depositReq := model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}
	tx, err := walletService.CreateDeposit(ctx, userID.String(), depositReq)
	require.NoError(t, err)
	err = walletRepo.ExecuteDeposit(ctx, tx, userID.String(), depositReq.PaymentType)
	require.NoError(t, err)

	// Verify initial balance
	wallet, err = walletService.GetWallet(ctx, userID.String())
	require.NoError(t, err)
	initialBalance := wallet.Balance
	assert.Equal(t, depositReq.Amount, initialBalance)

	// Create withdrawal request
	withdrawalReq := model.WithdrawalRequest{
		Amount:             50.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}

	// Validate withdrawal request
	err = walletService.ValidateWithdrawal(ctx, userID.String(), withdrawalReq)
	require.NoError(t, err)

	// Initiate withdrawal
	err = walletService.RequestWithdrawal(ctx, userID.String(), withdrawalReq)
	require.NoError(t, err)

	// Verify wallet balance after withdrawal (including fee)
	wallet, err = walletService.GetWallet(ctx, userID.String())
	require.NoError(t, err)
	withdrawalFee := withdrawalReq.Amount * 0.001 // 0.1% fee
	assert.Equal(t, initialBalance-withdrawalReq.Amount-withdrawalFee, wallet.Balance)

	// Try to withdraw more than available balance
	invalidWithdrawalReq := model.WithdrawalRequest{
		Amount:             1000.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}

	// Validate invalid withdrawal request
	err = walletService.ValidateWithdrawal(ctx, userID.String(), invalidWithdrawalReq)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient balance")

	// Try to initiate invalid withdrawal
	err = walletService.RequestWithdrawal(ctx, userID.String(), invalidWithdrawalReq)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient balance")
}

func TestWalletService_TransactionHistory(t *testing.T) {
	walletService, walletRepo, testDB, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New()

	// First create the test user
	_, err := testDB.Exec(ctx, `
		INSERT INTO users (id, email, username, password_hash)
		VALUES ($1, $2, $3, $4)
	`, userID, fmt.Sprintf("test_%s@example.com", userID), fmt.Sprintf("test_user_%s", userID), "test_password_hash")
	require.NoError(t, err)

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID.String())
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Create and execute a deposit
	depositReq := model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}
	depositTx, err := walletService.CreateDeposit(ctx, userID.String(), depositReq)
	require.NoError(t, err)
	err = walletRepo.ExecuteDeposit(ctx, depositTx, userID.String(), depositReq.PaymentType)
	require.NoError(t, err)

	// Create and execute a withdrawal
	withdrawalReq := model.WithdrawalRequest{
		Amount:             50.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}
	err = walletService.RequestWithdrawal(ctx, userID.String(), withdrawalReq)
	require.NoError(t, err)

	// Get transaction history
	history, err := walletService.GetTransactionHistory(ctx, userID.String(), "", 10)
	require.NoError(t, err)
	require.NotNil(t, history)

	// Should have at least two transactions (deposit and withdrawal)
	assert.GreaterOrEqual(t, len(history), 2)

	// Verify transaction properties
	for _, tx := range history {
		assert.NotEmpty(t, tx.ID)
		assert.NotEmpty(t, tx.Type)
		assert.NotZero(t, tx.Amount)
		assert.NotEmpty(t, tx.Status)
		assert.False(t, tx.CreatedAt.IsZero())
	}

	// Verify transaction types
	var foundDeposit, foundWithdrawal bool
	for _, tx := range history {
		if tx.Type == "deposit" {
			foundDeposit = true
			assert.Equal(t, depositReq.Amount, tx.Amount)
		} else if tx.Type == "withdrawal" {
			foundWithdrawal = true
			assert.Equal(t, withdrawalReq.Amount, tx.Amount)
		}
	}
	assert.True(t, foundDeposit, "Should have found a deposit transaction")
	assert.True(t, foundWithdrawal, "Should have found a withdrawal transaction")
}
