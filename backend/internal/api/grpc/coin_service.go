package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/gagliardetto/solana-go"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

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

// GetAvailableCoins returns a list of available coins
func (s *coinServiceHandler) GetAvailableCoins(
	ctx context.Context,
	req *connect.Request[pb.GetAvailableCoinsRequest],
) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	var coins []model.Coin
	var err error
	var totalCount int32

	slog.Debug("GetAvailableCoins request received", "trending_only", req.Msg.TrendingOnly)

	if req.Msg.TrendingOnly {
		// TODO: Consider paginating GetTrendingCoins as well, or confirm it always returns a small, fixed set.
		// For now, GetTrendingCoins does not support pagination/sorting options passed from the request.
		coins, err = s.coinService.GetTrendingCoins(ctx)
	} else {
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
	}

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
func (s *coinServiceHandler) GetCoinByID(
	ctx context.Context,
	req *connect.Request[pb.GetCoinByIDRequest],
) (*connect.Response[pb.Coin], error) {
	coin, err := s.coinService.GetCoinByMintAddress(ctx, req.Msg.MintAddress)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin: %w", err))
	}

	res := connect.NewResponse(convertModelCoinToPbCoin(coin))
	return res, nil
}

// SearchCoinByMint searches for a coin by mint address
func (s *coinServiceHandler) SearchCoinByMint(
	ctx context.Context,
	req *connect.Request[pb.SearchCoinByMintRequest],
) (*connect.Response[pb.SearchCoinByMintResponse], error) {
	coin, err := s.coinService.GetCoinByMintAddress(ctx, req.Msg.MintAddress)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin for mint address %s: %w", req.Msg.MintAddress, err))
	}

	res := connect.NewResponse(&pb.SearchCoinByMintResponse{
		Coin: convertModelCoinToPbCoin(coin),
	})
	return res, nil
}

// GetAllCoins returns a list of all available coins
func (s *coinServiceHandler) GetAllCoins(
	ctx context.Context,
	req *connect.Request[pb.GetAllCoinsRequest],
) (*connect.Response[pb.GetAllCoinsResponse], error) {
	coins, err := s.coinService.GetAllTokens(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get coins: %w", err))
	}

	pbCoins := make([]*pb.Coin, len(coins.Coins))
	for i, coin := range coins.Coins {
		pbCoins[i] = convertModelCoinToPbCoin(coin.ToModelCoin())
	}

	res := connect.NewResponse(&pb.GetAllCoinsResponse{
		Coins: pbCoins,
	})
	return res, nil
}

// Search allows searching coins by various criteria
func (s *coinServiceHandler) Search(ctx context.Context, req *connect.Request[pb.SearchRequest]) (*connect.Response[pb.SearchResponse], error) {
	// validate if the req.Msg.Query is a valid mint address
	solanaAddress, err := solana.PublicKeyFromBase58(req.Msg.Query)
	if err == nil {
		coin, err := s.coinService.GetCoinByMintAddress(ctx, solanaAddress.String())
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin for mint address %s: %w", solanaAddress.String(), err))
		}
		return connect.NewResponse(&pb.SearchResponse{Coins: []*pb.Coin{convertModelCoinToPbCoin(coin)}}), nil
	}

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
	if sortBy := req.Msg.GetSortBy(); sortBy != "" {
		opts.SortBy = &sortBy
	}
	isDesc := req.Msg.GetSortDesc() // GetSortDesc returns bool directly
	opts.SortDesc = &isDesc

	// Call the updated service method
	coins, total, err := s.coinService.SearchCoins(ctx, req.Msg.GetQuery(), req.Msg.GetTags(), req.Msg.GetMinVolume_24H(), opts)
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
		MintAddress:     coin.MintAddress,
		Symbol:          coin.Symbol,
		Name:            coin.Name,
		Decimals:        int32(coin.Decimals),
		Description:     coin.Description,
		IconUrl:         coin.IconUrl,
		ResolvedIconUrl: &coin.ResolvedIconUrl,
		Tags:            coin.Tags,
		Price:           coin.Price,
		DailyVolume:     coin.Volume24h, // Retained as per instruction
		Website:         &coin.Website,
		Twitter:         &coin.Twitter,
		Telegram:        &coin.Telegram,
		// CoingeckoId is not in model.Coin
		CreatedAt:       createdAtPb,
		LastUpdated:     lastUpdatedPb,
		IsTrending:      coin.IsTrending,
		JupiterListedAt: jupiterListedAtPb,
		// New Birdeye fields
		PriceChangePercentage_24H: &coin.Price24hChangePercent,
		Volume_24HUsd:             &coin.Volume24h, // model.Coin.Volume24h maps to this new field
		Liquidity:                 &coin.Liquidity,
		Volume_24HChangePercent:   &coin.Volume24hChangePercent,
		Fdv:                       &coin.FDV,
		MarketCap:                 &coin.MarketCap,
		Rank:                      &r, // Mapped from coin.Rank (int) to *int32
	}
}
