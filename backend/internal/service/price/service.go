package price

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// BackendTimeframeConfig defines the configuration for a specific timeframe for the backend.
type BackendTimeframeConfig struct {
	BirdeyeType         string        // e.g., "1m", "5m", "1H" for Birdeye API
	DefaultViewDuration time.Duration // Default duration window for this granularity, derived from frontend config
	Rounding            time.Duration // Rounding granularity in minutes, from frontend config
	HistoryType         string        // The type of history to fetch, e.g., "1H", "4H", "1D"
}

type Service struct {
	birdeyeClient birdeye.ClientAPI
	jupiterClient jupiter.ClientAPI
	store         db.Store
	cache         PriceHistoryCache
}

func roundDateDown(dateToRound time.Time, granularityMinutes time.Duration) time.Time {
	if granularityMinutes <= 0 {
		slog.Warn("roundDateDown called with zero granularityMinutes, returning original time", "dateToRound", dateToRound)
		return dateToRound
	}

	truncatedDate := dateToRound.Truncate(time.Minute)

	return truncatedDate
}

func NewService(birdeyeClient birdeye.ClientAPI, jupiterClient jupiter.ClientAPI, store db.Store, cache PriceHistoryCache) *Service {
	s := &Service{
		birdeyeClient: birdeyeClient,
		jupiterClient: jupiterClient,
		store:         store,
		cache:         cache,
	}
	return s
}

func (s *Service) GetPriceHistory(ctx context.Context, address string, timeFrameConfig BackendTimeframeConfig, timeStr, addressType string) (*birdeye.PriceHistory, error) {
	cacheKey := fmt.Sprintf("%s-%s", address, timeFrameConfig.HistoryType)

	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("generating random price history")

		randomHistory, err := s.generateRandomPriceHistory(address, timeFrameConfig.BirdeyeType) // Pass BirdeyeType from resolved config
		if err != nil {
			return nil, fmt.Errorf("failed to generate random price history: %w", err)
		}
		return randomHistory, nil
	}

	// Enhanced cache hit logging with price history context
	if cachedData, found := s.cache.Get(cacheKey); found {
		return cachedData, nil
	}

	// Parse and round times
	parsedTime, err := time.Parse(time.RFC3339, timeStr)
	if err != nil {
		slog.Error("Failed to parse time_from string", "timeFromStr", timeStr, "error", err)
		return nil, fmt.Errorf("failed to parse time_from: %w", err)
	}
	timeFrom := parsedTime.Add(-timeFrameConfig.DefaultViewDuration)
	timeTo := parsedTime

	roundedTimeFrom := roundDateDown(timeFrom, timeFrameConfig.Rounding)
	roundedTimeTo := roundDateDown(timeTo, timeFrameConfig.Rounding)
	slog.Info("Time parameters", "inputTime", parsedTime, "originalTimeFrom", timeFrom, "roundedTimeFrom", roundedTimeFrom, "originalTimeTo", timeTo, "roundedTimeTo", roundedTimeTo)

	params := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: timeFrameConfig.BirdeyeType, // Use BirdeyeType from resolved config
		TimeFrom:    roundedTimeFrom,
		TimeTo:      roundedTimeTo,
	}

	result, err := s.birdeyeClient.GetPriceHistory(ctx, params)
	if err != nil {
		// It's good practice to log the specific parameters that failed.
		slog.Error("Failed to fetch price history from birdeye", "params", fmt.Sprintf("%+v", params), "error", err)
		return nil, fmt.Errorf("failed to fetch price history from birdeye: %w", err)
	}

	s.cache.Set(cacheKey, result, timeFrameConfig.Rounding)

	return result, nil
}

func (s *Service) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("x-debug-mode: true for GetCoinPrices, returning random prices")
		mockPrices := make(map[string]float64)
		for _, addr := range tokenAddresses {
			mockPrices[addr] = 1.0 + rand.Float64()
		}
		return mockPrices, nil
	}
	prices, err := s.jupiterClient.GetCoinPrices(ctx, tokenAddresses)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin prices from jupiter: %w", err)
	}
	return prices, nil
}

func (s *Service) generateRandomPriceHistory(address string, historyTypeKey string) (*birdeye.PriceHistory, error) {
	numPoints := 100
	volatility := 0.03
	trendBias := rand.Float64()*2 - 1
	magnitude := rand.Float64() * 2
	basePrice := 0.01 * math.Pow(10, magnitude)
	var items []birdeye.PriceHistoryItem
	currentPrice := basePrice
	now := time.Now()
	for range 3 {
		jump := 1 + (rand.Float64()*0.4 - 0.2)
		currentPrice *= jump
	}
	for i := numPoints - 1; i >= 0; i-- {
		pointTime := now.Add(time.Duration(-i) * time.Hour)
		change := (rand.Float64()*2-1)*volatility + (trendBias * volatility)
		if rand.Float64() < 0.05 {
			change *= 1.5
		}
		currentPrice = math.Max(currentPrice*(1+change), 0.000000001)
		items = append(items, birdeye.PriceHistoryItem{
			UnixTime: pointTime.Unix(),
			Value:    currentPrice,
		})
	}
	return &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: items,
		},
		Success: true,
	}, nil
}
