package price

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

type Service struct {
	birdeyeClient birdeye.ClientAPI
	jupiterClient jupiter.ClientAPI
	store         db.Store
	cache         PriceHistoryCache
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

func (s *Service) GetPriceHistory(ctx context.Context, address string, timeFrameConfig BackendTimeframeConfig, endTimeStr, addressType string) (*birdeye.PriceHistory, error) {
	cacheKey := fmt.Sprintf("%s-%s", address, timeFrameConfig.HistoryType)

	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("🎲 generating random price history")

		randomHistory, err := s.generateRandomPriceHistory()
		if err != nil {
			return nil, fmt.Errorf("failed to generate random price history: %w", err)
		}
		return randomHistory, nil
	}

	// Enhanced cache hit logging with price history context
	if cachedData, found := s.cache.Get(cacheKey); found {
		return cachedData, nil
	}

	// Parse the end time of the window (typically "now")
	windowEnd, err := time.Parse(time.RFC3339, endTimeStr)
	if err != nil {
		slog.Error("Failed to parse end time string", "endTimeStr", endTimeStr, "error", err)
		return nil, fmt.Errorf("failed to parse end time: %w", err)
	}

	// Calculate time window: [windowEnd - DefaultViewDuration, windowEnd]
	// For example, if windowEnd is "now" and DefaultViewDuration is 1 hour,
	// we fetch data from 1 hour ago until now
	windowStart := windowEnd.Add(-timeFrameConfig.DefaultViewDuration)

	// Round the times to appropriate granularity
	roundedWindowStart := roundDateDown(windowStart, timeFrameConfig.Rounding)
	roundedWindowEnd := roundDateDown(windowEnd, timeFrameConfig.Rounding)

	// Ensure we have at least a minimum time span to get multiple data points
	minTimeSpan := timeFrameConfig.DefaultViewDuration / 4
	if roundedWindowEnd.Sub(roundedWindowStart) < minTimeSpan {
		roundedWindowStart = roundedWindowEnd.Add(-timeFrameConfig.DefaultViewDuration)
		slog.Info("Adjusted time range to ensure minimum span",
			"originalStart", roundedWindowStart.Add(timeFrameConfig.DefaultViewDuration),
			"adjustedStart", roundedWindowStart,
			"minTimeSpan", minTimeSpan)
	}

	params := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: timeFrameConfig.BirdeyeType,
		TimeFrom:    roundedWindowStart,
		TimeTo:      roundedWindowEnd,
	}

	result, err := s.birdeyeClient.GetPriceHistory(ctx, params)
	if err != nil {
		slog.Error("Failed to fetch price history from birdeye", "params", fmt.Sprintf("%+v", params), "error", err)
		return nil, fmt.Errorf("failed to fetch price history from birdeye: %w", err)
	}

	s.cache.Set(cacheKey, result, timeFrameConfig.Rounding)

	return result, nil
}

// GetCoinPrices gets the prices for multiple coins
// TODO: Should we update all the data instead of just returning the price?
func (s *Service) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("x-debug-mode: true for GetCoinPrices, returning random prices")
		mockPrices := make(map[string]float64)
		for _, addr := range tokenAddresses {
			mockPrices[addr] = 1.0 + rand.Float64()
		}
		return mockPrices, nil
	}

	// Use Birdeye's single token overview endpoint in parallel
	prices := make(map[string]float64)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrent requests to avoid rate limiting
	semaphore := make(chan struct{}, 5)

	for _, address := range tokenAddresses {
		wg.Add(1)
		go func(addr string) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Handle native SOL specially - use wrapped SOL address for price data
			apiAddress := addr
			if addr == model.NativeSolMint { // Native SOL
				apiAddress = model.SolMint // Wrapped SOL
				slog.DebugContext(ctx, "Converting native SOL to wrapped SOL for price lookup", "original", addr, "wrapped", apiAddress)
			}

			// Get token overview which includes price
			overview, err := s.birdeyeClient.GetTokenOverview(ctx, apiAddress)
			if err != nil {
				slog.Warn("Failed to get price for token", "address", addr, "api_address", apiAddress, "error", err)
				return
			}

			// Store the price using the original address
			mu.Lock()
			prices[addr] = overview.Data.Price
			mu.Unlock()

			slog.DebugContext(ctx, "Successfully fetched price", "address", addr, "api_address", apiAddress, "price", overview.Data.Price)
		}(address)
	}

	wg.Wait()

	// Log any missing prices
	for _, addr := range tokenAddresses {
		if _, found := prices[addr]; !found {
			slog.Warn("Price not found for token", "address", addr)
		}
	}

	return prices, nil
}

