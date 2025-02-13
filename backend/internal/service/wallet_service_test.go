package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestWalletService(t *testing.T) (*WalletService, repository.WalletRepository, func()) {
	// Setup test database
	db, cleanup := testutil.SetupTestDB(t)

	// Setup test schema
	ctx := context.Background()
	err := testutil.SetupTestSchema(ctx, db)
	require.NoError(t, err)

	// Create repositories and services
	walletRepo := repository.NewWalletRepository(db)
	walletService := NewWalletService("https://api.devnet.solana.com", walletRepo)

	return walletService, walletRepo, cleanup
}

func TestWalletService_CreateAndGetWallet(t *testing.T) {
	walletService, _, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New().String()

	// Create a new wallet
	wallet, err := walletService.CreateWallet(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Verify wallet properties
	assert.Equal(t, userID, wallet.UserID)
	assert.NotEmpty(t, wallet.PublicKey)
	assert.Equal(t, float64(0), wallet.Balance)
	assert.False(t, wallet.CreatedAt.IsZero())
	assert.False(t, wallet.LastUpdated.IsZero())

	// Get the wallet
	retrieved, err := walletService.GetWallet(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)

	// Verify retrieved wallet matches created wallet
	assert.Equal(t, wallet.ID, retrieved.ID)
	assert.Equal(t, wallet.UserID, retrieved.UserID)
	assert.Equal(t, wallet.PublicKey, retrieved.PublicKey)
	assert.Equal(t, wallet.Balance, retrieved.Balance)
}

func TestWalletService_DepositFlow(t *testing.T) {
	walletService, walletRepo, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New().String()

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, wallet)

	initialBalance := wallet.Balance

	// Create deposit request
	depositReq := &model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}

	// Initiate deposit
	depositInfo, err := walletService.InitiateDeposit(ctx, userID, depositReq)
	require.NoError(t, err)
	require.NotNil(t, depositInfo)

	// Verify deposit info
	assert.NotEmpty(t, depositInfo.ID)
	assert.Equal(t, depositReq.Amount, depositInfo.Amount)
	assert.Equal(t, "pending", depositInfo.Status)
	assert.Equal(t, depositReq.PaymentType, depositInfo.PaymentType)
	assert.NotEmpty(t, depositInfo.Address)
	assert.False(t, depositInfo.ExpiresAt.IsZero())
	assert.False(t, depositInfo.CreatedAt.IsZero())
	assert.False(t, depositInfo.UpdatedAt.IsZero())

	// Verify wallet balance hasn't changed yet (deposit is pending)
	wallet, err = walletService.GetWallet(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, initialBalance, wallet.Balance)

	// Simulate deposit completion (this would normally be done by a background job)
	err = walletRepo.ExecuteDeposit(ctx, depositInfo, userID, depositReq.PaymentType)
	require.NoError(t, err)

	// Verify wallet balance after deposit
	wallet, err = walletService.GetWallet(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, initialBalance+depositReq.Amount, wallet.Balance)
}

func TestWalletService_WithdrawalFlow(t *testing.T) {
	walletService, walletRepo, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New().String()

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Fund the wallet first
	depositReq := &model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}
	depositInfo, err := walletService.InitiateDeposit(ctx, userID, depositReq)
	require.NoError(t, err)
	err = walletRepo.ExecuteDeposit(ctx, depositInfo, userID, depositReq.PaymentType)
	require.NoError(t, err)

	// Verify initial balance
	wallet, err = walletService.GetWallet(ctx, userID)
	require.NoError(t, err)
	initialBalance := wallet.Balance
	assert.Equal(t, depositReq.Amount, initialBalance)

	// Create withdrawal request
	withdrawalReq := &model.WithdrawalRequest{
		Amount:             50.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}

	// Validate withdrawal request
	err = walletService.ValidateWithdrawal(ctx, userID, *withdrawalReq)
	require.NoError(t, err)

	// Initiate withdrawal
	withdrawalInfo, err := walletService.InitiateWithdrawal(ctx, userID, withdrawalReq)
	require.NoError(t, err)
	require.NotNil(t, withdrawalInfo)

	// Verify withdrawal info
	assert.NotEmpty(t, withdrawalInfo.ID)
	assert.Equal(t, withdrawalReq.Amount, withdrawalInfo.Amount)
	assert.Equal(t, "pending", withdrawalInfo.Status)
	assert.Equal(t, withdrawalReq.DestinationChain, withdrawalInfo.DestinationChain)
	assert.False(t, withdrawalInfo.CreatedAt.IsZero())
	assert.False(t, withdrawalInfo.UpdatedAt.IsZero())

	// Verify wallet balance after withdrawal
	wallet, err = walletService.GetWallet(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, initialBalance-withdrawalReq.Amount-withdrawalInfo.Fee, wallet.Balance)

	// Try to withdraw more than available balance
	invalidWithdrawalReq := &model.WithdrawalRequest{
		Amount:             1000.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}

	// Validate invalid withdrawal request
	err = walletService.ValidateWithdrawal(ctx, userID, *invalidWithdrawalReq)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient balance")

	// Try to initiate invalid withdrawal
	_, err = walletService.InitiateWithdrawal(ctx, userID, invalidWithdrawalReq)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient balance")
}

func TestWalletService_TransactionHistory(t *testing.T) {
	walletService, walletRepo, cleanup := setupTestWalletService(t)
	defer cleanup()

	ctx := context.Background()
	userID := uuid.New().String()

	// Create a wallet first
	wallet, err := walletService.CreateWallet(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, wallet)

	// Create and execute a deposit
	depositReq := &model.DepositRequest{
		Amount:      100.0,
		PaymentType: "crypto",
	}
	depositInfo, err := walletService.InitiateDeposit(ctx, userID, depositReq)
	require.NoError(t, err)
	err = walletRepo.ExecuteDeposit(ctx, depositInfo, userID, depositReq.PaymentType)
	require.NoError(t, err)

	// Create and execute a withdrawal
	withdrawalReq := &model.WithdrawalRequest{
		Amount:             50.0,
		DestinationChain:   "solana",
		DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
	}
	_, err = walletService.InitiateWithdrawal(ctx, userID, withdrawalReq)
	require.NoError(t, err)

	// Get transaction history
	history, err := walletService.GetTransactionHistory(ctx, userID, "", 10)
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
