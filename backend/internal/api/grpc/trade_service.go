package grpc

import (
	"context"
	"fmt"
	"log/slog"
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
func pbool(b bool) *bool  { return &b }
func pstring(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// GetSwapQuote fetches a trade quote
func (s *tradeServiceHandler) GetSwapQuote(ctx context.Context, req *connect.Request[pb.GetSwapQuoteRequest]) (*connect.Response[pb.GetSwapQuoteResponse], error) {
	slog.Debug("Received GetSwapQuote request",
		"from_coin_id", req.Msg.FromCoinId,
		"to_coin_id", req.Msg.ToCoinId,
		"amount", req.Msg.Amount)

	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		slog.Warn("Invalid GetSwapQuote request", "error", "missing required fields", "from_coin_id", req.Msg.FromCoinId, "to_coin_id", req.Msg.ToCoinId, "amount", req.Msg.Amount)
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	requestCtx := ctx
	if req.Header().Get("x-debug-mode") == "true" {
		slog.Debug("Debug mode enabled for GetSwapQuote")
		requestCtx = context.WithValue(ctx, model.DebugModeKey, true)
	}

	slippageBps := req.Msg.SlippageBps
	if slippageBps == "" {
		slippageBps = "50"
	}

	quote, err := s.tradeService.GetSwapQuote(requestCtx, req.Msg.FromCoinId, req.Msg.ToCoinId, req.Msg.Amount, slippageBps)
	if err != nil {
		slog.Error("Failed to fetch trade quote", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trade quote: %w", err))
	}

	slog.Debug("Trade quote generated successfully",
		"estimated_amount", quote.EstimatedAmount,
		"exchange_rate", quote.ExchangeRate,
		"price_impact", quote.PriceImpact,
		"total_sol_required", quote.TotalSolRequired,
		"trading_fee_sol", quote.TradingFeeSol)

	// Convert SolFeeBreakdown to protobuf if available
	var solFeeBreakdown *pb.SolFeeBreakdown
	if quote.SolFeeBreakdown != nil {
		solFeeBreakdown = &pb.SolFeeBreakdown{
			TradingFee:         quote.SolFeeBreakdown.TradingFee,
			TransactionFee:     quote.SolFeeBreakdown.TransactionFee,
			AccountCreationFee: quote.SolFeeBreakdown.AccountCreationFee,
			PriorityFee:        quote.SolFeeBreakdown.PriorityFee,
			Total:              quote.SolFeeBreakdown.Total,
			AccountsToCreate:   int32(quote.SolFeeBreakdown.AccountsToCreate),
		}
	}

	res := connect.NewResponse(&pb.GetSwapQuoteResponse{
		EstimatedAmount:  quote.EstimatedAmount,
		ExchangeRate:     quote.ExchangeRate,
		PriceImpact:      quote.PriceImpact,
		RoutePlan:        quote.RoutePlan,
		InputMint:        quote.InputMint,
		OutputMint:       quote.OutputMint,
		SolFeeBreakdown:  solFeeBreakdown,
		TotalSolRequired: quote.TotalSolRequired,
		TradingFeeSol:    quote.TradingFeeSol,
	})
	return res, nil
}

// PrepareSwap prepares an unsigned swap transaction
func (s *tradeServiceHandler) PrepareSwap(ctx context.Context, req *connect.Request[pb.PrepareSwapRequest]) (*connect.Response[pb.PrepareSwapResponse], error) {
	if req.Msg.FromCoinId == "" || req.Msg.ToCoinId == "" || req.Msg.Amount == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("from_coin_id, to_coin_id, and amount are required"))
	}

	params := model.PrepareSwapRequestData{
		FromCoinMintAddress: req.Msg.FromCoinId,
		ToCoinMintAddress:   req.Msg.ToCoinId,
		Amount:              req.Msg.Amount,
		SlippageBps:         req.Msg.SlippageBps,
		UserWalletAddress:   req.Msg.UserPublicKey,
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
		TradeId:         fmt.Sprintf("%d", trade.ID),
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
		slog.Debug("Received GetTrade request with ID", "id", identifier.Id)
		if identifier.Id == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("trade ID is required"))
		}
		trade, err = s.tradeService.GetTrade(ctx, identifier.Id)
	case *pb.GetTradeRequest_TransactionHash:
		slog.Debug("Received GetTrade request with TransactionHash", "tx_hash", identifier.TransactionHash)
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

		if status != nil {
			statusChanged := false
			now := time.Now()

			// Always update confirmations first (for all statuses)
			if status.Confirmations != nil && trade.Confirmations != int32(*status.Confirmations) {
				trade.Confirmations = int32(*status.Confirmations)
				statusChanged = true
				slog.Debug("Updated confirmations for trade", "trade_id", trade.ID, "confirmations", trade.Confirmations)
			}

			// Update status if it changed
			if status.Status != trade.Status {
				slog.Debug("Updating trade status based on blockchain", "trade_id", trade.ID, "old_status", trade.Status, "new_status", status.Status)
				trade.Status = status.Status
				statusChanged = true
			}

			// Handle different blockchain statuses for additional fields
			switch status.Status {
			case "Failed":
				// Set error details and completion info for failed transactions
				errMsg := "Transaction failed on-chain."
				if status.Error != "" {
					errMsg = fmt.Sprintf("Transaction failed on-chain: %s", status.Error)
				}
				if trade.Error != errMsg {
					trade.Error = errMsg
					trade.CompletedAt = now
					trade.Finalized = true
					statusChanged = true
					slog.Info("Trade failed on-chain", "trade_id", trade.ID, "error", errMsg)
				}

			case "Finalized":
				// Set completion info for finalized transactions
				if trade.CompletedAt.IsZero() || !trade.Finalized {
					trade.CompletedAt = now
					trade.Finalized = true
					trade.Error = "" // Clear any previous error
					statusChanged = true
					slog.Info("Trade finalized on-chain", "trade_id", trade.ID)
				}

			case "Confirmed":
				// For highly confirmed transactions, set completion info
				if status.Confirmations != nil && *status.Confirmations >= 31 {
					if trade.CompletedAt.IsZero() {
						trade.CompletedAt = now
						trade.Finalized = false // Not technically finalized yet
						trade.Error = ""
						statusChanged = true
						slog.Info("Trade highly confirmed", "trade_id", trade.ID, "confirmations", *status.Confirmations)
					}
				} else {
					confirmations := 0
					if status.Confirmations != nil {
						confirmations = int(*status.Confirmations)
					}
					slog.Debug("Trade confirmed with lower confirmation count", "trade_id", trade.ID, "confirmations", confirmations)
				}

			case "Processed":
				// Transaction processed but not confirmed - log progress
				confirmations := 0
				if status.Confirmations != nil {
					confirmations = int(*status.Confirmations)
				}
				slog.Debug("Trade processed on-chain", "trade_id", trade.ID, "confirmations", confirmations)

			case "Unknown", "Pending":
				// Transaction status unknown or pending - log for monitoring
				confirmations := 0
				if status.Confirmations != nil {
					confirmations = int(*status.Confirmations)
				}
				slog.Debug("Trade status pending/unknown", "trade_id", trade.ID, "status", status.Status, "confirmations", confirmations)

			default:
				// Unexpected status - log for monitoring
				confirmations := 0
				if status.Confirmations != nil {
					confirmations = int(*status.Confirmations)
				}
				slog.Warn("Trade has unexpected blockchain status", "trade_id", trade.ID, "status", status.Status, "confirmations", confirmations)
			}

			// Handle explicit error from status
			if status.Error != "" && trade.Error == "" {
				trade.Error = status.Error
				if trade.Status != model.TradeStatusFailed {
					trade.Status = model.TradeStatusFailed
					trade.CompletedAt = now
					trade.Finalized = true
				}
				statusChanged = true
				slog.Info("Trade error detected", "trade_id", trade.ID, "error", status.Error)
			}

			// Save changes if any updates were made
			if statusChanged {
				if errUpdate := s.tradeService.UpdateTrade(ctx, trade); errUpdate != nil {
					slog.Warn("Failed to update trade status", "tx_hash", identifier.TransactionHash, "error", errUpdate)
				} else {
					slog.Info("Successfully updated trade via gRPC",
						"tx_hash", identifier.TransactionHash,
						"status", trade.Status,
						"confirmations", trade.Confirmations,
						"finalized", trade.Finalized)
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
	if fromCoin := req.Msg.GetFromCoinAddress(); fromCoin != "" {
		opts.Filters = append(opts.Filters, db.FilterOption{Field: "from_coin_mint_address", Operator: db.FilterOpEqual, Value: fromCoin})
	}
	if toCoin := req.Msg.GetToCoinAddress(); toCoin != "" {
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
		Id:              fmt.Sprintf("%d", trade.ID),
		UserId:          trade.UserID,
		FromCoinId:      trade.FromCoinMintAddress,
		ToCoinId:        trade.ToCoinMintAddress,
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

	if trade.Error != "" {
		pbTrade.Error = &trade.Error
	}

	if !trade.CreatedAt.IsZero() {
		pbTrade.CreatedAt = timestamppb.New(trade.CreatedAt)
	}

	if !trade.CompletedAt.IsZero() {
		pbTrade.CompletedAt = timestamppb.New(trade.CompletedAt)
	}

	return pbTrade
}
