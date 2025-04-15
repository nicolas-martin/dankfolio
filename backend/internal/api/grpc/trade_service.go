package grpc

import (
	"context"
	"fmt"
	"log"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
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

// GetTradeQuote fetches a trade quote
func (s *TradeServer) GetTradeQuote(
	ctx context.Context,
	req *connect.Request[pb.GetTradeQuoteRequest],
) (*connect.Response[pb.GetTradeQuoteResponse], error) {
	// Log the incoming request
	log.Printf("Received GetTradeQuote request: from_coin_id=%s, to_coin_id=%s, amount=%s", req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount)

	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		log.Printf("Invalid request: missing required fields")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	// Check for debug header
	requestCtx := ctx
	if req.Header().Get("x-debug-mode") == "true" {
		log.Printf("Debug mode enabled")
		requestCtx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	// Use slippage directly since it's no longer a pointer
	slippageBps := req.Msg.SlippageBps
	// If empty, set a default value
	if slippageBps == "" {
		slippageBps = "50" // Default value of 0.5%
	}

	// Call the trade service to get the quote
	quote, err := s.tradeService.GetTradeQuote(requestCtx, req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount, slippageBps)
	if err != nil {
		log.Printf("Error fetching trade quote: %v", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade quote: %w", err))
	}

	// Log the response before returning
	log.Printf("Trade quote response: estimated_amount=%s, exchange_rate=%s, fee=%s, price_impact=%s", quote.EstimatedAmount, quote.ExchangeRate, quote.Fee, quote.PriceImpact)

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

	// Check for debug header
	requestCtx := ctx
	if req.Header().Get("x-debug-mode") == "true" {
		requestCtx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	trade, err := s.tradeService.ExecuteTrade(requestCtx, tradeReq)
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

	status, err := s.tradeService.SolanaService.GetTransactionConfirmationStatus(ctx, req.Msg.TransactionHash)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade status: %w", err))
	}

	response := &pb.GetTradeStatusResponse{
		TransactionHash: req.Msg.TransactionHash,
	}

	// Check if status is nil or has no values (transaction not found yet)
	if status == nil || len(status.Value) == 0 || status.Value[0] == nil {
		response.Status = "Pending"
		response.Confirmations = 0
		response.Finalized = false
	} else {
		// Transaction found, populate status details
		response.Status = string(status.Value[0].ConfirmationStatus)
		if status.Value[0].Confirmations != nil {
			response.Confirmations = int32(*status.Value[0].Confirmations)
		}
		response.Finalized = status.Value[0].ConfirmationStatus == "finalized"

		// Convert error to string if present
		if status.Value[0].Err != nil {
			errStr := fmt.Sprintf("%v", status.Value[0].Err)
			if errStr != "<nil>" {
				response.Error = &errStr
			}
		}
	}

	res := connect.NewResponse(response)
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

// GetTokenPrices returns prices for multiple tokens
func (s *TradeServer) GetTokenPrices(
	ctx context.Context,
	req *connect.Request[pb.GetTokenPricesRequest],
) (*connect.Response[pb.GetTokenPricesResponse], error) {
	tokenIDs := req.Msg.TokenIds
	if len(tokenIDs) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no token IDs provided"))
	}

	prices, err := s.tradeService.GetTokenPrices(ctx, tokenIDs)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get token prices: %w", err))
	}

	// Convert map to proto response
	priceMap := make(map[string]float64)
	for id, price := range prices {
		priceMap[id] = price
	}

	res := connect.NewResponse(&pb.GetTokenPricesResponse{
		Prices: priceMap,
	})
	return res, nil
}

// PrepareTransfer prepares an unsigned transfer transaction
func (s *TradeServer) PrepareTransfer(
	ctx context.Context,
	req *connect.Request[pb.PrepareTransferRequest],
) (*connect.Response[pb.PrepareTransferResponse], error) {
	if req.Msg.FromAddress == "" || req.Msg.ToAddress == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from and to addresses are required"))
	}
	if req.Msg.Amount <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("amount must be greater than 0"))
	}

	unsignedTx, err := s.tradeService.SolanaService.CreateTransferTransaction(ctx, req.Msg.FromAddress, req.Msg.ToAddress, req.Msg.TokenMint, req.Msg.Amount)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to prepare transfer: %w", err))
	}

	res := connect.NewResponse(&pb.PrepareTransferResponse{
		UnsignedTransaction: unsignedTx,
	})
	return res, nil
}

// SubmitTransfer submits a signed transfer transaction
func (s *TradeServer) SubmitTransfer(
	ctx context.Context,
	req *connect.Request[pb.SubmitTransferRequest],
) (*connect.Response[pb.SubmitTransferResponse], error) {
	if req.Msg.SignedTransaction == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("signed transaction is required"))
	}

	sig, err := s.tradeService.SolanaService.ExecuteSignedTransaction(ctx, req.Msg.SignedTransaction)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to submit transfer: %w", err))
	}

	res := connect.NewResponse(&pb.SubmitTransferResponse{
		TransactionHash: sig.String(),
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
