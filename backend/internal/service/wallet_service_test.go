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

func TestWalletService_Integration(t *testing.T) {
	ctx := context.Background()

	// Setup test database
	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	// Setup test schema
	err := testutil.SetupTestSchema(ctx, db)
	require.NoError(t, err)
	defer func() {
		err := testutil.CleanupTestSchema(ctx, db)
		require.NoError(t, err)
	}()

	// Create repositories and services
	walletRepo := repository.NewWalletRepository(db)
	walletService := NewWalletService("https://api.devnet.solana.com", walletRepo)

	// Test user ID
	userID := uuid.New().String()

	t.Run("Create and Get Wallet", func(t *testing.T) {
		// Create a new wallet
		wallet, err := walletService.CreateWallet(context.Background(), userID)
		require.NoError(t, err)
		require.NotNil(t, wallet)

		// Verify wallet properties
		assert.Equal(t, userID, wallet.UserID)
		assert.NotEmpty(t, wallet.PublicKey)
		assert.Equal(t, float64(0), wallet.Balance)
		assert.False(t, wallet.CreatedAt.IsZero())
		assert.False(t, wallet.LastUpdated.IsZero())

		// Get the wallet
		retrieved, err := walletService.GetWallet(context.Background(), userID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)

		// Verify retrieved wallet matches created wallet
		assert.Equal(t, wallet.ID, retrieved.ID)
		assert.Equal(t, wallet.UserID, retrieved.UserID)
		assert.Equal(t, wallet.PublicKey, retrieved.PublicKey)
	})

	t.Run("Deposit Flow", func(t *testing.T) {
		// Create deposit request
		depositReq := &model.DepositRequest{
			Amount:      100.0,
			PaymentType: "crypto",
		}

		// Initiate deposit
		depositInfo, err := walletService.InitiateDeposit(context.Background(), userID, depositReq)
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
	})

	t.Run("Withdrawal Flow", func(t *testing.T) {
		// Create withdrawal request
		withdrawalReq := &model.WithdrawalRequest{
			Amount:             50.0,
			DestinationChain:   "solana",
			DestinationAddress: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
		}

		// Initiate withdrawal
		withdrawalInfo, err := walletService.InitiateWithdrawal(context.Background(), userID, withdrawalReq)
		require.Error(t, err) // Should fail due to insufficient balance
		assert.Contains(t, err.Error(), "insufficient balance")
		assert.Nil(t, withdrawalInfo)

		// Validate withdrawal request
		err = walletService.ValidateWithdrawal(context.Background(), userID, *withdrawalReq)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "insufficient balance")
	})

	t.Run("Transaction History", func(t *testing.T) {
		// Get transaction history
		history, err := walletService.GetTransactionHistory(context.Background(), userID, "", 10)
		require.NoError(t, err)
		require.NotNil(t, history)

		// Should have at least one transaction from the deposit test
		assert.GreaterOrEqual(t, len(history), 1)

		// Verify transaction properties
		for _, tx := range history {
			assert.NotEmpty(t, tx.ID)
			assert.NotEmpty(t, tx.Type)
			assert.NotZero(t, tx.Amount)
			assert.NotEmpty(t, tx.Status)
			assert.False(t, tx.CreatedAt.IsZero())
		}
	})
}
