package grpc

import (
	"context"
	"fmt"
	"log"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/db" // Added for db.ListOptions
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// tradeServiceHandler implements the TradeService API
type tradeServiceHandler struct {
	dankfoliov1connect.UnimplementedTradeServiceHandler
	tradeService *trade.Service
}

// newTradeServiceHandler creates a new tradeServiceHandler
func newTradeServiceHandler(tradeService *trade.Service) *tradeServiceHandler {
	return &tradeServiceHandler{
		tradeService: tradeService,
	}
}

// Helper function for creating pointers for ListOptions
func pint32(i int32) *int { v := int(i); return &v }
func pbool(b bool) *bool   { return &b }
func pstring(s string) *string { if s == "" { return nil }; return &s }


// GetSwapQuote fetches a trade quote
func (s *tradeServiceHandler) GetSwapQuote(ctx context.Context, req *connect.Request[pb.GetSwapQuoteRequest]) (*connect.Response[pb.GetSwapQuoteResponse], error) {
	log.Printf("Received GetSwapQuote request: from_coin_id=%s, to_coin_id=%s, amount=%s", req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount)

	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		log.Printf("Invalid request: missing required fields")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	requestCtx := ctx
	if req.Header().Get("x-debug-mode") == "true" {
		log.Printf("Debug mode enabled")
		requestCtx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	slippageBps := req.Msg.SlippageBps
	if slippageBps == "" {
		slippageBps = "50"
	}

	quote, err := s.tradeService.GetSwapQuote(requestCtx, req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount, slippageBps)
	if err != nil {
		log.Printf("Error fetching trade quote: %v", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade quote: %w", err))
	}

	log.Printf("Trade quote response: estimated_amount=%s, exchange_rate=%s, fee=%s, price_impact=%s", quote.EstimatedAmount, quote.ExchangeRate, quote.Fee, quote.PriceImpact)

	res := connect.NewResponse(&pb.GetSwapQuoteResponse{
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

// PrepareSwap prepares an unsigned swap transaction
func (s *tradeServiceHandler) PrepareSwap(ctx context.Context, req *connect.Request[pb.PrepareSwapRequest]) (*connect.Response[pb.PrepareSwapResponse], error) {
	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	params := trade.PrepareSwapRequestData{
		FromCoinMintAddress: req.Msg.FromCoinId,
		ToCoinMintAddress:   req.Msg.ToCoinId,
		InputAmount:         req.Msg.Amount,
		SlippageBps:         req.Msg.SlippageBps,
		FromAddress:         req.Msg.UserPublicKey,
	}

	unsignedTx, err := s.tradeService.PrepareSwap(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to prepare swap: %w", err))
	}

	res := connect.NewResponse(&pb.PrepareSwapResponse{
		UnsignedTransaction: unsignedTx,
	})

	return res, nil
}

// SubmitSwap submits a trade for execution
func (s *tradeServiceHandler) SubmitSwap(ctx context.Context, req *connect.Request[pb.SubmitSwapRequest]) (*connect.Response[pb.SubmitSwapResponse], error) {
	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.SignedTransaction == "" || req.Msg.UnsignedTransaction == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, signed_transaction and unsigned_transaction are required"))
	}

	tradeReq := model.TradeRequest{
		FromCoinMintAddress: req.Msg.FromCoinId, // Model uses FromCoinMintAddress
		ToCoinMintAddress:   req.Msg.ToCoinId,   // Model uses ToCoinMintAddress
		Amount:              req.Msg.Amount,
		SignedTransaction:   req.Msg.SignedTransaction,
		UnsignedTransaction: req.Msg.UnsignedTransaction,
	}

	requestCtx := ctx
	if req.Header().Get("x-debug-mode") == "true" {
		requestCtx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	trade, err := s.tradeService.ExecuteTrade(requestCtx, tradeReq)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to execute trade: %w", err))
	}

	res := connect.NewResponse(&pb.SubmitSwapResponse{
		TradeId:         trade.ID,
		TransactionHash: trade.TransactionHash,
	})
	return res, nil
}

// GetTrade returns details and status of a specific trade
func (s *tradeServiceHandler) GetTrade(ctx context.Context, req *connect.Request[pb.GetTradeRequest]) (*connect.Response[pb.Trade], error) {
	var trade *model.Trade
	var err error

	switch identifier := req.Msg.Identifier.(type) {
	case *pb.GetTradeRequest_Id:
		log.Printf("Received GetTrade request with ID: %s", identifier.Id)
		if identifier.Id == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("trade ID is required"))
		}
		trade, err = s.tradeService.GetTrade(ctx, identifier.Id)
	case *pb.GetTradeRequest_TransactionHash:
		log.Printf("Received GetTrade request with TransactionHash: %s", identifier.TransactionHash)
		if identifier.TransactionHash == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("transaction hash is required"))
		}
		status, errStatus := s.tradeService.GetTransactionStatus(ctx, identifier.TransactionHash)
		if errStatus != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade status: %w", errStatus))
		}

		trade, err = s.tradeService.GetTradeByTransactionHash(ctx, identifier.TransactionHash)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade: %w", err))
		}
		if trade == nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("trade not found for transaction hash: %s", identifier.TransactionHash))
		}

		if status != nil && len(status.Value) > 0 && status.Value[0] != nil {
			statusChanged := false
			txStatus := status.Value[0]

			if trade.Status != string(txStatus.ConfirmationStatus) {
				trade.Status = string(txStatus.ConfirmationStatus)
				statusChanged = true
			}
			if txStatus.Confirmations != nil && trade.Confirmations != int32(*txStatus.Confirmations) {
				trade.Confirmations = int32(*txStatus.Confirmations)
				statusChanged = true
			}
			if trade.Finalized != (txStatus.ConfirmationStatus == "finalized") {
				trade.Finalized = txStatus.ConfirmationStatus == "finalized"
				if trade.Finalized {
					now := time.Now()
					trade.CompletedAt = &now
				}
				statusChanged = true
			}
			if txStatus.Err != nil {
				errStr := fmt.Sprintf("%v", txStatus.Err)
				if errStr != "<nil>" { trade.Error = &errStr; trade.Status = "failed"; statusChanged = true }
			}
			if statusChanged {
				if errUpdate := s.tradeService.UpdateTrade(ctx, trade); errUpdate != nil {
					log.Printf("Warning: Failed to update trade status: %v", errUpdate)
				} else {
					log.Printf("✅ Updated trade status: %s -> %s (Confirmations: %d, Finalized: %v)",
						identifier.TransactionHash, trade.Status, trade.Confirmations, trade.Finalized)
				}
			}
		}
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("either trade ID or transaction hash is required"))
	}

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade: %w", err))
	}

	res := connect.NewResponse(convertModelToProtoTrade(trade))
	return res, nil
}

