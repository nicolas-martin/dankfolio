package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

// walletServiceHandler implements the WalletService API
type walletServiceHandler struct {
	dankfoliov1connect.UnimplementedWalletServiceHandler
	walletService *wallet.Service
}

// newWalletServiceHandler creates a new walletServiceHandler
func newWalletServiceHandler(walletService *wallet.Service) *walletServiceHandler {
	return &walletServiceHandler{
		walletService: walletService,
	}
}

// GetWalletBalance returns the balance for a wallet
func (s *walletServiceHandler) GetWalletBalances(
	ctx context.Context,
	req *connect.Request[pb.GetWalletBalancesRequest],
) (*connect.Response[pb.GetWalletBalancesResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet address is required"))
	}

	slog.Debug("Getting wallet balances", "address", req.Msg.Address)
	balances, err := s.walletService.GetWalletBalances(ctx, req.Msg.Address)
	if err != nil {
		slog.Error("Failed to get wallet balances", "address", req.Msg.Address, "error", err)

		// Check for specific error types and return appropriate GRPC codes
		errorMsg := err.Error()
		if strings.Contains(errorMsg, "INVALID_ADDRESS:") {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid wallet address: %s", strings.TrimPrefix(errorMsg, "INVALID_ADDRESS: ")))
		}
		if strings.Contains(errorMsg, "NETWORK_ERROR:") {
			return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("network error: %s", strings.TrimPrefix(errorMsg, "NETWORK_ERROR: ")))
		}

		// Default to internal error for unknown error types
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get wallet balance: %w", err))
	}

	return connect.NewResponse(&pb.GetWalletBalancesResponse{
		WalletBalance: convertModelBalanceToPb(balances),
	}), nil
}

// CreateWallet generates a new Solana wallet
func (s *walletServiceHandler) CreateWallet(
	ctx context.Context,
	req *connect.Request[pb.CreateWalletRequest],
) (*connect.Response[pb.CreateWalletResponse], error) {
	slog.Debug("Creating new wallet")
	wallet, err := s.walletService.CreateWallet(ctx)
	if err != nil {
		slog.Error("Failed to create wallet", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to create wallet: %w", err))
	}

	slog.Info("New wallet created successfully", "public_key", wallet.PublicKey)
	return connect.NewResponse(&pb.CreateWalletResponse{
		PublicKey: wallet.PublicKey,
		SecretKey: wallet.SecretKey,
		Mnemonic:  wallet.Mnemonic,
	}), nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *walletServiceHandler) PrepareTransfer(
	ctx context.Context,
	req *connect.Request[pb.PrepareTransferRequest],
) (*connect.Response[pb.PrepareTransferResponse], error) {
	if req.Msg.FromAddress == "" || req.Msg.ToAddress == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from and to addresses are required"))
	}
	if req.Msg.Amount <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("amount must be greater than 0"))
	}

	slog.Debug("Preparing transfer transaction",
		"from", req.Msg.FromAddress,
		"to", req.Msg.ToAddress,
		"coin_mint", req.Msg.CoinMint,
		"amount", req.Msg.Amount)

	unsignedTx, err := s.walletService.PrepareTransfer(ctx, req.Msg.FromAddress, req.Msg.ToAddress, req.Msg.CoinMint, req.Msg.Amount)
	if err != nil {
		slog.Error("Failed to prepare transfer",
			"from", req.Msg.FromAddress,
			"to", req.Msg.ToAddress,
			"error", err)
		// SECURITY: Don't expose internal error details
		// Check for specific user-facing errors
		if strings.Contains(err.Error(), "insufficient") {
			return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("insufficient funds for transfer"))
		}
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to prepare transfer"))
	}

	slog.Debug("Transfer transaction prepared successfully")
	res := connect.NewResponse(&pb.PrepareTransferResponse{
		UnsignedTransaction: unsignedTx,
	})
	return res, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *walletServiceHandler) SubmitTransfer(
	ctx context.Context,
	req *connect.Request[pb.SubmitTransferRequest],
) (*connect.Response[pb.SubmitTransferResponse], error) {
	if req.Msg.SignedTransaction == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("signed transaction is required"))
	}

	transferRequest := &wallet.TransferRequest{
		SignedTransaction:   req.Msg.SignedTransaction,
		UnsignedTransaction: req.Msg.UnsignedTransaction,
	}

	slog.Debug("Submitting transfer transaction")
	txHash, err := s.walletService.SubmitTransfer(ctx, transferRequest)
	if err != nil {
		slog.Error("Failed to submit transfer", "error", err)
		// SECURITY: Don't expose internal error details
		// Check for specific user-facing errors
		errMsg := err.Error()
		if strings.Contains(errMsg, "invalid signature") {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid transaction signature"))
		}
		if strings.Contains(errMsg, "expired") {
			return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("transaction expired, please retry"))
		}
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to submit transfer"))
	}

	slog.Info("Transfer submitted successfully", "tx_hash", txHash)
	res := connect.NewResponse(&pb.SubmitTransferResponse{
		TransactionHash: txHash,
	})
	return res, nil
}

