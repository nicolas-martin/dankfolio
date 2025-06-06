package price

import (
	"context"
	// "encoding/json" // Removed
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	// "os" // Removed

	// "os" // Will be removed by goimports if not used
	// "path/filepath" // Will be removed by goimports if not used
	// "sync" // Will be removed by goimports if not used
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Service handles price-related operations
type Service struct {
	birdeyeClient birdeye.ClientAPI // Use the interface
	jupiterClient jupiter.ClientAPI
	store         db.Store
	cache         PriceHistoryCache // Added cache
}

// TimeframeConfigEntry defines the configuration for a specific timeframe.
type TimeframeConfigEntry struct {
	Granularity     string // e.g., "ONE_MINUTE", "FIVE_MINUTE" (matching birdeye client expectations)
	DurationMs      int64
	RoundingMinutes int
}

// TIMEFRAME_CONFIG maps timeframe keys (e.g., "1H", "4H") to their configurations.
var TIMEFRAME_CONFIG = map[string]TimeframeConfigEntry{
	"1H":      {Granularity: "ONE_MINUTE", DurationMs: 1 * 60 * 60 * 1000, RoundingMinutes: 1},
	"4H":      {Granularity: "ONE_MINUTE", DurationMs: 4 * 60 * 60 * 1000, RoundingMinutes: 1},
	"1D":      {Granularity: "FIVE_MINUTE", DurationMs: 24 * 60 * 60 * 1000, RoundingMinutes: 5},
	"1W":      {Granularity: "ONE_HOUR", DurationMs: 7 * 24 * 60 * 60 * 1000, RoundingMinutes: 60},
	"1M":      {Granularity: "FOUR_HOUR", DurationMs: 30 * 24 * 60 * 60 * 1000, RoundingMinutes: 240}, // Approx 30 days
	"1Y":      {Granularity: "ONE_DAY", DurationMs: 365 * 24 * 60 * 60 * 1000, RoundingMinutes: 1440},
	// Short term
	"1m":  {Granularity: "1m", DurationMs: 1 * 60 * 60 * 1000, RoundingMinutes: 1},    // 1-hour window, 1-min granularity
	"3m":  {Granularity: "3m", DurationMs: 3 * 60 * 60 * 1000, RoundingMinutes: 3},    // 3-hour window, 3-min granularity
	"5m":  {Granularity: "5m", DurationMs: 5 * 60 * 60 * 1000, RoundingMinutes: 5},    // 5-hour window, 5-min granularity
	"15m": {Granularity: "15m", DurationMs: 12 * 60 * 60 * 1000, RoundingMinutes: 15},  // 12-hour window, 15-min granularity
	"30m": {Granularity: "30m", DurationMs: 24 * 60 * 60 * 1000, RoundingMinutes: 30},  // 1-day window, 30-min granularity

	// Hourly
	"1H":  {Granularity: "1H", DurationMs: 1 * 24 * 60 * 60 * 1000, RoundingMinutes: 60},   // 1-day window, 1-hour granularity
	"2H":  {Granularity: "2H", DurationMs: 2 * 24 * 60 * 60 * 1000, RoundingMinutes: 120},  // 2-day window, 2-hour granularity
	"4H":  {Granularity: "4H", DurationMs: 4 * 24 * 60 * 60 * 1000, RoundingMinutes: 240},  // 4-day window, 4-hour granularity
	"6H":  {Granularity: "6H", DurationMs: 7 * 24 * 60 * 60 * 1000, RoundingMinutes: 360},  // 1-week window, 6-hour granularity
	"8H":  {Granularity: "8H", DurationMs: 7 * 24 * 60 * 60 * 1000, RoundingMinutes: 480},  // 1-week window, 8-hour granularity (approx)
	"12H": {Granularity: "12H", DurationMs: 14 * 24 * 60 * 60 * 1000, RoundingMinutes: 720}, // 2-week window, 12-hour granularity

	// Daily/Weekly
	"1D":  {Granularity: "1D", DurationMs: 30 * 24 * 60 * 60 * 1000, RoundingMinutes: 1440}, // 1-month window, 1-day granularity
	"3D":  {Granularity: "3D", DurationMs: 90 * 24 * 60 * 60 * 1000, RoundingMinutes: 3 * 1440},// 3-month window, 3-day granularity
	"1W":  {Granularity: "1W", DurationMs: 365 * 24 * 60 * 60 * 1000, RoundingMinutes: 7 * 1440},// 1-year window, 1-week granularity

	"DEFAULT": {Granularity: "15m", DurationMs: 12 * 60 * 60 * 1000, RoundingMinutes: 15}, // Matches "15m" entry
}

// roundDateDown rounds the given time down to the specified granularity in minutes.
func roundDateDown(dateToRound time.Time, granularityMinutes int) time.Time {
	if granularityMinutes == 0 {
		slog.Warn("roundDateDown called with zero granularityMinutes, returning original time", "dateToRound", dateToRound)
		return dateToRound
	}
	// Ensure granularityMs is not zero to prevent panic with division by zero
	if granularityMinutes <= 0 {
		granularityMinutes = 1 // Default to 1 minute if invalid
	}

	// Truncate to the minute first to remove seconds and nanoseconds before rounding
	truncatedDate := dateToRound.Truncate(time.Minute)

	// Calculate minutes since epoch for the truncated date
	totalMinutes := truncatedDate.Unix() / 60

	// Calculate the rounded minutes
	roundedTotalMinutes := (totalMinutes / int64(granularityMinutes)) * int64(granularityMinutes)

	// Convert rounded minutes back to a time.Time object
	roundedTime := time.Unix(roundedTotalMinutes*60, 0).In(dateToRound.Location()) // Preserve original location (e.g. UTC)

	return roundedTime
}

// NewService creates a new price service
func NewService(birdeyeClient birdeye.ClientAPI, jupiterClient jupiter.ClientAPI, store db.Store, cache PriceHistoryCache) *Service { // Added cache parameter
	s := &Service{
		birdeyeClient: birdeyeClient,
		jupiterClient: jupiterClient,
		store:         store,
		cache:         cache, // Assign cache
	}
	// s.populateAddressToSymbolCache(context.Background()) // Removed
	return s
}

// GetPriceHistory retrieves price history for a given token.
// historyType is assumed to be a key from TIMEFRAME_CONFIG (e.g., "1H", "4H").
func (s *Service) GetPriceHistory(ctx context.Context, address, historyType, timeFromStr, timeToStr, addressType string) (*birdeye.PriceHistory, error) {
	config, ok := TIMEFRAME_CONFIG[historyType]
	if !ok {
		slog.Warn("Invalid historyType, falling back to DEFAULT", "requestedHistoryType", historyType)
		config = TIMEFRAME_CONFIG["DEFAULT"]
		historyType = "DEFAULT" // Update historyType to reflect the key used for caching
	}
	slog.Info("Using timeframe configuration", "key", historyType, "config", config)

	// Cache key now uses the resolved historyType (e.g. "1H", "DEFAULT")
	cacheKey := fmt.Sprintf("%s-%s", address, historyType)

	if cachedData, found := s.cache.Get(cacheKey); found {
		slog.Info("Cache hit for price history", "key", cacheKey)
		return cachedData, nil
	}
	slog.Info("Cache miss for price history", "key", cacheKey)

	// Debug mode handling
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.InfoContext(ctx, "x-debug-mode: true. Generating random price history.", "address", address, "historyType", historyType)
		// ONLY call generateRandomPriceHistory now
		// The historyTypeKey argument for generateRandomPriceHistory is now just 'historyType' (e.g. "1H")
		randomHistory, err := s.generateRandomPriceHistory(address, historyType)
		if err != nil {
			return nil, fmt.Errorf("failed to generate random price history: %w", err)
		}

		// Cache the randomly generated history as well
		// config variable is already available from above
		cacheDuration := time.Duration(config.RoundingMinutes) * time.Minute
		s.cache.Set(cacheKey, randomHistory, cacheDuration)
		slog.InfoContext(ctx, "Cached random price history in debug mode", "key", cacheKey, "duration", cacheDuration)
		return randomHistory, nil
	}

	// Parse and round times
	parsedTimeFrom, err := time.Parse(time.RFC3339, timeFromStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_from: %w", err)
	}
	parsedTimeTo, err := time.Parse(time.RFC3339, timeToStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse time_to: %w", err)
	}

	roundedTimeFrom := roundDateDown(parsedTimeFrom, config.RoundingMinutes)
	roundedTimeTo := roundDateDown(parsedTimeTo, config.RoundingMinutes)
	slog.Info("Time parameters", "originalFrom", parsedTimeFrom, "roundedFrom", roundedTimeFrom, "originalTo", parsedTimeTo, "roundedTo", roundedTimeTo, "roundingMinutes", config.RoundingMinutes)

	params := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: config.Granularity, // Use Granularity from TIMEFRAME_CONFIG for Birdeye API
		TimeFrom:    roundedTimeFrom,
		TimeTo:      roundedTimeTo,
	}

	result, err := s.birdeyeClient.GetPriceHistory(ctx, params)
	if err != nil {
		// Ensure the error from birdeyeClient is wrapped, as it was in the original code
		return nil, fmt.Errorf("failed to fetch price history from birdeye: %w", err)
	}

	if result != nil { // Check if result is not nil before setting cache
		slog.Info("Storing fetched data in cache", "key", cacheKey, "expiration", time.Duration(config.RoundingMinutes)*time.Minute)
		s.cache.Set(cacheKey, result, time.Duration(config.RoundingMinutes)*time.Minute)
	}
	return result, nil
}

