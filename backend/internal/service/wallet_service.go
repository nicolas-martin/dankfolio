package service

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// WalletService handles wallet operations
type WalletService struct {
	rpcEndpoint  string
	mu           sync.RWMutex
	wallets      map[string]*model.Wallet      // In-memory storage using userID as key
	transactions map[string]*model.Transaction // In-memory storage using transaction ID as key
}

// NewWalletService creates a new WalletService
func NewWalletService(rpcEndpoint string) *WalletService {
	return &WalletService{
		rpcEndpoint:  rpcEndpoint,
		wallets:      make(map[string]*model.Wallet),
		transactions: make(map[string]*model.Transaction),
	}
}

// CreateWallet creates a new wallet for a user
func (s *WalletService) CreateWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if wallet already exists
	if _, exists := s.wallets[userID]; exists {
		return nil, fmt.Errorf("wallet already exists for user")
	}

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

	// Store in memory
	s.wallets[userID] = walletModel

	return walletModel, nil
}

// GetWallet retrieves a user's wallet
func (s *WalletService) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	wallet, exists := s.wallets[userID]
	if !exists {
		return nil, fmt.Errorf("wallet not found")
	}
	return wallet, nil
}

// CreateDeposit creates a new deposit request
func (s *WalletService) CreateDeposit(ctx context.Context, userID string, req model.DepositRequest) (*model.Transaction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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

	// Store transaction
	s.transactions[tx.ID] = tx

	// Update wallet balance
	wallet, exists := s.wallets[userID]
	if !exists {
		return nil, fmt.Errorf("wallet not found")
	}

	wallet.Balance += req.Amount
	wallet.LastUpdated = now
	s.wallets[userID] = wallet

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

	s.mu.Lock()
	defer s.mu.Unlock()

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

	// Store transaction
	s.transactions[tx.ID] = tx

	// Update wallet balance
	wallet := s.wallets[userID]
	fee := req.Amount * 0.001
	wallet.Balance -= (req.Amount + fee)
	wallet.LastUpdated = now
	s.wallets[userID] = wallet

	return nil
}

// GetTransactionHistory retrieves transaction history for a user
func (s *WalletService) GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var transactions []model.Transaction
	for _, tx := range s.transactions {
		if tx.UserID == userID && (txType == "" || tx.Type == txType) {
			transactions = append(transactions, *tx)
		}
	}

	// Sort by created time (newest first)
	sort.Slice(transactions, func(i, j int) bool {
		return transactions[i].CreatedAt.After(transactions[j].CreatedAt)
	})

	// Apply limit
	if limit > 0 && len(transactions) > limit {
		transactions = transactions[:limit]
	}

	return transactions, nil
}