// GetPortfolioPnL returns the profit and loss for a wallet
func (s *walletServiceHandler) GetPortfolioPnL(
	ctx context.Context,
	req *connect.Request[pb.GetPortfolioPnLRequest],
) (*connect.Response[pb.GetPortfolioPnLResponse], error) {
	if req.Msg.WalletAddress == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet address is required"))
	}

	slog.Debug("Getting portfolio PnL", "wallet_address", req.Msg.WalletAddress)
	
	totalValue, totalCostBasis, totalUnrealizedPnL, totalPnLPercentage, totalHoldings, tokenPnLs, err := s.walletService.GetPortfolioPnL(ctx, req.Msg.WalletAddress)
	if err != nil {
		slog.Error("Failed to get portfolio PnL", "wallet_address", req.Msg.WalletAddress, "error", err)
		// SECURITY: Don't expose internal error details
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get portfolio data"))
	}

	// Convert tokenPnLs to protobuf format
	pbTokenPnLs := make([]*pb.TokenPnL, 0, len(tokenPnLs))
	for _, tokenPnL := range tokenPnLs {
		pbTokenPnLs = append(pbTokenPnLs, &pb.TokenPnL{
			CoinId:          tokenPnL.CoinID,
			Symbol:          tokenPnL.Symbol,
			Name:            tokenPnL.Name,
			AmountHeld:      tokenPnL.AmountHeld,
			CostBasis:       tokenPnL.CostBasis,
			CurrentPrice:    tokenPnL.CurrentPrice,
			CurrentValue:    tokenPnL.CurrentValue,
			UnrealizedPnl:   tokenPnL.UnrealizedPnL,
			PnlPercentage:   tokenPnL.PnLPercentage,
			HasPurchaseData: tokenPnL.HasPurchaseData,
		})
	}

	slog.Info("Portfolio PnL calculated successfully", 
		"wallet_address", req.Msg.WalletAddress,
		"total_value", totalValue,
		"total_pnl", totalUnrealizedPnL,
		"token_count", len(pbTokenPnLs))

	return connect.NewResponse(&pb.GetPortfolioPnLResponse{
		TotalPortfolioValue: totalValue,
		TotalCostBasis:      totalCostBasis,
		TotalUnrealizedPnl:  totalUnrealizedPnL,
		TotalPnlPercentage:  totalPnLPercentage,
		TotalHoldings:       totalHoldings,
		TokenPnls:           pbTokenPnLs,
	}), nil
}

// Helper function to convert model.WalletBalance to pb.WalletBalance
func convertModelBalanceToPb(balance *wallet.WalletBalance) *pb.WalletBalance {
	return &pb.WalletBalance{
		Balances: convertModelCoinBalancesToPb(balance.Balances),
	}
}

// Helper function to convert model.TokenBalances to pb.Balances
func convertModelCoinBalancesToPb(coins []wallet.Balance) []*pb.Balance {
	pbCoins := make([]*pb.Balance, len(coins))
	for i, coin := range coins {
		pbCoins[i] = &pb.Balance{
			Id:     coin.ID,
			Amount: coin.Amount,
		}
	}
	return pbCoins
}
