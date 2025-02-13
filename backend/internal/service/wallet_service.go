package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
)

// WalletService handles wallet operations
type WalletService struct {
	rpcEndpoint string
	walletRepo  repository.WalletRepository
}

// NewWalletService creates a new WalletService
func NewWalletService(rpcEndpoint string, walletRepo repository.WalletRepository) *WalletService {
	return &WalletService{
		rpcEndpoint: rpcEndpoint,
		walletRepo:  walletRepo,
	}
}

// CreateWallet creates a new wallet for a user
func (s *WalletService) CreateWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	// Generate new Solana wallet
	wallet := solana.NewWallet()

	// Create wallet model
	now := time.Now()
	walletModel := &model.Wallet{
		ID:          uuid.New().String(),
		UserID:      userID,
		PublicKey:   wallet.PublicKey().String(),
		Balance:     0,
		CreatedAt:   now,
		LastUpdated: now,
	}

	// Save wallet to repository
	err := s.walletRepo.CreateWallet(ctx, walletModel)
	if err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	return walletModel, nil
}

// GetWallet retrieves a user's wallet
func (s *WalletService) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	return s.walletRepo.GetWallet(ctx, userID)
}

// CreateDeposit creates a new deposit request
func (s *WalletService) CreateDeposit(ctx context.Context, userID string, req model.DepositRequest) (*model.Transaction, error) {
	// Create deposit transaction
	now := time.Now()
	tx := &model.Transaction{
		ID:        uuid.New().String(),
		UserID:    userID,
		Type:      "deposit",
		Amount:    req.Amount,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save transaction
	err := s.walletRepo.CreateTransaction(ctx, tx)
	if err != nil {
		return nil, fmt.Errorf("failed to create deposit: %w", err)
	}

	return tx, nil
}

// ValidateWithdrawal validates a withdrawal request
func (s *WalletService) ValidateWithdrawal(ctx context.Context, userID string, req model.WithdrawalRequest) error {
	wallet, err := s.GetWallet(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get wallet: %w", err)
	}

	// Calculate total amount including fee
	fee := req.Amount * 0.001 // 0.1% fee
	totalAmount := req.Amount + fee

	if wallet.Balance < totalAmount {
		return fmt.Errorf("insufficient balance")
	}

	return nil
}

// RequestWithdrawal processes a withdrawal request
func (s *WalletService) RequestWithdrawal(ctx context.Context, userID string, req model.WithdrawalRequest) error {
	// Validate withdrawal first
	if err := s.ValidateWithdrawal(ctx, userID, req); err != nil {
		return err
	}

	// Create withdrawal transaction
	now := time.Now()
	tx := &model.Transaction{
		ID:        uuid.New().String(),
		UserID:    userID,
		Type:      "withdrawal",
		Amount:    req.Amount,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save transaction and update wallet balance
	err := s.walletRepo.ExecuteWithdrawal(ctx, tx, userID)
	if err != nil {
		return fmt.Errorf("failed to execute withdrawal: %w", err)
	}

	return nil
}

// GetTransactionHistory retrieves transaction history for a user
func (s *WalletService) GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	return s.walletRepo.GetTransactions(ctx, userID, txType, limit)
}
