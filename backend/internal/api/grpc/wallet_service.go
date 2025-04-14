package grpc

import (
	"context"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// WalletServer implements the WalletService gRPC service
type WalletServer struct {
	pb.UnimplementedWalletServiceServer
	walletService *wallet.Service
}

// NewWalletServer creates a new WalletServer
func NewWalletServer(walletService *wallet.Service) *WalletServer {
	return &WalletServer{
		walletService: walletService,
	}
}

// GetWalletBalances returns the balances for all tokens in a wallet
func (s *WalletServer) GetWalletBalances(ctx context.Context, req *pb.GetWalletBalancesRequest) (*pb.GetWalletBalancesResponse, error) {
	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address is required")
	}

	balances, err := s.walletService.GetWalletBalances(ctx, req.Address)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get wallet balances: %v", err)
	}

	// Convert domain model to protobuf response
	pbBalances := make([]*pb.Balance, 0, len(balances.Balances))
	for _, b := range balances.Balances {
		pbBalances = append(pbBalances, &pb.Balance{
			Id:     b.ID,
			Amount: b.Amount,
		})
	}

	return &pb.GetWalletBalancesResponse{
		WalletBalance: &pb.WalletBalance{
			Balances: pbBalances,
		},
	}, nil
}

// CreateWallet generates a new Solana wallet
func (s *WalletServer) CreateWallet(ctx context.Context, req *pb.CreateWalletRequest) (*pb.CreateWalletResponse, error) {
	// Create a new wallet using the wallet package
	newWallet, err := wallet.CreateSolanaWallet()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create wallet: %v", err)
	}

	return &pb.CreateWalletResponse{
		PublicKey: newWallet.PublicKey,
		SecretKey: newWallet.SecretKey,
	}, nil
}

// GetWalletBalance implements the GetWalletBalance RPC method
func (s *WalletServer) GetWalletBalance(ctx context.Context, req *pb.GetWalletBalanceRequest) (*pb.GetWalletBalanceResponse, error) {
	balance, err := s.walletService.GetWalletBalance(ctx, req.GetWalletId())
	if err != nil {
		return nil, err
	}

	return &pb.GetWalletBalanceResponse{
		Balance: balance,
	}, nil
}