func (s *Service) generateRandomPriceHistory() (*birdeye.PriceHistory, error) {
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

// GetPriceHistoriesByAddresses retrieves price histories for multiple addresses using parallel processing
func (s *Service) GetPriceHistoriesByAddresses(ctx context.Context, requests []PriceHistoryBatchRequest) (map[string]*PriceHistoryBatchResult, error) {
	if len(requests) == 0 {
		return make(map[string]*PriceHistoryBatchResult), nil
	}

	slog.InfoContext(ctx, "Getting price histories for multiple addresses", "count", len(requests))

	// Check for debug mode
	if debugMode, ok := ctx.Value(model.DebugModeKey).(bool); ok && debugMode {
		slog.Info("x-debug-mode: true for GetPriceHistoriesByAddresses, returning random price histories")
		results := make(map[string]*PriceHistoryBatchResult)
		for _, req := range requests {
			randomHistory, err := s.generateRandomPriceHistory()
			if err != nil {
				results[req.Address] = &PriceHistoryBatchResult{
					Data:         nil,
					Success:      false,
					ErrorMessage: fmt.Sprintf("failed to generate random price history: %v", err),
				}
			} else {
				results[req.Address] = &PriceHistoryBatchResult{
					Data:         randomHistory,
					Success:      true,
					ErrorMessage: "",
				}
			}
		}
		return results, nil
	}

	// Use parallel processing with worker pool
	maxWorkers := s.birdeyeClient.GetMaxWorkers()
	const bufferSize = 10

	type priceHistoryJob struct {
		request PriceHistoryBatchRequest
	}

	type priceHistoryResult struct {
		address string
		result  *PriceHistoryBatchResult
	}

	// Create job and result channels
	jobs := make(chan priceHistoryJob, bufferSize)
	results := make(chan priceHistoryResult, len(requests))

	// Start worker goroutines
	var wg sync.WaitGroup
	for i := range maxWorkers {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for job := range jobs {
				result := s.fetchSinglePriceHistory(ctx, job.request, workerID)
				results <- priceHistoryResult{
					address: job.request.Address,
					result:  result,
				}
			}
		}(i)
	}

	// Send jobs to workers
	go func() {
		defer close(jobs)
		for _, request := range requests {
			select {
			case jobs <- priceHistoryJob{request: request}:
			case <-ctx.Done():
				slog.WarnContext(ctx, "Context cancelled while queueing price history jobs")
				return
			}
		}
	}()

	// Wait for all workers to finish
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	finalResults := make(map[string]*PriceHistoryBatchResult)
	successCount := 0
	for result := range results {
		finalResults[result.address] = result.result
		if result.result.Success {
			successCount++
		}
	}

	slog.InfoContext(ctx, "Completed batch price history retrieval",
		"total_requested", len(requests),
		"successful", successCount,
		"failed", len(requests)-successCount)

	return finalResults, nil
}

