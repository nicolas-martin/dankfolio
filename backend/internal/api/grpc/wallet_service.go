package grpc

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/dankfoliov1connect"
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
