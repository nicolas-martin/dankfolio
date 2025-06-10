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
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to prepare transfer: %w", err))
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
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to submit transfer: %w", err))
	}

	slog.Info("Transfer submitted successfully", "tx_hash", txHash)
	res := connect.NewResponse(&pb.SubmitTransferResponse{
		TransactionHash: txHash,
	})
	return res, nil
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
