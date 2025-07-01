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

	config, ok := price.TimeframeConfigMap[historyType]
	if !ok {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("unsupported history type: %s", historyType.String()))
	}

	if req.Msg.Time == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time is required"))
	}

	slog.Debug("Fetching price history",
		"address", req.Msg.Address,
		"config", config,
		"time", req.Msg.Time,
		"address_type", addressType)

	// Get price history from service
	// Pass the historyType enum (req.Msg.Type or its default) directly to the service method.
	priceHistory, err := s.priceService.GetPriceHistory(
		ctx,
		req.Msg.Address,
		config,
		req.Msg.Time, // Now it's already a string
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
			UnixTime: fmt.Sprintf("%d", item.UnixTime), // Convert int64 to string
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

// GetPriceHistoriesByIDs returns price histories for multiple addresses in a single request
func (s *priceServiceHandler) GetPriceHistoriesByIDs(
	ctx context.Context,
	req *connect.Request[pb.GetPriceHistoriesByIDsRequest],
) (*connect.Response[pb.GetPriceHistoriesByIDsResponse], error) {
	items := req.Msg.Items
	if len(items) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no price history requests provided"))
	}

	// Validate batch size limit
	const maxBatchSize = 20 // Conservative limit for price history API calls
	if len(items) > maxBatchSize {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("batch size %d exceeds maximum allowed %d", len(items), maxBatchSize))
	}

	slog.DebugContext(ctx, "gRPC GetPriceHistoriesByIDs request received", "requests_count", len(items))

	// Convert protobuf requests to service requests
	var serviceRequests []price.PriceHistoryBatchRequest
	for _, item := range items {
		if item.Address == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("address is required for all items"))
		}

		// Set default values if not provided
		addressType := item.AddressType
		if addressType == "" {
			addressType = "token"
		}

		historyType := item.Type
		if historyType == pb.GetPriceHistoryRequest_PRICE_HISTORY_TYPE_UNSPECIFIED {
			historyType = pb.GetPriceHistoryRequest_FOUR_HOUR // Default
		}

		config, ok := price.TimeframeConfigMap[historyType]
		if !ok {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("unsupported history type: %s", historyType.String()))
		}

		if item.Time == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("time is required for all items"))
		}

		serviceRequests = append(serviceRequests, price.PriceHistoryBatchRequest{
			Address:     item.Address,
			Config:      config,
			Time:        item.Time,
			AddressType: addressType,
		})
	}

	slog.DebugContext(ctx, "Fetching price histories using batch service",
		"requests_count", len(serviceRequests))

	// Call the batch service method
	results, err := s.priceService.GetPriceHistoriesByAddresses(ctx, serviceRequests)
	if err != nil {
		slog.ErrorContext(ctx, "GetPriceHistoriesByIDs service call failed", "error", err, "requests_count", len(serviceRequests))
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get price histories: %w", err))
	}

	// Convert service results to protobuf response
	pbResults := make(map[string]*pb.PriceHistoryResult)
	var failedAddresses []string

	for address, result := range results {
		if !result.Success || result.Data == nil {
			failedAddresses = append(failedAddresses, address)
			pbResults[address] = &pb.PriceHistoryResult{
				Data:         nil,
				Success:      false,
				ErrorMessage: result.ErrorMessage,
			}
		} else {
			// Convert to protobuf price history data
			pbItems := make([]*pb.PriceHistoryItem, len(result.Data.Data.Items))
			for i, item := range result.Data.Data.Items {
				pbItems[i] = &pb.PriceHistoryItem{
					UnixTime: fmt.Sprintf("%d", item.UnixTime),
					Value:    item.Value,
				}
			}

			pbResults[address] = &pb.PriceHistoryResult{
				Data: &pb.PriceHistoryData{
					Items: pbItems,
				},
				Success:      true,
				ErrorMessage: "",
			}
		}
	}

	slog.InfoContext(ctx, "Successfully processed batch price history request",
		"requested_count", len(serviceRequests),
		"successful_count", len(results)-len(failedAddresses),
		"failed_count", len(failedAddresses))

	res := connect.NewResponse(&pb.GetPriceHistoriesByIDsResponse{
		Results:         pbResults,
		FailedAddresses: failedAddresses,
	})
	return res, nil
}
