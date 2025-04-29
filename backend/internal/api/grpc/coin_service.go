package grpc

import (
	"context"
	"time"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// CoinService implements the CoinService gRPC service
type CoinService struct {
	pb.UnimplementedCoinServiceServer
	store         db.Store
	jupiterClient jupiter.ClientAPI
}

// NewCoinService creates a new CoinService
func NewCoinService(store db.Store, jupiterClient jupiter.ClientAPI) *CoinService {
	return &CoinService{
		store:         store,
		jupiterClient: jupiterClient,
	}
}

// GetAvailableCoins returns a list of available coins
func (s *CoinService) GetAvailableCoins(ctx context.Context, req *pb.GetAvailableCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	var coins []model.Coin
	var err error

	if req.TrendingOnly {
		coins, err = s.store.ListTrendingCoins(ctx)
	} else {
		coins, err = s.store.Coins().List(ctx)
	}

	if err != nil {
		return nil, err
	}

	pbCoins := make([]*pb.Coin, len(coins))
	for i, coin := range coins {
		pbCoins[i] = convertModelCoinToPbCoin(&coin)
	}

	return &pb.GetAvailableCoinsResponse{
		Coins: pbCoins,
	}, nil
}

// GetCoinByID returns a specific coin by ID
func (s *CoinService) GetCoinByID(ctx context.Context, req *pb.GetCoinByIDRequest) (*pb.Coin, error) {
	coin, err := s.store.Coins().Get(ctx, req.Id)
	if err != nil {
		return nil, err
	}

	return convertModelCoinToPbCoin(coin), nil
}

// SearchTokenByMint implements pb.CoinServiceServer
func (s *CoinService) SearchTokenByMint(ctx context.Context, req *pb.SearchTokenByMintRequest) (*pb.SearchTokenByMintResponse, error) {
	token, err := s.store.Tokens().Get(ctx, req.MintAddress)
	if err != nil {
		// If token not found in cache, try to fetch from Jupiter
		jupiterToken, err := s.jupiterClient.GetTokenInfo(ctx, req.MintAddress)
		if err != nil {
			return nil, err
		}

		// Convert and save to cache
		token = &model.Token{
			MintAddress:   jupiterToken.Address,
			Symbol:        jupiterToken.Symbol,
			Name:          jupiterToken.Name,
			Decimals:      int32(jupiterToken.Decimals),
			LogoURI:       jupiterToken.LogoURI,
			CoingeckoID:   jupiterToken.CoingeckoID,
			PriceUSD:      jupiterToken.PriceUSD,
			MarketCapUSD:  jupiterToken.MarketCapUSD,
			Volume24h:     jupiterToken.Volume24h,
			LastUpdatedAt: time.Now(),
			Tags:          jupiterToken.Tags,
		}

		if err := s.store.Tokens().Create(ctx, token); err != nil {
			return nil, err
		}
	}

	return &pb.SearchTokenByMintResponse{
		Token: convertModelTokenToPbToken(token),
	}, nil
}

// GetAllTokens implements pb.CoinServiceServer
func (s *CoinService) GetAllTokens(ctx context.Context, _ *pb.GetAllTokensRequest) (*pb.GetAllTokensResponse, error) {
	// Try to get from cache first
	tokens, err := s.store.Tokens().List(ctx)
	if err != nil || len(tokens) == 0 {
		// If not in cache or empty, fetch from Jupiter
		jupiterTokens, err := s.jupiterClient.GetAllTokens(ctx)
		if err != nil {
			return nil, err
		}

		// Convert and save to cache
		tokens = make([]model.Token, len(jupiterTokens.Tokens))
		for i, jt := range jupiterTokens.Tokens {
			token := model.Token{
				MintAddress:   jt.Address,
				Symbol:        jt.Symbol,
				Name:          jt.Name,
				Decimals:      int32(jt.Decimals),
				LogoURI:       jt.LogoURI,
				CoingeckoID:   jt.CoingeckoID,
				PriceUSD:      jt.PriceUSD,
				MarketCapUSD:  jt.MarketCapUSD,
				Volume24h:     jt.Volume24h,
				LastUpdatedAt: time.Now(),
				Tags:          jt.Tags,
			}
			tokens[i] = token
			if err := s.store.Tokens().Create(ctx, &token); err != nil {
				return nil, err
			}
		}
	}

	// Convert to proto message
	pbTokens := make([]*pb.TokenInfo, len(tokens))
	for i, token := range tokens {
		pbTokens[i] = convertModelTokenToPbToken(&token)
	}

	return &pb.GetAllTokensResponse{
		Tokens: pbTokens,
	}, nil
}

// Search implements pb.CoinServiceServer
func (s *CoinService) Search(ctx context.Context, req *pb.SearchRequest) (*pb.SearchResponse, error) {
	tokens, err := s.store.SearchTokens(ctx, req.Query, req.Tags, req.MinVolume24h, req.Limit, req.Offset, req.SortBy, req.SortDesc)
	if err != nil {
		return nil, err
	}

	pbTokens := make([]*pb.TokenInfo, len(tokens))
	for i, token := range tokens {
		pbTokens[i] = convertModelTokenToPbToken(&token)
	}

	return &pb.SearchResponse{
		Tokens:     pbTokens,
		TotalCount: int32(len(tokens)),
	}, nil
}

func convertModelCoinToPbCoin(coin *model.Coin) *pb.Coin {
	return &pb.Coin{
		Id:          coin.ID,
		Name:        coin.Name,
		Symbol:      coin.Symbol,
		Decimals:    coin.Decimals,
		Description: coin.Description,
		IconUrl:     coin.IconURL,
		Tags:        coin.Tags,
		Price:       coin.Price,
		DailyVolume: coin.DailyVolume,
		Website:     &coin.Website,
		Twitter:     &coin.Twitter,
		Telegram:    &coin.Telegram,
		CoingeckoId: &coin.CoingeckoID,
		CreatedAt:   nil, // TODO: implement timestamp conversion
		LastUpdated: nil, // TODO: implement timestamp conversion
	}
}

func convertModelTokenToPbToken(token *model.Token) *pb.TokenInfo {
	return &pb.TokenInfo{
		MintAddress:    token.MintAddress,
		Symbol:         token.Symbol,
		Name:           token.Name,
		Decimals:       token.Decimals,
		LogoUri:        token.LogoURI,
		CoingeckoId:    token.CoingeckoID,
		PriceUsd:       token.PriceUSD,
		MarketCapUsd:   token.MarketCapUSD,
		Volume24h:      token.Volume24h,
		PriceChange24h: token.PriceChange24h,
		LastUpdatedAt:  token.LastUpdatedAt.Unix(),
	}
}
