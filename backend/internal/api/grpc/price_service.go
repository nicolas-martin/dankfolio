package grpc

import (
	"context"

	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/internal/service/price"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// PriceServer implements the PriceService gRPC service
type PriceServer struct {
	pb.UnimplementedPriceServiceServer
	priceService *price.Service
}

// NewPriceServer creates a new PriceServer
func NewPriceServer(priceService *price.Service) *PriceServer {
	return &PriceServer{
		priceService: priceService,
	}
}

// GetPriceHistory returns price history data for a given token
func (s *PriceServer) GetPriceHistory(ctx context.Context, req *pb.GetPriceHistoryRequest) (*pb.GetPriceHistoryResponse, error) {
	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address is required")
	}

	// Set default values if not provided
	addressType := req.AddressType
	if addressType == "" {
		addressType = "token"
	}

	historyType := req.HistoryType
	if historyType == "" {
		historyType = "15m"
	}

	if req.TimeFrom == "" {
		return nil, status.Error(codes.InvalidArgument, "time_from is required")
	}

	if req.TimeTo == "" {
		return nil, status.Error(codes.InvalidArgument, "time_to is required")
	}

	// Get price history from service
	priceHistory, err := s.priceService.GetPriceHistory(ctx, req.Address, historyType, req.TimeFrom, req.TimeTo, addressType)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get price history: %v", err)
	}

	// Convert to protobuf response
	pbItems := make([]*pb.PriceHistoryItem, len(priceHistory.Data.Items))
	for i, item := range priceHistory.Data.Items {
		pbItems[i] = &pb.PriceHistoryItem{
			UnixTime: item.UnixTime,
			Value:    item.Value,
		}
	}

	return &pb.GetPriceHistoryResponse{
		Data: &pb.GetPriceHistoryResponse_Data{
			Items: pbItems,
		},
		Success: priceHistory.Success,
	}, nil
}
