package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/gagliardetto/solana-go"
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
)

// #region test
// coinServiceHandler implements the CoinService API
type coinServiceHandler struct {
	dankfoliov1connect.UnimplementedCoinServiceHandler
	coinService *coin.Service
}

// newCoinServiceHandler creates a new coinServiceHandler
func newCoinServiceHandler(coinService *coin.Service) *coinServiceHandler {
	return &coinServiceHandler{
		coinService: coinService,
	}
}

// #endregion

// GetAvailableCoins returns a list of available coins
func (s *coinServiceHandler) GetAvailableCoins(ctx context.Context, req *connect.Request[pb.GetAvailableCoinsRequest]) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	var coins []model.Coin
	var err error
	var totalCount int32

	slog.Debug("GetAvailableCoins request received", "limit", req.Msg.GetLimit(), "offset", req.Msg.GetOffset())

	// Use default ListOptions since GetAvailableCoinsRequest doesn't have pagination/sorting fields
	listOptions := db.ListOptions{}
	// Apply default pagination and sorting
	defaultLimit := 50 // Default limit
	limit := req.Msg.GetLimit()
	if limit > 0 {
		listOptions.Limit = pint(int(limit))
	} else {
		listOptions.Limit = &defaultLimit
	}

	defaultOffset := 0 // Default offset
	offset := req.Msg.GetOffset()
	if offset >= 0 {
		listOptions.Offset = pint(int(offset))
	} else {
		listOptions.Offset = &defaultOffset
	}

	// If no sort is specified, coinService.GetCoins will apply a default.
	coins, totalCount, err = s.coinService.GetCoins(ctx, listOptions)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list coins: %w", err))
	}

	pbCoins := make([]*pb.Coin, len(coins))
	for i, coinModel := range coins { // Iterate over model.Coin directly
		pbCoins[i] = convertModelCoinToPbCoin(&coinModel) // Pass address of coinModel
	}

	res := connect.NewResponse(&pb.GetAvailableCoinsResponse{
		Coins:      pbCoins,
		TotalCount: totalCount,
	})
	return res, nil
}

// GetCoinByID returns a specific coin by ID
func (s *coinServiceHandler) GetCoinByID(ctx context.Context, req *connect.Request[pb.GetCoinByIDRequest]) (*connect.Response[pb.Coin], error) {
	coin, err := s.coinService.GetCoinByAddress(ctx, req.Msg.Address)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin: %w", err))
	}

	res := connect.NewResponse(convertModelCoinToPbCoin(coin))
	return res, nil
}

// GetCoinsByIDs returns multiple coins by their addresses in a single request
func (s *coinServiceHandler) GetCoinsByIDs(ctx context.Context, req *connect.Request[pb.GetCoinsByIDsRequest]) (*connect.Response[pb.GetCoinsByIDsResponse], error) {
	slog.DebugContext(ctx, "gRPC GetCoinsByIDs request received", "addresses_count", len(req.Msg.Addresses))
	
	if len(req.Msg.Addresses) == 0 {
		return connect.NewResponse(&pb.GetCoinsByIDsResponse{
			Coins: []*pb.Coin{},
		}), nil
	}

	// Validate batch size limit
	const maxBatchSize = 50
	if len(req.Msg.Addresses) > maxBatchSize {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("batch size %d exceeds maximum allowed %d", len(req.Msg.Addresses), maxBatchSize))
	}

	// Call the batch service method
	coins, err := s.coinService.GetCoinsByAddresses(ctx, req.Msg.Addresses)
	if err != nil {
		slog.ErrorContext(ctx, "GetCoinsByIDs service call failed", "error", err, "addresses_count", len(req.Msg.Addresses))
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get coins by addresses: %w", err))
	}

	// Convert model coins to protobuf coins
	pbCoins := make([]*pb.Coin, len(coins))
	for i, coinModel := range coins {
		pbCoins[i] = convertModelCoinToPbCoin(&coinModel)
	}

	slog.InfoContext(ctx, "Successfully processed batch coin request", 
		"requested_count", len(req.Msg.Addresses), 
		"returned_count", len(pbCoins))

	res := connect.NewResponse(&pb.GetCoinsByIDsResponse{
		Coins: pbCoins,
	})
	return res, nil
}

// SearchCoinByAddress searches for a coin by address
func (s *coinServiceHandler) SearchCoinByAddress(
	ctx context.Context,
	req *connect.Request[pb.SearchCoinByAddressRequest],
) (*connect.Response[pb.SearchCoinByAddressResponse], error) {
	coin, err := s.coinService.GetCoinByAddress(ctx, req.Msg.Address)
	if err != nil {
		// Return user-friendly error message instead of technical details
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("%v", err))
	}

	res := connect.NewResponse(&pb.SearchCoinByAddressResponse{
		Coin: convertModelCoinToPbCoin(coin),
	})
	return res, nil
}

