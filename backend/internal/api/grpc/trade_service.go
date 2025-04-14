package grpc

import (
	"context"

	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service/trade"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// TradeServer implements the TradeService gRPC service
type TradeServer struct {
	pb.UnimplementedTradeServiceServer
	tradeService *trade.Service
}

// NewTradeServer creates a new TradeServer
func NewTradeServer(tradeService *trade.Service) *TradeServer {
	return &TradeServer{
		tradeService: tradeService,
	}
}

// GetTradeQuote returns a quote for a potential trade
func (s *TradeServer) GetTradeQuote(ctx context.Context, req *pb.GetTradeQuoteRequest) (*pb.GetTradeQuoteResponse, error) {
	if req.FromCoinId == "" || req.ToCoinId == "" || req.Amount == "" {
		return nil, status.Error(codes.InvalidArgument, "from_coin_id, to_coin_id, and amount are required")
	}

	quote, err := s.tradeService.GetTradeQuote(ctx, req.FromCoinId, req.ToCoinId, req.Amount, req.SlippageBps)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get trade quote: %v", err)
	}

	return &pb.GetTradeQuoteResponse{
		EstimatedAmount: quote.EstimatedAmount,
		ExchangeRate:    quote.ExchangeRate,
		Fee:             quote.Fee,
		PriceImpact:     quote.PriceImpact,
		RoutePlan:       quote.RoutePlan,
		InputMint:       quote.InputMint,
		OutputMint:      quote.OutputMint,
	}, nil
}

// SubmitTrade submits a trade for execution
func (s *TradeServer) SubmitTrade(ctx context.Context, req *pb.SubmitTradeRequest) (*pb.SubmitTradeResponse, error) {
	if req.FromCoinId == "" || req.ToCoinId == "" || req.SignedTransaction == "" {
		return nil, status.Error(codes.InvalidArgument, "from_coin_id, to_coin_id, and signed_transaction are required")
	}

	tradeReq := model.TradeRequest{
		FromCoinID:        req.FromCoinId,
		ToCoinID:          req.ToCoinId,
		Amount:            req.Amount,
		SignedTransaction: req.SignedTransaction,
	}

	trade, err := s.tradeService.ExecuteTrade(ctx, tradeReq)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute trade: %v", err)
	}

	return &pb.SubmitTradeResponse{
		TradeId:         trade.ID,
		TransactionHash: trade.TransactionHash,
	}, nil
}

// GetTradeStatus returns the status of a trade
func (s *TradeServer) GetTradeStatus(ctx context.Context, req *pb.GetTradeStatusRequest) (*pb.GetTradeStatusResponse, error) {
	if req.TransactionHash == "" {
		return nil, status.Error(codes.InvalidArgument, "transaction_hash is required")
	}

	status, err := s.tradeService.GetTradeStatus(ctx, req.TransactionHash)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get trade status: %v", err)
	}

	return &pb.GetTradeStatusResponse{
		TransactionHash: status.TransactionHash,
		Status:          status.Status,
		Confirmations:   int32(status.Confirmations),
		Finalized:       status.Finalized,
		Error:           status.Error,
	}, nil
}

// GetTradeByID returns details of a specific trade
func (s *TradeServer) GetTradeByID(ctx context.Context, req *pb.GetTradeByIDRequest) (*pb.Trade, error) {
	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	trade, err := s.tradeService.GetTradeByID(ctx, req.Id)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get trade: %v", err)
	}

	return convertModelTradeToPb(trade), nil
}

// ListTrades returns all trades
func (s *TradeServer) ListTrades(ctx context.Context, req *pb.ListTradesRequest) (*pb.ListTradesResponse, error) {
	trades, err := s.tradeService.ListTrades(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list trades: %v", err)
	}

	pbTrades := make([]*pb.Trade, len(trades))
	for i, trade := range trades {
		pbTrades[i] = convertModelTradeToPb(trade)
	}

	return &pb.ListTradesResponse{
		Trades: pbTrades,
	}, nil
}

// Helper function to convert model.Trade to pb.Trade
func convertModelTradeToPb(trade *model.Trade) *pb.Trade {
	pbTrade := &pb.Trade{
		Id:              trade.ID,
		UserId:          trade.UserID,
		FromCoinId:      trade.FromCoinID,
		ToCoinId:        trade.ToCoinID,
		CoinSymbol:      trade.CoinSymbol,
		Type:            trade.Type,
		Amount:          trade.Amount,
		Price:           trade.Price,
		Fee:             trade.Fee,
		Status:          trade.Status,
		TransactionHash: trade.TransactionHash,
		CreatedAt:       timestamppb.New(trade.CreatedAt),
	}

	if !trade.CompletedAt.IsZero() {
		pbTrade.CompletedAt = timestamppb.New(trade.CompletedAt)
	}

	return pbTrade
}
