package grpc

import (
	"context"
	"fmt"
	"maps"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
)

// priceServiceHandler implements the PriceService API
type priceServiceHandler struct {
	dankfoliov1connect.UnimplementedPriceServiceHandler
	priceService *price.Service
}

// newPriceServiceHandler creates a new priceServiceHandler
func newPriceServiceHandler(priceService *price.Service) *priceServiceHandler {
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
		historyType = pb.GetPriceHistoryRequest_FIFTEEN_MINUTE
	}

	var historyTypeString string

	switch historyType {
	case pb.GetPriceHistoryRequest_ONE_MINUTE:
		historyTypeString = "1m"
	case pb.GetPriceHistoryRequest_THREE_MINUTE:
		historyTypeString = "3m"
	case pb.GetPriceHistoryRequest_FIVE_MINUTE:
		historyTypeString = "5m"
	case pb.GetPriceHistoryRequest_FIFTEEN_MINUTE:
		historyTypeString = "15m"
	case pb.GetPriceHistoryRequest_THIRTY_MINUTE:
		historyTypeString = "30m"
	case pb.GetPriceHistoryRequest_ONE_HOUR:
		historyTypeString = "1H"
	case pb.GetPriceHistoryRequest_TWO_HOUR:
		historyTypeString = "2H"
	case pb.GetPriceHistoryRequest_FOUR_HOUR:
		historyTypeString = "4H"
	case pb.GetPriceHistoryRequest_SIX_HOUR:
		historyTypeString = "6H"
	case pb.GetPriceHistoryRequest_EIGHT_HOUR:
		historyTypeString = "8H"
	case pb.GetPriceHistoryRequest_TWELVE_HOUR:
		historyTypeString = "12H"
	case pb.GetPriceHistoryRequest_ONE_DAY:
		historyTypeString = "1D"
	case pb.GetPriceHistoryRequest_THREE_DAY:
		historyTypeString = "3D"
	case pb.GetPriceHistoryRequest_ONE_WEEK:
		historyTypeString = "1W"
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid history type"))
	}

	if req.Msg.TimeFrom == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time_from is required"))
	}

	if req.Msg.TimeTo == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time_to is required"))
	}

	// Get price history from service
	priceHistory, err := s.priceService.GetPriceHistory(
		ctx,
		req.Msg.Address,
		historyTypeString,
		req.Msg.TimeFrom.AsTime().Format("2006-01-02T15:04:05Z"),
		req.Msg.TimeTo.AsTime().Format("2006-01-02T15:04:05Z"),
		addressType,
	)
	if err != nil {
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

	prices, err := s.priceService.GetCoinPrices(ctx, coinIDs)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get coin prices: %w", err))
	}

	// Convert map to proto response
	priceMap := make(map[string]float64)
	maps.Copy(priceMap, prices)

	res := connect.NewResponse(&pb.GetCoinPricesResponse{
		Prices: priceMap,
	})
	return res, nil
}