// GetCoinPrices returns current prices for multiple tokens
func (s *Service) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	// The 'useBirdeye' parameter was in my test file, but not in the actual service.go.
	// The actual service.go determines debug mode through context.
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		// The problem description for GetCoinPrices in service_test.go was:
		// t.Run("Success - Debug Mode", func(t *testing.T) { ... mockBirdeyeClient.On("GetCoinPrices", ctx, coinAddresses) ... })
		// This implies that in debug mode, GetCoinPrices should call birdeyeClient.GetCoinPrices.
		// However, the birdeye.ClientAPI I defined only has GetPriceHistory.
		// The birdeye client implementation itself also doesn't have GetCoinPrices.
		// This means the debug path for GetCoinPrices in the tests which expects a call to birdeyeClient.GetCoinPrices is incorrect based on current client capabilities.

		// For now, I will keep the existing debug logic (random prices) and will later address
		// if birdeyeClient should indeed have a GetCoinPrices method and be used in debug.
		// My previous test draft for GetCoinPrices (debug mode) was:
		// mockBirdeyeClient.On("GetCoinPrices", ctx, coinAddresses).Return(expectedPrices, nil).Once()
		// This requires birdeye.ClientAPI to have GetCoinPrices.
		// Let's assume for now that GetCoinPrices in debug mode should return random prices as implemented.
		slog.Info("x-debug-mode: true for GetCoinPrices, returning random prices")
		mockPrices := make(map[string]float64)
		for _, addr := range tokenAddresses {
			mockPrices[addr] = 1.0 + rand.Float64() // Random price between 1.0 and 2.0
		}
		return mockPrices, nil
	}

	// Get real prices from Jupiter API
	prices, err := s.jupiterClient.GetCoinPrices(ctx, tokenAddresses)
	if err != nil {
		return nil, fmt.Errorf("failed to get coin prices from jupiter: %w", err)
	}
	return prices, nil
}

