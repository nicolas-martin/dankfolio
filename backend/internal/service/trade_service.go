package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
)

type TradeService struct {
	coinService   *CoinService
	walletService *WalletService
	solanaService *SolanaTradeService
	tradeRepo     repository.TradeRepository
}

func NewTradeService(cs *CoinService, ws *WalletService, ss *SolanaTradeService, tr repository.TradeRepository) *TradeService {
	return &TradeService{
		coinService:   cs,
		walletService: ws,
		solanaService: ss,
		tradeRepo:     tr,
	}
}

func (s *TradeService) PreviewTrade(ctx context.Context, req model.TradeRequest) (*model.TradePreview, error) {
	// Get current coin price
	coin, err := s.coinService.GetCoinByID(ctx, req.CoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}

	// Get user wallet for balance check
	userWallet, err := s.walletService.GetWallet(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user wallet: %w", err)
	}

	// Calculate trade details
	amount := req.Amount
	price := coin.CurrentPrice
	fee := calculateTradeFee(amount, price)
	slippage := calculateSlippage(amount, coin.Volume24h)

	// Calculate final amount and validate balance
	totalCost := amount * price
	if req.Type == "buy" {
		if userWallet.Balance < totalCost+fee {
			return nil, fmt.Errorf("insufficient balance for trade")
		}
		amount = amount - fee
	} else {
		// For sell trades, check token balance
		tokenBalance, err := s.solanaService.GetTokenBalance(ctx, userWallet.PublicKey, req.CoinID)
		if err != nil {
			return nil, fmt.Errorf("failed to get token balance: %w", err)
		}
		if float64(tokenBalance) < amount {
			return nil, fmt.Errorf("insufficient token balance for trade")
		}
		amount = amount - fee
	}

	return &model.TradePreview{
		CoinSymbol:  coin.Symbol,
		Type:        req.Type,
		Amount:      amount,
		Price:       price,
		Fee:         fee,
		Slippage:    slippage,
		FinalAmount: amount,
		TotalCost:   totalCost,
	}, nil
}

func (s *TradeService) ExecuteTrade(ctx context.Context, req model.TradeRequest) (*model.Trade, error) {
	// Get coin details
	coin, err := s.coinService.GetCoinByID(ctx, req.CoinID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin: %w", err)
	}

	// Get user wallet
	userWallet, err := s.walletService.GetWallet(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user wallet: %w", err)
	}

	// Convert wallet public key
	pubKey, err := solana.PublicKeyFromBase58(userWallet.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("invalid wallet public key: %w", err)
	}

	// Create trade record
	trade := &model.Trade{
		ID:         fmt.Sprintf("trade_%s_%d", req.UserID, time.Now().UnixNano()),
		UserID:     req.UserID,
		CoinID:     req.CoinID,
		CoinSymbol: coin.Symbol,
		Type:       req.Type,
		Amount:     req.Amount,
		Price:      coin.CurrentPrice,
		Fee:        calculateTradeFee(req.Amount, coin.CurrentPrice),
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// For buy trades, ensure ATA exists
	if req.Type == "buy" {
		// Create ATA if it doesn't exist
		err = s.solanaService.CreateAssociatedTokenAccountIfNeeded(ctx, trade, pubKey)
		if err != nil {
			trade.Status = "failed"
			_ = s.tradeRepo.ExecuteTradeTransaction(ctx, trade)
			return nil, fmt.Errorf("failed to create associated token account: %w", err)
		}
	}

	// Execute trade on blockchain
	err = s.solanaService.ExecuteTrade(ctx, trade, pubKey)
	if err != nil {
		trade.Status = "failed"
		_ = s.tradeRepo.ExecuteTradeTransaction(ctx, trade)
		return nil, fmt.Errorf("failed to execute trade on blockchain: %w", err)
	}

	// Update trade status and execute database transaction
	trade.Status = "completed"
	trade.CompletedAt = time.Now()
	err = s.tradeRepo.ExecuteTradeTransaction(ctx, trade)
	if err != nil {
		return nil, fmt.Errorf("failed to save trade: %w", err)
	}

	return trade, nil
}

func (s *TradeService) GetTradeHistory(ctx context.Context, userID string) ([]model.Trade, error) {
	return s.tradeRepo.GetTradeHistory(ctx, userID)
}

func calculateTradeFee(amount, price float64) float64 {
	return amount * price * 0.001 // 0.1% fee
}

func calculateSlippage(tradeAmount, volume24h float64) float64 {
	return (tradeAmount / volume24h) * 100
}