// fetchSinglePriceHistory fetches price history for a single address (called by worker goroutines)
func (s *Service) fetchSinglePriceHistory(ctx context.Context, request PriceHistoryBatchRequest, workerID int) *PriceHistoryBatchResult {
	slog.DebugContext(ctx, "Worker fetching price history",
		"worker_id", workerID,
		"address", request.Address,
		"type", request.Config.HistoryType)

	// Check cache first
	cacheKey := fmt.Sprintf("%s-%s", request.Address, request.Config.HistoryType)
	if cachedData, found := s.cache.Get(cacheKey); found {
		slog.DebugContext(ctx, "Worker found cached price history", "worker_id", workerID, "address", request.Address)
		return &PriceHistoryBatchResult{
			Data:         cachedData,
			Success:      true,
			ErrorMessage: "",
		}
	}

	// Parse the end time of the window (typically "now")
	windowEnd, err := time.Parse(time.RFC3339, request.Time)
	if err != nil {
		slog.ErrorContext(ctx, "Worker failed to parse end time", "worker_id", workerID, "address", request.Address, "endTime", request.Time, "error", err)
		return &PriceHistoryBatchResult{
			Data:         nil,
			Success:      false,
			ErrorMessage: fmt.Sprintf("failed to parse end time: %v", err),
		}
	}

	// Calculate time window: [windowEnd - DefaultViewDuration, windowEnd]
	windowStart := windowEnd.Add(-request.Config.DefaultViewDuration)

	// Round the times to appropriate granularity
	roundedWindowStart := roundDateDown(windowStart, request.Config.Rounding)
	roundedWindowEnd := roundDateDown(windowEnd, request.Config.Rounding)

	// Ensure we have at least a minimum time span to get multiple data points
	minTimeSpan := request.Config.DefaultViewDuration / 4
	if roundedWindowEnd.Sub(roundedWindowStart) < minTimeSpan {
		roundedWindowStart = roundedWindowEnd.Add(-request.Config.DefaultViewDuration)
		slog.DebugContext(ctx, "Worker adjusted time range for minimum span",
			"worker_id", workerID,
			"address", request.Address,
			"originalStart", roundedWindowStart.Add(request.Config.DefaultViewDuration),
			"adjustedStart", roundedWindowStart,
			"minTimeSpan", minTimeSpan)
	}

	params := birdeye.PriceHistoryParams{
		Address:     request.Address,
		AddressType: request.AddressType,
		HistoryType: request.Config.BirdeyeType,
		TimeFrom:    roundedWindowStart,
		TimeTo:      roundedWindowEnd,
	}

	result, err := s.birdeyeClient.GetPriceHistory(ctx, params)
	if err != nil {
		slog.ErrorContext(ctx, "Worker failed to fetch price history from birdeye",
			"worker_id", workerID,
			"address", request.Address,
			"params", fmt.Sprintf("%+v", params),
			"error", err)
		return &PriceHistoryBatchResult{
			Data:         nil,
			Success:      false,
			ErrorMessage: fmt.Sprintf("failed to fetch price history: %v", err),
		}
	}

	// Cache the result
	s.cache.Set(cacheKey, result, request.Config.Rounding)

	slog.DebugContext(ctx, "Worker successfully fetched price history",
		"worker_id", workerID,
		"address", request.Address,
		"items_count", len(result.Data.Items))

	return &PriceHistoryBatchResult{
		Data:         result,
		Success:      true,
		ErrorMessage: "",
	}
}

func roundDateDown(dateToRound time.Time, granularityMinutes time.Duration) time.Time {
	if granularityMinutes <= 0 {
		slog.Warn("roundDateDown called with zero granularityMinutes, returning original time", "dateToRound", dateToRound)
		return dateToRound
	}

	// Convert granularity to minutes for proper rounding
	granularityInMinutes := int(granularityMinutes / time.Minute)
	if granularityInMinutes <= 0 {
		granularityInMinutes = 1 // Default to 1 minute if invalid
	}

	// Truncate to the hour first, then add back the rounded minutes
	truncatedToHour := dateToRound.Truncate(time.Hour)

	// Get the minutes past the hour
	minutesPastHour := dateToRound.Minute()

	// Round down to the nearest granularity
	roundedMinutes := (minutesPastHour / granularityInMinutes) * granularityInMinutes

	return truncatedToHour.Add(time.Duration(roundedMinutes) * time.Minute)
}