// GetAllCoins returns a list of all available coins
func (s *coinServiceHandler) GetAllCoins(
	ctx context.Context,
	req *connect.Request[pb.GetAllCoinsRequest],
) (*connect.Response[pb.GetAllCoinsResponse], error) {
	// This endpoint is deprecated - use GetCoins with pagination instead
	return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("GetAllCoins is deprecated, use GetCoins with pagination"))
}

// Search allows searching coins by various criteria
func (s *coinServiceHandler) Search(ctx context.Context, req *connect.Request[pb.SearchRequest]) (*connect.Response[pb.SearchResponse], error) {
	// validate if the req.Msg.Query is a valid mint address
	solanaAddress, err := solana.PublicKeyFromBase58(req.Msg.Query)
	if err == nil {
		coin, err := s.coinService.GetCoinByAddress(ctx, solanaAddress.String())
		if err != nil {
			// Return user-friendly error message instead of technical details
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("%v", err))
		}
		return connect.NewResponse(&pb.SearchResponse{Coins: []*pb.Coin{convertModelCoinToPbCoin(coin)}}), nil
	}

	// Convert protobuf request to internal types
	query := req.Msg.GetQuery()
	tags := []string{} // Always empty for simplified search
	minVolume24h := float64(0) // Always 0 for simplified search

	// Prepare ListOptions from the request
	opts := db.ListOptions{}
	if limit := req.Msg.GetLimit(); limit > 0 {
		val := int(limit)
		opts.Limit = &val
	}
	if offset := req.Msg.GetOffset(); offset >= 0 { // Allow offset 0
		val := int(offset)
		opts.Offset = &val
	}

	// Handle sort_by string - default to "volume_24h" if not specified
	sortByStr := "volume_24h" // Default sort
	if sortBy := req.Msg.GetSortBy(); sortBy != "" {
		// Map frontend sort values to backend values
		switch sortBy {
		case "volume24h":
			sortByStr = "volume_24h"
		case "jupiter_listed_at":
			sortByStr = "jupiter_listed_at"
		default:
			sortByStr = "volume_24h" // Fallback to default
		}
	}
	opts.SortBy = &sortByStr

	// Always sort descending for simplified search
	isDesc := true
	opts.SortDesc = &isDesc

	// Call the internal service method with converted types
	coins, total, err := s.coinService.SearchCoins(ctx, query, tags, minVolume24h, opts)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to search coins: %w", err))
	}

	pbCoins := make([]*pb.Coin, len(coins))
	for i, c := range coins { // Iterate over model.Coin directly
		pbCoins[i] = convertModelCoinToPbCoin(&c) // Pass address of c
	}

	res := connect.NewResponse(&pb.SearchResponse{
		Coins:      pbCoins,
		TotalCount: total, // Use the total count returned by the service
	})
	return res, nil
}

// GetNewCoins handles the GetNewCoins RPC call.
func (s *coinServiceHandler) GetNewCoins(
	ctx context.Context,
	req *connect.Request[pb.GetNewCoinsRequest],
) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	slog.DebugContext(ctx, "gRPC GetNewCoins request received", "limit", req.Msg.GetLimit(), "offset", req.Msg.GetOffset())

	// Parse and validate protobuf request
	var limit, offset int32
	if req.Msg.Limit != nil {
		limit = *req.Msg.Limit
	}
	if req.Msg.Offset != nil {
		offset = *req.Msg.Offset
	}

	// Call service with domain types
	modelCoins, totalCount, err := s.coinService.GetNewCoins(ctx, limit, offset)
	if err != nil {
		slog.ErrorContext(ctx, "GetNewCoins service call failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get new coins: %w", err))
	}

	// Convert domain models to protobuf
	pbCoins := make([]*pb.Coin, len(modelCoins))
	for i, coinModel := range modelCoins {
		pbCoins[i] = convertModelCoinToPbCoin(&coinModel)
	}

	resp := &pb.GetAvailableCoinsResponse{
		Coins:      pbCoins,
		TotalCount: totalCount,
	}

	return connect.NewResponse(resp), nil
}

