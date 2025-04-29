package grpc

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"connectrpc.com/connect"
	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
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
	coin, err := s.coinService.GetCoinByID(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get coin: %w", err))
	}

	res := connect.NewResponse(convertModelCoinToPbCoin(coin))
	return res, nil
}

// SearchTokenByMint searches for a token by mint address
func (s *coinServiceHandler) SearchTokenByMint(
	ctx context.Context,
	req *connect.Request[pb.SearchTokenByMintRequest],
) (*connect.Response[pb.SearchTokenByMintResponse], error) {
	// The mint address is the same as the coin ID in our model
	coin, err := s.coinService.GetCoinByID(ctx, req.Msg.MintAddress)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to get token info for mint address %s: %w", req.Msg.MintAddress, err))
	}

	res := connect.NewResponse(&pb.SearchTokenByMintResponse{
		Token: convertModelCoinToTokenInfo(coin),
	})
	return res, nil
}

// GetAllTokens returns a list of all available tokens
func (s *coinServiceHandler) GetAllTokens(
	ctx context.Context,
	req *connect.Request[pb.GetAllTokensRequest],
) (*connect.Response[pb.GetAllTokensResponse], error) {
	coins, err := s.coinService.GetCoins(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get tokens: %w", err))
	}

	// Convert to proto message
	pbTokens := make([]*pb.TokenInfo, len(coins))
	for i, coin := range coins {
		pbTokens[i] = convertModelCoinToTokenInfo(&coin)
	}

	res := connect.NewResponse(&pb.GetAllTokensResponse{
		Tokens: pbTokens,
	})
	return res, nil
}

// Search allows searching tokens by various criteria
func (s *coinServiceHandler) Search(
	ctx context.Context,
	req *connect.Request[pb.SearchRequest],
) (*connect.Response[pb.SearchResponse], error) {
	log.Printf("Received search request: %+v", req)

	// Get all coins from the service
	coins, err := s.coinService.GetCoins(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to search tokens: %w", err))
	}

	// Filter coins based on min_volume_24h and search query
	var filteredCoins []model.Coin
	for _, coin := range coins {
		if coin.DailyVolume < req.Msg.MinVolume_24H {
			continue
		}

		// Check if query matches name, symbol, or mint address (ID)
		if req.Msg.Query != "" {
			query := strings.ToLower(req.Msg.Query)
			name := strings.ToLower(coin.Name)
			symbol := strings.ToLower(coin.Symbol)
			mintAddress := strings.ToLower(coin.ID) // ID is the mint address

			if !strings.Contains(name, query) &&
				!strings.Contains(symbol, query) &&
				!strings.Contains(mintAddress, query) {
				continue
			}
		}

		filteredCoins = append(filteredCoins, coin)
	}

	// Convert to proto message
	pbTokens := make([]*pb.TokenInfo, len(filteredCoins))
	for i, coin := range filteredCoins {
		pbTokens[i] = convertModelCoinToTokenInfo(&coin)
	}

	res := connect.NewResponse(&pb.SearchResponse{
		Tokens: pbTokens,
	})
	return res, nil
}

func convertModelCoinToPbCoin(coin *model.Coin) *pb.Coin {
	return &pb.Coin{
		Id:          coin.ID, // This is the mint address
		Name:        coin.Name,
		Symbol:      coin.Symbol,
		Decimals:    int32(coin.Decimals),
		Description: coin.Description,
		IconUrl:     coin.IconUrl,
		Tags:        coin.Tags,
		Price:       coin.Price,
		DailyVolume: coin.DailyVolume,
		Website:     &coin.Website,
		Twitter:     &coin.Twitter,
		Telegram:    &coin.Telegram,
		CreatedAt:   nil, // TODO: implement timestamp conversion
		LastUpdated: nil, // TODO: implement timestamp conversion
	}
}

func convertModelCoinToTokenInfo(coin *model.Coin) *pb.TokenInfo {
	return &pb.TokenInfo{
		MintAddress:   coin.ID, // ID is the mint address
		Symbol:        coin.Symbol,
		Name:          coin.Name,
		Decimals:      int32(coin.Decimals),
		LogoUri:       coin.IconUrl,
		CoingeckoId:   "", // Not available in coin model
		PriceUsd:      coin.Price,
		MarketCapUsd:  0, // Not available in coin model
		Volume_24H:    coin.DailyVolume,
		LastUpdatedAt: time.Now().Unix(), // Using current time as this is not tracked in coin model
	}
}
