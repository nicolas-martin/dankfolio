package grpc

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

// WalletServer implements the WalletService API
type WalletServer struct {
	dankfoliov1connect.UnimplementedWalletServiceHandler
	walletService *wallet.Service
}

// NewWalletServer creates a new WalletServer
func NewWalletServer(walletService *wallet.Service) *WalletServer {
	return &WalletServer{
		walletService: walletService,
	}
}

// GetWalletBalance returns the balance for a wallet
func (s *WalletServer) GetWalletBalances(
	ctx context.Context,
	req *connect.Request[pb.GetWalletBalancesRequest],
) (*connect.Response[pb.GetWalletBalancesResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet address is required"))
	}

	balances, err := s.walletService.GetWalletBalances(ctx, req.Msg.Address)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get wallet balance: %w", err))
	}

	return connect.NewResponse(&pb.GetWalletBalancesResponse{
		WalletBalance: convertModelBalanceToPb(balances),
	}), nil
}

// CreateWallet generates a new Solana wallet
func (s *WalletServer) CreateWallet(
	ctx context.Context,
	req *connect.Request[pb.CreateWalletRequest],
) (*connect.Response[pb.CreateWalletResponse], error) {
	wallet, err := s.walletService.CreateWallet(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to create wallet: %w", err))
	}

	return connect.NewResponse(&pb.CreateWalletResponse{
		PublicKey: wallet.PublicKey,
		SecretKey: wallet.SecretKey,
	}), nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *WalletServer) PrepareTransfer(
	ctx context.Context,
	req *connect.Request[pb.PrepareTransferRequest],
) (*connect.Response[pb.PrepareTransferResponse], error) {
	if req.Msg.FromAddress == "" || req.Msg.ToAddress == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from and to addresses are required"))
	}
	if req.Msg.Amount <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("amount must be greater than 0"))
	}

	unsignedTx, err := s.walletService.PrepareTransfer(ctx, req.Msg.FromAddress, req.Msg.ToAddress, req.Msg.TokenMint, req.Msg.Amount)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to prepare transfer: %w", err))
	}

	res := connect.NewResponse(&pb.PrepareTransferResponse{
		UnsignedTransaction: unsignedTx,
	})
	return res, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *WalletServer) SubmitTransfer(
	ctx context.Context,
	req *connect.Request[pb.SubmitTransferRequest],
) (*connect.Response[pb.SubmitTransferResponse], error) {
	if req.Msg.SignedTransaction == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("signed transaction is required"))
	}

	txHash, err := s.walletService.SubmitTransfer(ctx, req.Msg.SignedTransaction)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to submit transfer: %w", err))
	}

	res := connect.NewResponse(&pb.SubmitTransferResponse{
		TransactionHash: txHash,
	})
	return res, nil
}

// Helper function to convert model.WalletBalance to pb.WalletBalance
func convertModelBalanceToPb(balance *wallet.WalletBalance) *pb.WalletBalance {
	return &pb.WalletBalance{
		Balances: convertModelTokenBalancesToPb(balance.Balances),
	}
}

// Helper function to convert model.TokenBalances to pb.Balances
func convertModelTokenBalancesToPb(tokens []wallet.Balance) []*pb.Balance {
	pbTokens := make([]*pb.Balance, len(tokens))
	for i, token := range tokens {
		pbTokens[i] = &pb.Balance{
			Id:     token.ID,
			Amount: token.Amount,
		}
	}
	return pbTokens
}