// GetTrendingCoins handles the GetTrendingCoins RPC call.
func (s *coinServiceHandler) GetTrendingCoins(
	ctx context.Context,
	req *connect.Request[pb.GetTrendingCoinsRequest],
) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	slog.DebugContext(ctx, "gRPC GetTrendingCoins request received", "limit", req.Msg.GetLimit(), "offset", req.Msg.GetOffset())

	// Parse and validate protobuf request
	var limit, offset int32
	if req.Msg.Limit != nil {
		limit = *req.Msg.Limit
	}
	if req.Msg.Offset != nil {
		offset = *req.Msg.Offset
	}

	// Call service with domain types
	modelCoins, totalCount, err := s.coinService.GetTrendingCoinsRPC(ctx, limit, offset)
	if err != nil {
		slog.ErrorContext(ctx, "GetTrendingCoins service call failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get trending coins: %w", err))
	}

	// Convert domain models to protobuf
	pbCoins := make([]*pb.Coin, len(modelCoins))
	for i, coinModel := range modelCoins {
		pbCoins[i] = convertModelCoinToPbCoin(&coinModel)
	}

	resp := &pb.GetAvailableCoinsResponse{
		Coins:      pbCoins,
		TotalCount: totalCount,
	}

	return connect.NewResponse(resp), nil
}

// GetTopGainersCoins handles the GetTopGainersCoins RPC call.
func (s *coinServiceHandler) GetTopGainersCoins(
	ctx context.Context,
	req *connect.Request[pb.GetTopGainersCoinsRequest],
) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	slog.DebugContext(ctx, "gRPC GetTopGainersCoins request received", "limit", req.Msg.GetLimit(), "offset", req.Msg.GetOffset())

	// Parse and validate protobuf request
	var limit, offset int32
	if req.Msg.Limit != nil {
		limit = *req.Msg.Limit
	}
	if req.Msg.Offset != nil {
		offset = *req.Msg.Offset
	}

	// Call service with domain types
	modelCoins, totalCount, err := s.coinService.GetTopGainersCoins(ctx, limit, offset)
	if err != nil {
		slog.ErrorContext(ctx, "GetTopGainersCoins service call failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get top gainer coins: %w", err))
	}

	// Convert domain models to protobuf
	pbCoins := make([]*pb.Coin, len(modelCoins))
	for i, coinModel := range modelCoins {
		pbCoins[i] = convertModelCoinToPbCoin(&coinModel)
	}

	resp := &pb.GetAvailableCoinsResponse{
		Coins:      pbCoins,
		TotalCount: totalCount,
	}

	return connect.NewResponse(resp), nil
}

// pint is a helper function to get a pointer to an int.
func pint(i int) *int {
	return &i
}

func convertModelCoinToPbCoin(coin *model.Coin) *pb.Coin {
	var createdAtPb *timestamppb.Timestamp // Renamed for clarity
	if coin.CreatedAt != "" {              // model.Coin.CreatedAt is string
		if t, err := time.Parse(time.RFC3339, coin.CreatedAt); err == nil {
			createdAtPb = timestamppb.New(t)
		}
		// Consider logging parse error if important
	}

	var lastUpdatedPb *timestamppb.Timestamp // Renamed for clarity
	if coin.LastUpdated != "" {              // model.Coin.LastUpdated is string
		if t, err := time.Parse(time.RFC3339, coin.LastUpdated); err == nil {
			lastUpdatedPb = timestamppb.New(t)
		}
		// Consider logging parse error
	}

	var jupiterListedAtPb *timestamppb.Timestamp // New variable for the new field
	if coin.JupiterListedAt != nil {             // model.Coin.JupiterListedAt is *time.Time
		jupiterListedAtPb = timestamppb.New(*coin.JupiterListedAt) // Dereference before passing to New
	}

	r := int32(coin.Rank) // Simplified as per instruction for numeric optionals

	return &pb.Coin{
		Address:         coin.Address,
		Symbol:          coin.Symbol,
		Name:            coin.Name,
		Decimals:        int32(coin.Decimals),
		Description:     coin.Description,
		LogoUri:         coin.LogoURI,
		ResolvedIconUrl: &coin.ResolvedIconUrl,
		Tags:            coin.Tags,
		Price:           coin.Price,
		Website:         &coin.Website,
		Twitter:         &coin.Twitter,
		Telegram:        &coin.Telegram,
		Discord:         &coin.Discord,
		CreatedAt:       createdAtPb,
		LastUpdated:     lastUpdatedPb,
		JupiterListedAt: jupiterListedAtPb,
		// Birdeye fields
		Price24HChangePercent:  &coin.Price24hChangePercent,
		Volume24HUsd:           &coin.Volume24hUSD,
		Liquidity:              &coin.Liquidity,
		Volume24HChangePercent: &coin.Volume24hChangePercent,
		Fdv:                    &coin.FDV,
		Marketcap:              &coin.Marketcap,
		Rank:                   &r, // Mapped from coin.Rank (int) to *int32
	}
}
