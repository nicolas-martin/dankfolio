package service

import (
	"context"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/util"
)

type CoinService struct {
	coinRepo repository.CoinRepository
}

func NewCoinService(coinRepo repository.CoinRepository) *CoinService {
	return &CoinService{coinRepo: coinRepo}
}

func (s *CoinService) GetTopMemeCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
	return s.coinRepo.GetTopMemeCoins(ctx, limit)
}

func (s *CoinService) GetPriceHistory(ctx context.Context, coinID string, startTime time.Time) ([]model.PricePoint, error) {
	return s.coinRepo.GetPriceHistory(ctx, coinID, startTime)
}

func (s *CoinService) UpdatePrices(ctx context.Context, updates []model.PriceUpdate) error {
	return s.coinRepo.UpdatePrices(ctx, updates)
}

func (s *CoinService) GetCoinByID(ctx context.Context, coinID string) (*model.MemeCoin, error) {
	return s.coinRepo.GetCoinByID(ctx, coinID)
}

func (s *CoinService) GetTopCoins(ctx context.Context, limit int) ([]model.MemeCoin, error) {
	return s.GetTopMemeCoins(ctx, limit)
}

func (s *CoinService) GetCoinPriceHistory(ctx context.Context, coinID string, timeframe string) ([]model.PricePoint, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)
	endTime := time.Now()

	return s.coinRepo.GetCoinPriceHistory(ctx, coinID, startTime, endTime)
}
