package service

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/repository"
)

type PortfolioService interface {
	GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error)
	GetPortfolioHistory(ctx context.Context, userID string, timeframe string) ([]model.PortfolioSnapshot, error)
	GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error)
	GetUserRank(ctx context.Context, userID string) (*model.UserRank, error)
}

type portfolioService struct {
	repo        repository.PortfolioRepository
	coinService *CoinService
}

func NewPortfolioService(repo repository.PortfolioRepository, cs *CoinService) PortfolioService {
	return &portfolioService{repo: repo, coinService: cs}
}

func (s *portfolioService) GetPortfolio(ctx context.Context, userID string) (*model.Portfolio, error) {
	return s.repo.GetPortfolio(ctx, userID)
}

func (s *portfolioService) GetPortfolioHistory(ctx context.Context, userID string, timeframe string) ([]model.PortfolioSnapshot, error) {
	var startTime time.Time
	now := time.Now()
	switch timeframe {
	case "24h":
		startTime = now.Add(-24 * time.Hour)
	case "7d":
		startTime = now.AddDate(0, 0, -7)
	case "30d":
		startTime = now.AddDate(0, 0, -30)
	case "90d":
		startTime = now.AddDate(0, 0, -90)
	case "1y":
		startTime = now.AddDate(-1, 0, 0)
	default:
		startTime = now.Add(-24 * time.Hour)
	}
	return s.repo.GetPortfolioHistory(ctx, userID, startTime)
}

func (s *portfolioService) GetPortfolioStats(ctx context.Context, userID string) (*model.PortfolioStats, error) {
	return s.repo.GetPortfolioStats(ctx, userID)
}

func (s *portfolioService) GetUserRank(ctx context.Context, userID string) (*model.UserRank, error) {
	return s.repo.GetUserRank(ctx, userID)
}

func (s *portfolioService) calculatePortfolioAssets(ctx context.Context, holdings []model.MemeHolding) ([]model.PortfolioAsset, error) {
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
