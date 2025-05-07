package grpc

import (
	"context"
	"fmt"
	"log"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
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

// GetSwapQuote fetches a trade quote
func (s *tradeServiceHandler) GetSwapQuote(
	ctx context.Context,
	req *connect.Request[pb.GetSwapQuoteRequest],
) (*connect.Response[pb.GetSwapQuoteResponse], error) {
	// Log the incoming request
	log.Printf("Received GetSwapQuote request: from_coin_id=%s, to_coin_id=%s, amount=%s", req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount)

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
	quote, err := s.tradeService.GetSwapQuote(requestCtx, req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount, slippageBps)
	if err != nil {
		log.Printf("Error fetching trade quote: %v", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade quote: %w", err))
	}

	// Log the response before returning
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

// SubmitSwap submits a trade for execution
func (s *tradeServiceHandler) SubmitSwap(
	ctx context.Context,
	req *connect.Request[pb.SubmitSwapRequest],
) (*connect.Response[pb.SubmitSwapResponse], error) {
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

	res := connect.NewResponse(&pb.SubmitSwapResponse{
		TradeId:         trade.ID,
		TransactionHash: trade.TransactionHash,
	})
	return res, nil
}

// GetTrade returns details and status of a specific trade
func (s *tradeServiceHandler) GetTrade(
	ctx context.Context,
	req *connect.Request[pb.GetTradeRequest],
) (*connect.Response[pb.Trade], error) {
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
		// Get transaction status
		status, err := s.tradeService.GetTransactionStatus(ctx, identifier.TransactionHash)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade status: %w", err))
		}
		log.Printf("💥💥💥💥Trade status: %s", status.Value[0].ConfirmationStatus)

		// Get the trade by transaction hash
		trade, err = s.tradeService.GetTradeByTransactionHash(ctx, identifier.TransactionHash)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade: %w", err))
		}

		// Update trade with status information
		if status != nil && len(status.Value) > 0 && status.Value[0] != nil {
			statusChanged := false
			txStatus := status.Value[0]

			// Update confirmation status
			if trade.Status != string(txStatus.ConfirmationStatus) {
				trade.Status = string(txStatus.ConfirmationStatus)
				statusChanged = true
			}

			// Update confirmations
			if txStatus.Confirmations != nil && trade.Confirmations != int32(*txStatus.Confirmations) {
				trade.Confirmations = int32(*txStatus.Confirmations)
				statusChanged = true
			}

			// Update finalized status
			if trade.Finalized != (txStatus.ConfirmationStatus == "finalized") {
				trade.Finalized = txStatus.ConfirmationStatus == "finalized"
				if trade.Finalized {
					now := time.Now()
					trade.CompletedAt = &now
				}
				statusChanged = true
			}

			// Update error if present
			if txStatus.Err != nil {
				errStr := fmt.Sprintf("%v", txStatus.Err)
				if errStr != "<nil>" {
					trade.Error = &errStr
					trade.Status = "failed"
					statusChanged = true
				}
			}

			// Save updates if anything changed
			if statusChanged {
				if err := s.tradeService.UpdateTrade(ctx, trade); err != nil {
					log.Printf("Warning: Failed to update trade status: %v", err)
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

	res := connect.NewResponse(convertModelTradeToPb(trade))
	return res, nil
}

// ListTrades returns all trades
func (s *tradeServiceHandler) ListTrades(
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
		Confirmations:   trade.Confirmations,
		Finalized:       trade.Finalized,
	}

	// Handle error string - create a new pointer if there's an error
	if trade.Error != nil {
		errStr := *trade.Error
		pbTrade.Error = &errStr
	}

	if !trade.CreatedAt.IsZero() {
		pbTrade.CreatedAt = timestamppb.New(trade.CreatedAt)
	}

	if trade.CompletedAt != nil {
		pbTrade.CompletedAt = timestamppb.New(*trade.CompletedAt)
	}

	return pbTrade
}