// ListTrades returns all trades based on provided options
func (s *tradeServiceHandler) ListTrades(ctx context.Context, req *connect.Request[pb.ListTradesRequest]) (*connect.Response[pb.ListTradesResponse], error) {
	opts := db.ListOptions{
		Limit:    pint32(req.Msg.GetLimit()),
		Offset:   pint32(req.Msg.GetOffset()),
		SortBy:   pstring(req.Msg.GetSortBy()),
		SortDesc: pbool(req.Msg.GetSortDesc()),
		Filters:  []db.FilterOption{},
	}

	if userID := req.Msg.GetUserId(); userID != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "user_id", Operator: db.FilterOpEqual, Value: userID})
	}
	if status := req.Msg.GetStatus(); status != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "status", Operator: db.FilterOpEqual, Value: status})
	}
	if tradeType := req.Msg.GetType(); tradeType != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "type", Operator: db.FilterOpEqual, Value: tradeType})
	}
	if fromCoin := req.Msg.GetFromCoinMintAddress(); fromCoin != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "from_coin_mint_address", Operator: db.FilterOpEqual, Value: fromCoin})
	}
	if toCoin := req.Msg.GetToCoinMintAddress(); toCoin != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "to_coin_mint_address", Operator: db.FilterOpEqual, Value: toCoin})
	}

	trades, total, err := s.tradeService.ListTrades(ctx, opts)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list trades: %w", err))
	}

	pbTrades := make([]*pb.Trade, len(trades))
	for i, trade := range trades {
		// Need to pass address of trade for conversion, as convertModelToProtoTrade expects *model.Trade
		currentTrade := trade
		pbTrades[i] = convertModelToProtoTrade(&currentTrade)
	}

	res := connect.NewResponse(&pb.ListTradesResponse{
		Trades:     pbTrades,
		TotalCount: int32(total),
	})
	return res, nil
}

// Helper function to convert model.Trade to pb.Trade
func convertModelToProtoTrade(trade *model.Trade) *pb.Trade {
	if trade == nil {
		return nil
	}
	pbTrade := &pb.Trade{
		Id:              trade.ID,
		UserId:          trade.UserID,
		FromCoinId:      trade.FromCoinMintAddress, // Map FromCoinMintAddress to pb.FromCoinId
		ToCoinId:        trade.ToCoinMintAddress,   // Map ToCoinMintAddress to pb.ToCoinId
		CoinSymbol:      trade.CoinSymbol,
		Type:            trade.Type,
		Amount:          trade.Amount,
		Price:           trade.Price,
		Fee:             trade.Fee,
		Status:          trade.Status,
		TransactionHash: trade.TransactionHash,
		Confirmations:   trade.Confirmations,
		Finalized:       trade.Finalized,
	}

	if trade.Error != nil {
		errStr := *trade.Error
		pbTrade.Error = &errStr
	}

	if !trade.CreatedAt.IsZero() {
		pbTrade.CreatedAt = timestamppb.New(trade.CreatedAt)
	}

	if trade.CompletedAt != nil && !(*trade.CompletedAt).IsZero() {
		pbTrade.CompletedAt = timestamppb.New(*trade.CompletedAt)
	}

	return pbTrade
}
