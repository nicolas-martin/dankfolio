package grpc

import (
	"context"
	"time"

	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service/coin"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CoinServiceServer implements the gRPC coin service
type CoinServiceServer struct {
	pb.UnimplementedCoinServiceServer
	coinService *coin.Service
}

// NewCoinServiceServer creates a new CoinServiceServer
func NewCoinServiceServer(coinService *coin.Service) *CoinServiceServer {
	return &CoinServiceServer{
		coinService: coinService,
	}
}

// GetAvailableCoins returns a list of available coins
func (s *CoinServiceServer) GetAvailableCoins(ctx context.Context, req *pb.GetAvailableCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	var modelCoins []model.Coin
	var err error

	if req.TrendingOnly {
		modelCoins, err = s.coinService.GetTrendingCoins(ctx)
		if err != nil {
			return nil, err
		}
	} else {
		modelCoins, err = s.coinService.GetCoins(ctx)
		if err != nil {
			return nil, err
		}
	}

	coins := convertModelCoinsToProto(modelCoins)
	return &pb.GetAvailableCoinsResponse{
		Coins: coins,
	}, nil
}

// GetCoinByID returns a specific coin by ID
func (s *CoinServiceServer) GetCoinByID(ctx context.Context, req *pb.GetCoinByIDRequest) (*pb.Coin, error) {
	modelCoin, err := s.coinService.GetCoinByID(ctx, req.Id)
	if err != nil {
		return nil, err
	}

	return convertModelCoinToProto(*modelCoin), nil
}

// GetTokenPrices returns prices for multiple tokens
func (s *CoinServiceServer) GetTokenPrices(ctx context.Context, req *pb.GetTokenPricesRequest) (*pb.GetTokenPricesResponse, error) {
	// Get prices from Jupiter client through coin service
	prices := make(map[string]float64)
	for _, id := range req.TokenIds {
		coin, err := s.coinService.GetCoinByID(ctx, id)
		if err != nil {
			continue // Skip failed coins
		}
		prices[id] = coin.Price
	}

	return &pb.GetTokenPricesResponse{
		Prices: prices,
	}, nil
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
		Website:     &c.Website,
		Twitter:     &c.Twitter,
		Telegram:    &c.Telegram,
		CoingeckoId: nil, // Not in model
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
