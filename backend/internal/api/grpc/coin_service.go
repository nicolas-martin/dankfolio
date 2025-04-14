package grpc

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/dankfoliov1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CoinServiceServer implements the CoinService API
type CoinServiceServer struct {
	dankfoliov1connect.UnimplementedCoinServiceHandler
	coinService *coin.Service
}

// NewCoinServiceServer creates a new CoinServiceServer
func NewCoinServiceServer(coinService *coin.Service) *CoinServiceServer {
	return &CoinServiceServer{coinService: coinService}
}

// GetAvailableCoins returns a list of available coins
func (s *CoinServiceServer) GetAvailableCoins(
	ctx context.Context,
	req *connect.Request[pb.GetAvailableCoinsRequest],
) (*connect.Response[pb.GetAvailableCoinsResponse], error) {
	var modelCoins []model.Coin
	var err error

	if req.Msg == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("request message is nil"))
	}

	// TrendingOnly is now a regular bool, no need to dereference
	if req.Msg.TrendingOnly {
		modelCoins, err = s.coinService.GetTrendingCoins(ctx)
	} else {
		modelCoins, err = s.coinService.GetCoins(ctx)
	}
	if err != nil {
		return nil, err
	}

	coins := convertModelCoinsToProto(modelCoins)
	res := connect.NewResponse(&pb.GetAvailableCoinsResponse{
		Coins: coins,
	})
	return res, nil
}

// GetCoinByID returns a specific coin by ID
func (s *CoinServiceServer) GetCoinByID(
	ctx context.Context,
	req *connect.Request[pb.GetCoinByIDRequest],
) (*connect.Response[pb.Coin], error) {
	modelCoin, err := s.coinService.GetCoinByID(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}

	coin := convertModelCoinToProto(*modelCoin)
	res := connect.NewResponse(coin)
	return res, nil
}

// GetTokenPrices returns prices for multiple tokens
func (s *CoinServiceServer) GetTokenPrices(
	ctx context.Context,
	req *connect.Request[pb.GetTokenPricesRequest],
) (*connect.Response[pb.GetTokenPricesResponse], error) {
	// Get prices from Jupiter client through coin service
	prices := make(map[string]float64)
	for _, id := range req.Msg.TokenIds {
		coin, err := s.coinService.GetCoinByID(ctx, id)
		if err != nil {
			continue // Skip failed coins
		}
		prices[id] = coin.Price
	}

	res := connect.NewResponse(&pb.GetTokenPricesResponse{
		Prices: prices,
	})
	return res, nil
}

// Helper function to convert model.Coin to proto Coin
func convertModelCoinToProto(c model.Coin) *pb.Coin {
	createdAt, _ := time.Parse(time.RFC3339, c.CreatedAt)
	var lastUpdated *timestamppb.Timestamp
	if c.LastUpdated != "" {
		if t, err := time.Parse(time.RFC3339, c.LastUpdated); err == nil {
			lastUpdated = timestamppb.New(t)
		}
	}

	// Initialize pointer variables with safe defaults
	var websitePtr, twitterPtr, telegramPtr, coingeckoIdPtr *string

	// Only set pointers for non-empty strings
	if c.Website != "" {
		websitePtr = &c.Website
	}
	if c.Twitter != "" {
		twitterPtr = &c.Twitter
	}
	if c.Telegram != "" {
		telegramPtr = &c.Telegram
	}
	// CoingeckoId is not in the model, keep it nil

	return &pb.Coin{
		Id:          c.ID,
		Name:        c.Name,
		Symbol:      c.Symbol,
		Decimals:    int32(c.Decimals),
		Description: c.Description,
		IconUrl:     c.IconUrl,
		Tags:        c.Tags,
		Price:       c.Price,
		DailyVolume: c.DailyVolume,
		Website:     websitePtr,
		Twitter:     twitterPtr,
		Telegram:    telegramPtr,
		CoingeckoId: coingeckoIdPtr, // Not in model
		CreatedAt:   timestamppb.New(createdAt),
		LastUpdated: lastUpdated,
	}
}

// Helper function to convert slice of model.Coin to proto Coins
func convertModelCoinsToProto(modelCoins []model.Coin) []*pb.Coin {
	coins := make([]*pb.Coin, len(modelCoins))
	for i, c := range modelCoins {
		coins[i] = convertModelCoinToProto(c)
	}
	return coins
}
