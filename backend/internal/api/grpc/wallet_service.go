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


// RegisterWallet registers a wallet that was generated client-side
// This is the secure way to handle wallet creation - the server only knows the public key
func (s *walletServiceHandler) RegisterWallet(
	ctx context.Context,
	req *connect.Request[pb.RegisterWalletRequest],
) (*connect.Response[pb.RegisterWalletResponse], error) {
	if req.Msg.PublicKey == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("public key is required"))
	}

	slog.Info("Registering client-generated wallet", "public_key", req.Msg.PublicKey)
	
	// Validate the public key format
	if err := s.walletService.ValidatePublicKey(ctx, req.Msg.PublicKey); err != nil {
		slog.Error("Invalid public key provided", "public_key", req.Msg.PublicKey, "error", err)
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid public key format"))
	}
	
	// Store the wallet public key (e.g., in database for tracking)
	// This could associate the wallet with a user account, etc.
	if err := s.walletService.RegisterWallet(ctx, req.Msg.PublicKey); err != nil {
		slog.Error("Failed to register wallet", "public_key", req.Msg.PublicKey, "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to register wallet"))
	}
	
	slog.Info("Wallet registered successfully", "public_key", req.Msg.PublicKey)
	return connect.NewResponse(&pb.RegisterWalletResponse{
		Success: true,
		Message: "Wallet registered successfully",
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
