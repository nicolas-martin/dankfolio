package grpc

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/dankfoliov1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// TradeServer implements the TradeService API
type TradeServer struct {
	dankfoliov1connect.UnimplementedTradeServiceHandler
	tradeService *trade.Service
}

// NewTradeServer creates a new TradeServer
func NewTradeServer(tradeService *trade.Service) *TradeServer {
	return &TradeServer{
		tradeService: tradeService,
	}
}

// GetTradeQuote returns a quote for a potential trade
func (s *TradeServer) GetTradeQuote(
	ctx context.Context,
	req *connect.Request[pb.GetTradeQuoteRequest],
) (*connect.Response[pb.GetTradeQuoteResponse], error) {
	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	quote, err := s.tradeService.GetTradeQuote(ctx, req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount, *req.Msg.SlippageBps)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade quote: %w", err))
	}

	res := connect.NewResponse(&pb.GetTradeQuoteResponse{
		EstimatedAmount: quote.EstimatedAmount,
		ExchangeRate:    quote.ExchangeRate,
		Fee:             quote.Fee,
		PriceImpact:     quote.PriceImpact,
		RoutePlan:       quote.RoutePlan,
		InputMint:       quote.InputMint,
		OutputMint:      quote.OutputMint,
	})
	return res, nil
}

// SubmitTrade submits a trade for execution
func (s *TradeServer) SubmitTrade(
	ctx context.Context,
	req *connect.Request[pb.SubmitTradeRequest],
) (*connect.Response[pb.SubmitTradeResponse], error) {
	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.SignedTransaction == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and signed_transaction are required"))
	}

	tradeReq := model.TradeRequest{
		FromCoinID:        req.Msg.FromCoinId,
		ToCoinID:          req.Msg.ToCoinId,
		Amount:            req.Msg.Amount,
		SignedTransaction: req.Msg.SignedTransaction,
	}

	trade, err := s.tradeService.ExecuteTrade(ctx, tradeReq)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to execute trade: %w", err))
	}

	res := connect.NewResponse(&pb.SubmitTradeResponse{
		TradeId:         trade.ID,
		TransactionHash: trade.TransactionHash,
	})
	return res, nil
}

// GetTradeStatus returns the status of a trade
func (s *TradeServer) GetTradeStatus(
	ctx context.Context,
	req *connect.Request[pb.GetTradeStatusRequest],
) (*connect.Response[pb.GetTradeStatusResponse], error) {
	if req.Msg.TransactionHash == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("transaction_hash is required"))
	}

	status, err := s.tradeService.GetTradeStatus(ctx, req.Msg.TransactionHash)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade status: %w", err))
	}

	res := connect.NewResponse(&pb.GetTradeStatusResponse{
		TransactionHash: status.TransactionHash,
		Status:          status.Status,
		Confirmations:   int32(status.Confirmations),
		Finalized:       status.Finalized,
		Error:           status.Error,
	})
	return res, nil
}

// GetTradeByID returns details of a specific trade
func (s *TradeServer) GetTradeByID(
	ctx context.Context,
	req *connect.Request[pb.GetTradeByIDRequest],
) (*connect.Response[pb.Trade], error) {
	if req.Msg.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("id is required"))
	}

	trade, err := s.tradeService.GetTradeByID(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade: %w", err))
	}

	res := connect.NewResponse(convertModelTradeToPb(trade))
	return res, nil
}

// ListTrades returns all trades
func (s *TradeServer) ListTrades(
	ctx context.Context,
	req *connect.Request[pb.ListTradesRequest],
) (*connect.Response[pb.ListTradesResponse], error) {
	trades, err := s.tradeService.ListTrades(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list trades: %w", err))
	}

	pbTrades := make([]*pb.Trade, len(trades))
	for i, trade := range trades {
		pbTrades[i] = convertModelTradeToPb(trade)
	}

	res := connect.NewResponse(&pb.ListTradesResponse{
		Trades: pbTrades,
	})
	return res, nil
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
