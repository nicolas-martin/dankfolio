package grpc

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// PriceServer implements the PriceService API
type PriceServer struct {
	dankfoliov1connect.UnimplementedPriceServiceHandler
	priceService *price.Service
}

// NewPriceServer creates a new PriceServer
func NewPriceServer(priceService *price.Service) *PriceServer {
	return &PriceServer{
		priceService: priceService,
	}
}

// GetPriceHistory returns price history data for a given token
func (s *PriceServer) GetPriceHistory(
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
	if historyType == "" {
		historyType = "15m"
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
		historyType,
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
			UnixTime: timestamppb.New(parseUnixTime(item.UnixTime)),
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

func parseUnixTime(unixTimeStr string) time.Time {
	parsedTime, err := time.Parse("2006-01-02T15:04:05Z", unixTimeStr)
	if err != nil {
		// Handle parsing error, e.g., return zero time or log the error
		return time.Time{}
	}
	return parsedTime
}
