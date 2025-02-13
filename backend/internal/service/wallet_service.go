package service

import (
	"context"
	"fmt"
	"time"

	"encoding/base64"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/google/uuid"
	"github.com/nicolas-martin/dankfolio/internal/errors"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
)

type WalletService struct {
	client     *rpc.Client
	walletRepo repository.WalletRepository
}

func NewWalletService(rpcEndpoint string, walletRepo repository.WalletRepository) *WalletService {
	return &WalletService{
		client:     rpc.New(rpcEndpoint),
		walletRepo: walletRepo,
	}
}

func (s *WalletService) GetWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	wallet, err := s.walletRepo.GetWallet(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get real-time balance from Solana network
	pubKey, err := solana.PublicKeyFromBase58(wallet.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("invalid public key: %w", err)
	}

	balance, err := s.client.GetBalance(
		ctx,
		pubKey,
		rpc.CommitmentFinalized,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get Solana balance: %w", err)
	}

	// Convert lamports to SOL
	wallet.Balance = float64(balance.Value) / 1e9

	return wallet, nil
}

func (s *WalletService) CreateWallet(ctx context.Context, userID string) (*model.Wallet, error) {
	// Generate new Solana wallet
	newWallet := solana.NewWallet()

	wallet := &model.Wallet{
		ID:          uuid.New().String(),
		UserID:      userID,
		PublicKey:   newWallet.PublicKey().String(),
		Balance:     0,
		CreatedAt:   time.Now(),
		LastUpdated: time.Now(),
	}

	// Convert private key to base58 string
	privateKeyStr := newWallet.PrivateKey.String()

	// TODO: Implement proper encryption of private key before storage
	encryptedPrivateKey := privateKeyStr // This should be properly encrypted in production

	err := s.walletRepo.CreateWalletWithBalance(ctx, wallet, privateKeyStr, encryptedPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	return wallet, nil
}

func (s *WalletService) InitiateDeposit(ctx context.Context, userID string, req *model.DepositRequest) (*model.DepositInfo, error) {
	depositInfo := &model.DepositInfo{
		ID:          uuid.New().String(),
		Amount:      req.Amount,
		Status:      "pending",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		PaymentType: req.PaymentType,
	}

	if req.PaymentType == "crypto" {
		depositInfo.Address = generateDepositAddress()
		depositInfo.ExpiresAt = time.Now().Add(24 * time.Hour)
	} else {
		depositInfo.PaymentURL = generatePaymentURL(req.PaymentType, req.Amount)
		depositInfo.QRCode = generateQRCode(depositInfo.PaymentURL)
	}

	err := s.walletRepo.ExecuteDeposit(ctx, depositInfo, userID, req.PaymentType)
	if err != nil {
		return nil, fmt.Errorf("failed to create deposit: %w", err)
	}

	return depositInfo, nil
}

func (s *WalletService) InitiateWithdrawal(ctx context.Context, userID string, req *model.WithdrawalRequest) (*model.WithdrawalInfo, error) {
	// Check balance
	wallet, err := s.walletRepo.GetWallet(ctx, userID)
	if err != nil {
		return nil, err
	}

	if wallet.Balance < req.Amount {
		return nil, errors.NewValidationError("insufficient balance")
	}

	// Calculate fee
	fee := calculateWithdrawalFee(req.Amount)
	totalAmount := req.Amount + fee

	withdrawalInfo := &model.WithdrawalInfo{
		ID:               uuid.New().String(),
		Amount:           req.Amount,
		Fee:              fee,
		TotalAmount:      totalAmount,
		Status:           "pending",
		EstimatedTime:    "10-30 minutes",
		DestinationChain: req.DestinationChain,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	err = s.walletRepo.ExecuteWithdrawal(ctx, withdrawalInfo, userID, req.DestinationAddress, -totalAmount)
	if err != nil {
		return nil, fmt.Errorf("failed to process withdrawal: %w", err)
	}

	return withdrawalInfo, nil
}

func (s *WalletService) GetTransactionHistory(ctx context.Context, userID string, txType string, limit int) ([]model.Transaction, error) {
	return s.walletRepo.GetTransactionHistory(ctx, userID, txType, limit)
}

func generateDepositAddress() string {
	// Generate a new Solana wallet address for deposits
	account := solana.NewWallet()
	return account.PublicKey().String()
}

func generatePaymentURL(paymentType string, amount float64) string {
	// Generate a payment URL based on the payment type and amount
	baseURL := "https://api.memetrading.com/pay"
	return fmt.Sprintf("%s/%s?amount=%.2f", baseURL, paymentType, amount)
}

func generateQRCode(url string) string {
	// Generate a QR code for the payment URL
	// This is a placeholder implementation that would typically use a QR code library
	return fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString([]byte(url)))
}

func calculateWithdrawalFee(amount float64) float64 {
	// Calculate the withdrawal fee based on the amount
	// This is a placeholder implementation
	baseFee := 0.001 // 0.1%
	return amount * baseFee
}

func (s *WalletService) ValidateWithdrawal(ctx context.Context, userID string, req model.WithdrawalRequest) error {
	// Get current wallet balance from Solana network
	wallet, err := s.GetWallet(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get wallet balance: %w", err)
	}

	// Calculate fee
	fee := calculateWithdrawalFee(req.Amount)
	totalAmount := req.Amount + fee

	// Check if user has sufficient balance
	if wallet.Balance < totalAmount {
		return errors.NewValidationError("insufficient balance")
	}

	// Validate Solana destination address format
	_, err = solana.PublicKeyFromBase58(req.DestinationAddress)
	if err != nil {
		return errors.NewValidationError("invalid Solana destination address")
	}

	return nil
}

func isValidAddress(address string) bool {
	// TODO: Implement proper address validation based on the blockchain/network
	return len(address) > 0
}
