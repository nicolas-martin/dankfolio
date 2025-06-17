package coin

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
)

const (
	defaultCacheTTL = 5 * time.Minute
)

type Service struct {
	store db.Store
	cache CoinCache
}

func NewService(store db.Store, cache CoinCache) *Service {
	return &Service{
		store: store,
		cache: cache,
	}
}

// --- Placeholder Implementations for existing RPCs ---
func (s *Service) GetAvailableCoins(ctx context.Context, req *pb.GetAvailableCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	slog.Warn("GetAvailableCoins called, but not fully implemented in this version")
	// In a real scenario, you'd fetch from s.store based on req.TrendingOnly, req.Limit, req.Offset
	return &pb.GetAvailableCoinsResponse{Coins: []*pb.Coin{}, TotalCount: 0}, nil
}

func (s *Service) GetCoinByID(ctx context.Context, req *pb.GetCoinByIDRequest) (*pb.Coin, error) {
	slog.Warn("GetCoinByID called, but not fully implemented in this version")
	// Fetch from s.store by req.MintAddress
	return nil, fmt.Errorf("GetCoinByID not implemented")
}

func (s *Service) SearchCoinByMint(ctx context.Context, req *pb.SearchCoinByMintRequest) (*pb.SearchCoinByMintResponse, error) {
    slog.Warn("SearchCoinByMint called, but not fully implemented in this version")
    // Fetch from s.store by req.MintAddress
    return nil, fmt.Errorf("SearchCoinByMint not implemented")
}

func (s *Service) GetAllCoins(ctx context.Context, req *pb.GetAllCoinsRequest) (*pb.GetAllCoinsResponse, error) {
    slog.Warn("GetAllCoins called, but not fully implemented in this version")
    return &pb.GetAllCoinsResponse{Coins: []*pb.Coin{}}, nil
}

func (s *Service) Search(ctx context.Context, req *pb.SearchRequest) (*pb.SearchResponse, error) {
    slog.Warn("Search called, but not fully implemented in this version")
    return &pb.SearchResponse{Coins: []*pb.Coin{}, TotalCount: 0}, nil
}
// --- End Placeholder Implementations ---


func (s *Service) GetNewCoins(ctx context.Context, req *pb.GetNewCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	cacheKey := "newCoins"
	if req.Limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, req.Limit)
	}
	if req.Offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, req.Offset)
	}

	if cachedData, found := s.cache.Get(cacheKey); found {
		slog.Info("GetNewCoins cache HIT", "key", cacheKey)
		return cachedData, nil
	}
	slog.Info("GetNewCoins cache MISS", "key", cacheKey)

	coins := []*pb.Coin{
		{MintAddress: "newCoin1", Name: "New Coin Alpha", Symbol: "NCA", Price: 0.5, DailyVolume: 10000},
		{MintAddress: "newCoin2", Name: "New Coin Beta", Symbol: "NCB", Price: 1.2, DailyVolume: 25000},
	}
	totalOriginalCount := int32(len(coins))

	// Apply offset and limit to placeholder data
	var finalCoins []*pb.Coin
	start := int32(0)
	if req.Offset > 0 {
		start = req.Offset
	}
	end := totalOriginalCount
	if req.Limit > 0 {
		// If limit is set, end is start + limit, but don't exceed totalOriginalCount
		if start + req.Limit < totalOriginalCount {
			end = start + req.Limit
		}
	}

	if start < totalOriginalCount {
		finalCoins = coins[start:end]
	} else {
		finalCoins = []*pb.Coin{}
	}

	response := &pb.GetAvailableCoinsResponse{
		Coins:      finalCoins,
		TotalCount: totalOriginalCount,
	}
	s.cache.Set(cacheKey, response, defaultCacheTTL)
	return response, nil
}

func (s *Service) GetTrendingCoins(ctx context.Context, req *pb.GetTrendingCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	cacheKey := "trendingCoins"
	if req.Limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, req.Limit)
	}
	if req.Offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, req.Offset)
	}

	if cachedData, found := s.cache.Get(cacheKey); found {
		slog.Info("GetTrendingCoins cache HIT", "key", cacheKey)
		return cachedData, nil
	}
	slog.Info("GetTrendingCoins cache MISS", "key", cacheKey)

	coins := []*pb.Coin{
		{MintAddress: "trendingCoin1", Name: "Trending Coin X", Symbol: "TCX", Price: 10.5, DailyVolume: 1000000, IsTrending: true},
		{MintAddress: "trendingCoin2", Name: "Trending Coin Y", Symbol: "TCY", Price: 5.2, DailyVolume: 500000, IsTrending: true},
	}
	totalOriginalCount := int32(len(coins))

	var finalCoins []*pb.Coin
	start := int32(0)
	if req.Offset > 0 {
		start = req.Offset
	}
	end := totalOriginalCount
	if req.Limit > 0 {
		if start + req.Limit < totalOriginalCount {
			end = start + req.Limit
		}
	}

	if start < totalOriginalCount {
		finalCoins = coins[start:end]
	} else {
		finalCoins = []*pb.Coin{}
	}

	response := &pb.GetAvailableCoinsResponse{
		Coins:      finalCoins,
		TotalCount: totalOriginalCount,
	}
	s.cache.Set(cacheKey, response, defaultCacheTTL)
	return response, nil
}

func (s *Service) GetTopGainersCoins(ctx context.Context, req *pb.GetTopGainersCoinsRequest) (*pb.GetAvailableCoinsResponse, error) {
	cacheKey := "topGainersCoins"
	if req.Limit > 0 {
		cacheKey = fmt.Sprintf("%s_limit_%d", cacheKey, req.Limit)
	}
	if req.Offset > 0 {
		cacheKey = fmt.Sprintf("%s_offset_%d", cacheKey, req.Offset)
	}

	if cachedData, found := s.cache.Get(cacheKey); found {
		slog.Info("GetTopGainersCoins cache HIT", "key", cacheKey)
		return cachedData, nil
	}
	slog.Info("GetTopGainersCoins cache MISS", "key", cacheKey)

	// PriceChangePercentage24h for pb.Coin is *float64
	val1 := 55.5
	val2 := 150.0
	coins := []*pb.Coin{
		{MintAddress: "gainerCoin1", Name: "Gainer Coin Up", Symbol: "GCU", Price: 2.5, PriceChangePercentage24H: &val1, DailyVolume: 75000},
		{MintAddress: "gainerCoin2", Name: "Gainer Coin Sky", Symbol: "GCS", Price: 0.8, PriceChangePercentage24H: &val2, DailyVolume: 120000},
	}
	totalOriginalCount := int32(len(coins))

	var finalCoins []*pb.Coin
	start := int32(0)
	if req.Offset > 0 {
		start = req.Offset
	}
	end := totalOriginalCount
	if req.Limit > 0 {
		if start + req.Limit < totalOriginalCount {
			end = start + req.Limit
		}
	}

	if start < totalOriginalCount {
		finalCoins = coins[start:end]
	} else {
		finalCoins = []*pb.Coin{}
	}

	response := &pb.GetAvailableCoinsResponse{
		Coins:      finalCoins,
		TotalCount: totalOriginalCount,
	}
	s.cache.Set(cacheKey, response, defaultCacheTTL)
	return response, nil
}
