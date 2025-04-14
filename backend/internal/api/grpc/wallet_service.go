package grpc

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/dankfoliov1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
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
func (s *WalletServer) GetWalletBalance(
	ctx context.Context,
	req *connect.Request[dankfoliov1.GetWalletBalanceRequest],
) (*connect.Response[dankfoliov1.GetWalletBalanceResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet address is required"))
	}

	balance, err := s.walletService.GetBalance(ctx, req.Msg.Address)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get wallet balance: %w", err))
	}

	return connect.NewResponse(&dankfoliov1.GetWalletBalanceResponse{
		Balance: convertModelBalanceToPb(balance),
		Success: true,
	}), nil
}

// GetWalletHistory returns the transaction history for a wallet
func (s *WalletServer) GetWalletHistory(
	ctx context.Context,
	req *connect.Request[dankfoliov1.GetWalletHistoryRequest],
) (*connect.Response[dankfoliov1.GetWalletHistoryResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet address is required"))
	}

	transactions, err := s.walletService.GetHistory(ctx, req.Msg.Address)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get wallet history: %w", err))
	}

	pbTransactions := make([]*dankfoliov1.Transaction, len(transactions))
	for i, tx := range transactions {
		pbTransactions[i] = convertModelTransactionToPb(tx)
	}

	return connect.NewResponse(&dankfoliov1.GetWalletHistoryResponse{
		Transactions: pbTransactions,
		Success:      true,
	}), nil
}

// Helper function to convert model.WalletBalance to pb.WalletBalance
func convertModelBalanceToPb(balance *model.WalletBalance) *dankfoliov1.WalletBalance {
	return &dankfoliov1.WalletBalance{
		TotalUsdValue: balance.TotalUSDValue,
		Tokens:        convertModelTokenBalancesToPb(balance.Tokens),
	}
}

// Helper function to convert model.TokenBalances to pb.Balances
func convertModelTokenBalancesToPb(tokens []model.Balance) []*dankfoliov1.Balance {
	pbTokens := make([]*dankfoliov1.Balance, len(tokens))
	for i, token := range tokens {
		pbTokens[i] = &dankfoliov1.Balance{
			Symbol:    token.Symbol,
			Amount:    token.Amount,
			UsdValue:  token.USDValue,
			TokenType: token.TokenType,
		}
	}
	return pbTokens
}

// Helper function to convert model.Transaction to pb.Transaction
func convertModelTransactionToPb(tx model.Transaction) *dankfoliov1.Transaction {
	return &dankfoliov1.Transaction{
		Hash:        tx.Hash,
		Type:        tx.Type,
		Amount:      tx.Amount,
		UsdValue:    tx.USDValue,
		TokenSymbol: tx.TokenSymbol,
		TokenType:   tx.TokenType,
		Timestamp:   tx.Timestamp.Unix(),
	}
}
