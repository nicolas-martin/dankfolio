package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"maps"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

// priceServiceHandler implements the PriceService API
type priceServiceHandler struct {
	dankfoliov1connect.UnimplementedPriceServiceHandler
	priceService price.PriceServiceAPI // Changed to interface
}

// newPriceServiceHandler creates a new priceServiceHandler
func newPriceServiceHandler(priceService price.PriceServiceAPI) *priceServiceHandler { // Changed to interface
	return &priceServiceHandler{
		priceService: priceService,
	}
}

// GetPriceHistory returns price history data for a given token
func (s *priceServiceHandler) GetPriceHistory(
	ctx context.Context,
	req *connect.Request[pb.GetPriceHistoryRequest],
) (*connect.Response[pb.GetPriceHistoryResponse], error) {
	if req.Msg.Address == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("address is required"))
	}

	// Set default values if not provided
	addressType := req.Msg.AddressType
	if addressType == "" {
		addressType = "token"
	}

	historyType := req.Msg.Type
	if historyType == pb.GetPriceHistoryRequest_PRICE_HISTORY_TYPE_UNSPECIFIED {
		historyType = pb.GetPriceHistoryRequest_FOUR_HOUR // Defaulting in handler
	}

	// The switch block converting enum to string (historyTypeString) is removed.
	// We will pass the historyType enum directly to the service.

	if req.Msg.TimeFrom == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time_from is required"))
	}

	if req.Msg.TimeTo == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time_to is required"))
	}

	slog.Debug("Fetching price history",
		"address", req.Msg.Address,
		"typeEnum", historyType.String(), // Log the string representation of the enum
		"from", req.Msg.TimeFrom.AsTime(),
		"to", req.Msg.TimeTo.AsTime(),
		"address_type", addressType)

	// Get price history from service
	// Pass the historyType enum (req.Msg.Type or its default) directly to the service method.
	priceHistory, err := s.priceService.GetPriceHistory(
		ctx,
		req.Msg.Address,
		historyType, // Pass the enum value
		req.Msg.TimeFrom.AsTime().Format("2006-01-02T15:04:05Z"),
		req.Msg.TimeTo.AsTime().Format("2006-01-02T15:04:05Z"),
		addressType,
	)
	if err != nil {
		slog.Error("Failed to get price history",
			"address", req.Msg.Address,
			"error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get price history: %w", err))
	}

	// Convert to protobuf response
	pbItems := make([]*pb.PriceHistoryItem, len(priceHistory.Data.Items))
	for i, item := range priceHistory.Data.Items {
		pbItems[i] = &pb.PriceHistoryItem{
			UnixTime: item.UnixTime,
			Value:    item.Value,
		}
	}

	slog.Debug("Price history fetched successfully",
		"address", req.Msg.Address,
		"items_count", len(pbItems))

	res := connect.NewResponse(&pb.GetPriceHistoryResponse{
		Data: &pb.PriceHistoryData{
			Items: pbItems,
		},
		Success: priceHistory.Success,
	})
	return res, nil
}

// GetCoinPrices returns current prices for multiple coins
func (s *priceServiceHandler) GetCoinPrices(
	ctx context.Context,
	req *connect.Request[pb.GetCoinPricesRequest],
) (*connect.Response[pb.GetCoinPricesResponse], error) {
	coinIDs := req.Msg.CoinIds
	if len(coinIDs) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no coin IDs provided"))
	}

	slog.Debug("Getting prices for multiple coins", "count", len(coinIDs))
	prices, err := s.priceService.GetCoinPrices(ctx, coinIDs)
	if err != nil {
		slog.Error("Failed to get coin prices", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get coin prices: %w", err))
	}

	slog.Debug("Retrieved prices for coins", "count", len(prices))

	// Convert map to proto response
	priceMap := make(map[string]float64)
	maps.Copy(priceMap, prices)

	res := connect.NewResponse(&pb.GetCoinPricesResponse{
		Prices: priceMap,
	})
	return res, nil
}