// loadMockPriceHistory function removed

func (s *Service) generateRandomPriceHistory(address string, historyTypeKey string) (*birdeye.PriceHistory, error) { // historyTypeKey is "1H", "4H", etc.
	slog.Info("🎲 Generating random price history", "address", address, "historyTypeKey", historyTypeKey)
	// Default to 100 points for smoother chart
	numPoints := 100
	volatility := 0.03                // Base volatility for normal movements
	trendBias := rand.Float64()*2 - 1 // Random trend between -1 and 1

	// Generate a more diverse base price between $0.01 and $1.00
	magnitude := rand.Float64() * 2             // Random number between 0 and 2
	basePrice := 0.01 * math.Pow(10, magnitude) // This gives us a range from 0.01 to 1.00

	// Generate price points
	var items []birdeye.PriceHistoryItem
	currentPrice := basePrice
	now := time.Now()

	// Add some initial random jumps to create more diverse starting points
	for range 3 {
		jump := 1 + (rand.Float64()*0.4 - 0.2) // Random jump between 0.8x and 1.2x
		currentPrice *= jump
	}

	for i := numPoints - 1; i >= 0; i-- {
		pointTime := now.Add(time.Duration(-i) * time.Hour)

		// Generate next price with random walk + trend
		change := (rand.Float64()*2-1)*volatility + (trendBias * volatility)

		// Occasionally add bigger price movements
		if rand.Float64() < 0.05 { // 5% chance of a bigger move
			change *= 1.5 // 1.5x normal volatility for spikes
		}

		currentPrice = max(currentPrice*(1+change), 0.01)

		items = append(items, birdeye.PriceHistoryItem{
			UnixTime: pointTime.Unix(),
			Value:    currentPrice,
		})
	}

	slog.Info("🎲 Generated random price points",
		"count", len(items),
		"address", address,
		"basePrice", basePrice)

	return &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: items,
		},
		Success: true,
	}, nil
}

// populateAddressToSymbolCache function removed
