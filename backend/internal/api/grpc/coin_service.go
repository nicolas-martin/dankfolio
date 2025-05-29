package grpc

import (
	"context"
	"fmt"
	"log"
	"time"

	"connectrpc.com/connect"
	"github.com/gagliardetto/solana-go"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
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

	log.Printf("&&&&&&&&&&&&&&&&&&&&&&&&&&&&& GetAvailableCoins: TrendingOnly=%v", req.Msg.TrendingOnly)

	if req.Msg.TrendingOnly {
		coins, err = s.coinService.GetTrendingCoins(ctx)
	} else {
		coins, err = s.coinService.GetCoins(ctx)
	}

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list coins: %w", err))
	}

	pbCoins := make([]*pb.Coin, len(coins))
	for i, coin := range coins {
		pbCoins[i] = convertModelCoinToPbCoin(&coin)
	}

	res := connect.NewResponse(&pb.GetAvailableCoinsResponse{
		Coins: pbCoins,
	})
	return res, nil
}

// GetCoinByID returns a specific coin by ID
func (s *coinServiceHandler) GetCoinByID(
	ctx context.Context,
	req *connect.Request[pb.GetCoinByIDRequest],
) (*connect.Response[pb.Coin], error) {
	coin, err := s.coinService.GetCoinByID(ctx, req.Msg.MintAddress)
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
	coin, err := s.coinService.GetCoinByID(ctx, req.Msg.MintAddress)
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
		coin, err := s.coinService.GetCoinByID(ctx, solanaAddress.String())
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin for mint address %s: %w", solanaAddress.String(), err))
		}
		return connect.NewResponse(&pb.SearchResponse{Coins: []*pb.Coin{convertModelCoinToPbCoin(coin)}}), nil
	}

	coins, err := s.coinService.SearchCoins(ctx, req.Msg.Query, req.Msg.Tags, req.Msg.MinVolume_24H, req.Msg.Limit, req.Msg.Offset, req.Msg.SortBy, req.Msg.SortDesc)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to search coins: %w", err))
	}

	pbCoins := make([]*pb.Coin, len(coins))
	for i, coin := range coins {
		pbCoins[i] = convertModelCoinToPbCoin(&coin)
	}

	res := connect.NewResponse(&pb.SearchResponse{
		Coins:      pbCoins,
		TotalCount: int32(len(coins)), // TODO: Get actual total count from service
	})
	return res, nil
}

func convertModelCoinToPbCoin(coin *model.Coin) *pb.Coin {
	var createdAtPb *timestamppb.Timestamp // Renamed for clarity
	if coin.CreatedAt != "" { // model.Coin.CreatedAt is string
		if t, err := time.Parse(time.RFC3339, coin.CreatedAt); err == nil {
			createdAtPb = timestamppb.New(t)
		}
		// Consider logging parse error if important
	}

	var lastUpdatedPb *timestamppb.Timestamp // Renamed for clarity
	if coin.LastUpdated != "" { // model.Coin.LastUpdated is string
		if t, err := time.Parse(time.RFC3339, coin.LastUpdated); err == nil {
			lastUpdatedPb = timestamppb.New(t)
		}
		// Consider logging parse error
	}

	var jupiterListedAtPb *timestamppb.Timestamp // New variable for the new field
	if coin.JupiterListedAt != nil { // model.Coin.JupiterListedAt is *time.Time
		jupiterListedAtPb = timestamppb.New(*coin.JupiterListedAt) // Dereference before passing to New
	}

	return &pb.Coin{
		MintAddress:       coin.MintAddress,
		Symbol:            coin.Symbol,
		Name:              coin.Name,
		Decimals:          int32(coin.Decimals),
		Description:       coin.Description,
		IconUrl:           coin.IconUrl,
		Tags:              coin.Tags,
		Price:             coin.Price,
		DailyVolume:       coin.Volume24h,
		Website:           &coin.Website,  // Assuming model.Coin.Website is string, and pb.Coin.website is optional string
		Twitter:           &coin.Twitter,  // Assuming model.Coin.Twitter is string, and pb.Coin.twitter is optional string
		Telegram:          &coin.Telegram, // Assuming model.Coin.Telegram is string, and pb.Coin.telegram is optional string
		// CoingeckoId is not mapped as it's not in model.Coin
		CreatedAt:         createdAtPb,
		LastUpdated:       lastUpdatedPb,
		IsTrending:        coin.IsTrending,
		JupiterListedAt:   jupiterListedAtPb, // Assign the new mapped field
	}
}
