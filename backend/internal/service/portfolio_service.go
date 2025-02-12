package service

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
	"github.com/nicolas-martin/dankfolio/internal/util"
)

type PortfolioService struct {
	portfolioRepo repository.PortfolioRepository
	coinService   *CoinService
}

func NewPortfolioService(portfolioRepo repository.PortfolioRepository, cs *CoinService) *PortfolioService {
	return &PortfolioService{
		portfolioRepo: portfolioRepo,
		coinService:   cs,
	}
}

func (s *PortfolioService) GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error) {
	return s.portfolioRepo.GetPortfolio(ctx, userID)
}

func (s *PortfolioService) GetPortfolioHistory(ctx context.Context, userID string, timeframe string) ([]model.PortfolioSnapshot, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)
	return s.portfolioRepo.GetPortfolioHistory(ctx, userID, startTime)
}

func (s *PortfolioService) GetLeaderboard(ctx context.Context, timeframe string, limit int) (*model.Leaderboard, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)
	return s.portfolioRepo.GetLeaderboard(ctx, startTime, limit)
}

func (s *PortfolioService) GetUserRank(ctx context.Context, userID string, timeframe string) (*model.UserRank, error) {
	startTime := util.GetStartTimeForTimeframe(timeframe)
	return s.portfolioRepo.GetUserRank(ctx, userID, startTime)
}

func (s *PortfolioService) GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error) {
	return s.portfolioRepo.GetPortfolioStats(ctx, userID)
}

func (s *PortfolioService) calculatePortfolioAssets(ctx context.Context, holdings []model.MemeHolding) ([]model.PortfolioAsset, error) {
	var assets []model.PortfolioAsset
	for _, holding := range holdings {
		coin, err := s.coinService.GetCoinByID(ctx, holding.CoinID)
		if err != nil {
			return nil, fmt.Errorf("failed to get coin %s: %w", holding.CoinID, err)
		}

		value := holding.Amount * coin.CurrentPrice
		profitLoss := value - (holding.Amount * holding.AverageBuyPrice)
		profitLossPerc := (profitLoss / (holding.Amount * holding.AverageBuyPrice)) * 100

		asset := model.PortfolioAsset{
			CoinID:          coin.ID,
			Symbol:          coin.Symbol,
			Name:            coin.Name,
			Amount:          holding.Amount,
			CurrentPrice:    coin.CurrentPrice,
			Value:           value,
			AverageBuyPrice: holding.AverageBuyPrice,
			ProfitLoss:      profitLoss,
			ProfitLossPerc:  profitLossPerc,
			LastUpdated:     time.Now(),
		}
		assets = append(assets, asset)
	}
	return assets, nil
}
