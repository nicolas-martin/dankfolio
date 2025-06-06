package price

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	solanago "github.com/gagliardetto/solana-go" // Added for PublicKey type
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter" // Added for NewTokenInfo type
	dbmocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPriceHistoryCache is a mock implementation of PriceHistoryCache for testing.
type MockPriceHistoryCache struct {
	mock.Mock
}

func (m *MockPriceHistoryCache) Get(key string) (*birdeye.PriceHistory, bool) {
	args := m.Called(key)
	if args.Get(0) == nil {
		return nil, args.Bool(1)
	}
	return args.Get(0).(*birdeye.PriceHistory), args.Bool(1)
}

func (m *MockPriceHistoryCache) Set(key string, data *birdeye.PriceHistory, expiration time.Duration) {
	m.Called(key, data, expiration)
}

// MockBirdeyeClient is a mock implementation of birdeye.ClientAPI
type MockBirdeyeClient struct {
	mock.Mock
}

func (m *MockBirdeyeClient) GetPriceHistory(ctx context.Context, params birdeye.PriceHistoryParams) (*birdeye.PriceHistory, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*birdeye.PriceHistory), args.Error(1)
}

// MockJupiterClient for NewService (can be basic if not used in these specific tests)
type MockJupiterClient struct {
	mock.Mock
}

func (m *MockJupiterClient) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {
	args := m.Called(ctx, tokenAddresses)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]float64), args.Error(1)
}

// Adding GetNewCoins to satisfy the jupiter.ClientAPI interface expected by NewService
func (m *MockJupiterClient) GetNewCoins(ctx context.Context, params *jupiter.NewCoinsParams) ([]*jupiter.NewTokenInfo, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*jupiter.NewTokenInfo), args.Error(1)
}

// Adding CreateSwapTransaction to fully satisfy the jupiter.ClientAPI interface
func (m *MockJupiterClient) CreateSwapTransaction(ctx context.Context, quoteResp []byte, userPublicKey solanago.PublicKey, feeAccount string) (string, error) {
	args := m.Called(ctx, quoteResp, userPublicKey, feeAccount)
	// Return types are string and error
	return args.String(0), args.Error(1)
}

// Adding GetAllCoins to fully satisfy the jupiter.ClientAPI interface
func (m *MockJupiterClient) GetAllCoins(ctx context.Context) (*jupiter.CoinListResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.CoinListResponse), args.Error(1)
}

// Adding GetCoinInfo to fully satisfy the jupiter.ClientAPI interface
func (m *MockJupiterClient) GetCoinInfo(ctx context.Context, address string) (*jupiter.CoinListInfo, error) {
	args := m.Called(ctx, address)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.CoinListInfo), args.Error(1)
}

// Adding GetQuote to fully satisfy the jupiter.ClientAPI interface
func (m *MockJupiterClient) GetQuote(ctx context.Context, params jupiter.QuoteParams) (*jupiter.QuoteResponse, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.QuoteResponse), args.Error(1)
}

func TestGetPriceHistory(t *testing.T) {
	ctx := context.Background()
	// Use local mocks
	mockBirdeyeClientOld := new(MockBirdeyeClient) // Changed from birdeyeclientmocks
	mockJupiterClientOld := new(MockJupiterClient) // Changed from jupiterclientmocks
	mockDbStoreOld := dbmocks.NewMockStore(t)
	mockCoinRepo := dbmocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbmocks.NewMockRepository[model.RawCoin](t)

	mockDbStoreOld.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStoreOld.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	mockCacheOld := new(MockPriceHistoryCache)
	// These calls are .Maybe() because these older tests might not always trigger cache interactions,
	// especially if they error out before reaching caching logic, or if they test paths not involving GetPriceHistory.
	mockCacheOld.On("Get", mock.Anything).Return(nil, false).Maybe()
	mockCacheOld.On("Set", mock.Anything, mock.Anything, mock.Anything).Return().Maybe()

	service := NewService(mockBirdeyeClientOld, mockJupiterClientOld, mockDbStoreOld, mockCacheOld)

	coinAddress := "testCoinAddress"
	// Using a fixed time for predictable rounding and parameter matching.
	// Example: timeFrom := time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC)
	// For simplicity, we'll keep time.Now() for old tests as they don't test rounding.
	timeFrom := time.Now().Add(-24 * time.Hour)
	timeToStr := time.Now().Format(time.RFC3339)
	timeFromStr := timeFrom.Format(time.RFC3339)
	historyType := "1H"
	addressType := "token"

	t.Run("Success - No Debug", func(t *testing.T) {
		expectedHistoryResponse := &birdeye.PriceHistory{
			Data: birdeye.PriceHistoryData{
				Items: []birdeye.PriceHistoryItem{
					{UnixTime: time.Now().Unix(), Value: 100.0},
					{UnixTime: timeFrom.Unix(), Value: 90.0},
				},
			},
			Success: true,
		}
		// Corrected: Use mockBirdeyeClientOld
		// Also, the GetPriceHistory now uses TIMEFRAME_CONFIG.
		// For this old test, we assume "1H" is a valid key and it maps to a granularity.
		// The cache key and birdeye params will be different.
		// This test needs to be more specific or accept broader mock matching if it's not testing caching.
		// For now, let's assume it's a general success test and the exact params might change.
		// The historyType "1H" will be used by the service to find config.
		tfConfig, _ := TIMEFRAME_CONFIG[historyType] // historyType is "1H"

		// Declare variables for parsed times first
		parsedTFrom, _ := time.Parse(time.RFC3339, timeFromStr)
		parsedTTo, _ := time.Parse(time.RFC3339, timeToStr)

		// Now, correctly initialize expectedBirdeyeParams in one go
		expectedBirdeyeParams := birdeye.PriceHistoryParams{
			Address:     coinAddress,
			AddressType: addressType,
			HistoryType: tfConfig.Granularity,
			TimeFrom:    roundDateDown(parsedTFrom, tfConfig.RoundingMinutes),
			TimeTo:      roundDateDown(parsedTTo, tfConfig.RoundingMinutes),
		}
		mockBirdeyeClientOld.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedHistoryResponse, nil).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedHistoryResponse, history)
		mockBirdeyeClientOld.AssertExpectations(t) // Corrected
	})

	t.Run("Success - Debug Mode", func(t *testing.T) {
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)
		// historyType "1H" is passed. The service will use it as a key for TIMEFRAME_CONFIG.
		// loadMockPriceHistory will be called with "1H".
		// Cache will be set with key "testCoinAddress-1H".
		history, err := service.GetPriceHistory(debugCtx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.NoError(t, err)
		assert.NotNil(t, history)
		assert.True(t, history.Success)
		// Optionally, assert cache Set was called if important for debug path test
		// mockCacheOld.AssertCalled(t, "Set", fmt.Sprintf("%s-%s", coinAddress, historyType), history, mock.Anything)
	})

	t.Run("BirdeyeClient Error - No Debug", func(t *testing.T) {
		tfConfig, _ := TIMEFRAME_CONFIG[historyType]
		expectedBirdeyeParams := birdeye.PriceHistoryParams{
			Address:     coinAddress,
			AddressType: addressType,
			HistoryType: tfConfig.Granularity,
			// Values for TimeFrom and TimeTo will be set next
		}
		// Calculate rounded times before initializing the struct for mock
		parsedTFromForErrorCase, _ := time.Parse(time.RFC3339, timeFromStr) // Use timeFromStr for consistency
		parsedTToForErrorCase, _ := time.Parse(time.RFC3339, timeToStr)
		// Assign TimeFrom and TimeTo to the existing struct variable
		expectedBirdeyeParams.TimeFrom = roundDateDown(parsedTFromForErrorCase, tfConfig.RoundingMinutes)
		expectedBirdeyeParams.TimeTo = roundDateDown(parsedTToForErrorCase, tfConfig.RoundingMinutes)

		mockBirdeyeClientOld.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(nil, errors.New("birdeye error")).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.Error(t, err)
		assert.Nil(t, history)
		// Error message is now wrapped by service
		assert.Contains(t, err.Error(), "failed to fetch price history from birdeye: birdeye error")
		mockBirdeyeClientOld.AssertExpectations(t) // Corrected
	})

	t.Run("Invalid TimeFormat Error - No Debug", func(t *testing.T) {
		// Cache will be missed. This test primarily checks time parsing before cache or client calls.
		_, err := service.GetPriceHistory(ctx, coinAddress, historyType, "invalid-time-format", timeToStr, addressType)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse time_from")

		_, err = service.GetPriceHistory(ctx, coinAddress, historyType, timeFromStr, "invalid-time-format", addressType)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse time_to")
	})
}

func TestGetCoinPrices(t *testing.T) {
	ctx := context.Background()
	// Remove redundant declarations: mockBirdeyeClient, mockJupiterClient, mockDbStore, mockCoinRepo, mockRawCoinRepo
	// These were causing "declared and not used" or "no new variables on left side of :=" errors.
	// We will use the mock...Old versions as intended for these older tests.

	// Correctly initialize mockBirdeyeClientOld and mockJupiterClientOld using local mocks
	mockBirdeyeClientOld := new(MockBirdeyeClient)
	mockJupiterClientOld := new(MockJupiterClient)
	mockDbStoreOld := dbmocks.NewMockStore(t) // Remains the same type from dbmocks
	mockCoinRepoForOldTest := dbmocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepoForOldTest := dbmocks.NewMockRepository[model.RawCoin](t)

	mockDbStoreOld.On("Coins").Return(mockCoinRepoForOldTest).Maybe()
	mockCoinRepoForOldTest.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStoreOld.On("RawCoins").Return(mockRawCoinRepoForOldTest).Maybe()
	mockRawCoinRepoForOldTest.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	mockCacheOld := new(MockPriceHistoryCache)
	mockCacheOld.On("Get", mock.Anything).Return(nil, false).Maybe()
	mockCacheOld.On("Set", mock.Anything, mock.Anything, mock.Anything).Return().Maybe()

	service := NewService(mockBirdeyeClientOld, mockJupiterClientOld, mockDbStoreOld, mockCacheOld)
	coinAddresses := []string{"coin1", "coin2"}

	t.Run("Success - No Debug", func(t *testing.T) {
		expectedPrices := map[string]float64{
			"coin1": 10.0,
			"coin2": 20.0,
		}
		mockJupiterClientOld.On("GetCoinPrices", ctx, coinAddresses).Return(expectedPrices, nil).Once()

		prices, err := service.GetCoinPrices(ctx, coinAddresses)

		assert.NoError(t, err)
		assert.Equal(t, expectedPrices, prices)
		mockJupiterClientOld.AssertExpectations(t)
		mockBirdeyeClientOld.AssertNotCalled(t, "GetPriceHistory", mock.Anything, mock.Anything)
	})

	t.Run("Success - Debug Mode", func(t *testing.T) {
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)

		prices, err := service.GetCoinPrices(debugCtx, coinAddresses)

		assert.NoError(t, err)
		assert.NotNil(t, prices)
		assert.Len(t, prices, len(coinAddresses))
		for _, addr := range coinAddresses {
			_, ok := prices[addr]
			assert.True(t, ok, "price for %s should be in the map", addr)
		}
	})

	t.Run("Jupiter Error - No Debug", func(t *testing.T) {
		mockJupiterClientOld.On("GetCoinPrices", ctx, coinAddresses).Return(nil, errors.New("jupiter error")).Once()

		prices, err := service.GetCoinPrices(ctx, coinAddresses)

		assert.Error(t, err)
		assert.Nil(t, prices)
		assert.EqualError(t, err, "failed to get coin prices from jupiter: jupiter error")
		mockJupiterClientOld.AssertExpectations(t)
	})

	t.Run("Empty Coin Addresses - No Debug", func(t *testing.T) {
		mockJupiterClientOld.On("GetCoinPrices", ctx, []string{}).Return(nil, errors.New("no token addresses provided")).Once()

		prices, err := service.GetCoinPrices(ctx, []string{})

		assert.Error(t, err)
		assert.Nil(t, prices)
		assert.EqualError(t, err, "failed to get coin prices from jupiter: no token addresses provided")
		mockJupiterClientOld.AssertExpectations(t)
	})

	t.Run("Empty Coin Addresses - Debug Mode", func(t *testing.T) {
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)
		prices, err := service.GetCoinPrices(debugCtx, []string{})
		assert.NoError(t, err)
		assert.Empty(t, prices)
	})
}

func TestPriceService_GetPriceHistory_CachingBehavior(t *testing.T) {
	ctx := context.Background()
	mockDbStore := dbmocks.NewMockStore(t)                         // Use NewMockStore(t) for consistency
	mockCoinRepo := dbmocks.NewMockRepository[model.Coin](t)       // Corrected type
	mockRawCoinRepo := dbmocks.NewMockRepository[model.RawCoin](t) // Corrected type

	// Setup mock store interactions for NewService's populateAddressToSymbolCache
	// Using .Maybe() because sync.Once might prevent these calls if NewService was called in prior tests.
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	address := "cacheTestTokenAddress"
	// historyType now acts as timeframeKey like "1H", "4H" etc.
	// Let's use "1H" for a specific test case.
	timeframeKey := "1H"
	addressType := "token"

	// Define original time strings for the request
	timeFromStrOriginal := "2023-04-01T10:35:00Z" // Not perfectly rounded
	timeToStrOriginal := "2023-04-01T11:55:00Z"   // Not perfectly rounded

	configEntry := TIMEFRAME_CONFIG[timeframeKey]
	expectedCacheDuration := time.Duration(configEntry.RoundingMinutes) * time.Minute
	expectedBirdeyeGranularity := configEntry.Granularity

	// Calculate expected rounded times for Birdeye call
	parsedTimeFromOriginal, _ := time.Parse(time.RFC3339, timeFromStrOriginal)
	parsedTimeToOriginal, _ := time.Parse(time.RFC3339, timeToStrOriginal)
	expectedRoundedTimeFrom := roundDateDown(parsedTimeFromOriginal, configEntry.RoundingMinutes)
	expectedRoundedTimeTo := roundDateDown(parsedTimeToOriginal, configEntry.RoundingMinutes)

	expectedCacheKey := fmt.Sprintf("%s-%s", address, timeframeKey)

	expectedPriceHistory := &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: []birdeye.PriceHistoryItem{{UnixTime: expectedRoundedTimeFrom.Unix(), Value: 150.5}},
		},
		Success: true,
	}

	expectedBirdeyeParams := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: expectedBirdeyeGranularity,
		TimeFrom:    expectedRoundedTimeFrom,
		TimeTo:      expectedRoundedTimeTo,
	}

	t.Run("CacheMiss_FetchFromSourceAndStore", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := new(MockBirdeyeClient)
		mockJupiter := new(MockJupiterClient)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedPriceHistory, nil).Once()
		mockCache.On("Set", expectedCacheKey, expectedPriceHistory, expectedCacheDuration).Return().Once()

		result, err := service.GetPriceHistory(ctx, address, timeframeKey, timeFromStrOriginal, timeToStrOriginal, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		mockBirdeye.AssertExpectations(t)
	})

	t.Run("CacheHit_ReturnFromCache", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := new(MockBirdeyeClient)
		mockJupiter := new(MockJupiterClient)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(expectedPriceHistory, true).Once()

		result, err := service.GetPriceHistory(ctx, address, timeframeKey, timeFromStrOriginal, timeToStrOriginal, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		mockBirdeye.AssertNotCalled(t, "GetPriceHistory", mock.Anything, mock.Anything)
	})

	t.Run("CacheExpired_FetchFromSourceAndStore", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := new(MockBirdeyeClient)
		mockJupiter := new(MockJupiterClient)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once() // Simulates expired or not found
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedPriceHistory, nil).Once()
		mockCache.On("Set", expectedCacheKey, expectedPriceHistory, expectedCacheDuration).Return().Once()

		result, err := service.GetPriceHistory(ctx, address, timeframeKey, timeFromStrOriginal, timeToStrOriginal, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		mockBirdeye.AssertExpectations(t)
	})

	t.Run("FetchError_NoCacheSetAndErrorPropagated", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := new(MockBirdeyeClient)
		mockJupiter := new(MockJupiterClient)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)
		fetchErr := errors.New("birdeye client error")

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(nil, fetchErr).Once()

		result, err := service.GetPriceHistory(ctx, address, timeframeKey, timeFromStrOriginal, timeToStrOriginal, addressType)

		assert.Error(t, err)
		assert.Nil(t, result)
		expectedWrappedErrorMsg := fmt.Sprintf("failed to fetch price history from birdeye: %s", fetchErr.Error())
		assert.EqualError(t, err, expectedWrappedErrorMsg)
		assert.True(t, errors.Is(err, fetchErr), "Original error not wrapped correctly")

		mockCache.AssertExpectations(t)
		mockBirdeye.AssertExpectations(t)
		mockCache.AssertNotCalled(t, "Set", mock.Anything, mock.Anything, mock.Anything)
	})
}

func TestRoundDateDown(t *testing.T) {
	tests := []struct {
		name               string
		dateToRound        time.Time
		granularityMinutes int
		expected           time.Time
	}{
		{
			name:               "Round down to 5 minutes",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 5,
			expected:           time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC),
		},
		{
			name:               "Already rounded (5 minutes)",
			dateToRound:        time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC),
			granularityMinutes: 5,
			expected:           time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC),
		},
		{
			name:               "Round down to 1 minute",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 1,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.UTC),
		},
		{
			name:               "Round down to 60 minutes (hour)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 60,
			expected:           time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC),
		},
		{
			name:               "Zero granularity (should return original time, effectively)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 123, time.UTC),
			granularityMinutes: 0,
			// Code returns dateToRound as is when granularityMinutes is 0.
			expected: time.Date(2023, 1, 1, 10, 37, 45, 123, time.UTC),
		},
		{
			name:               "Negative granularity (should default to 1 minute)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: -5,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.UTC),
		},
		{
			name:               "Round down with different location (PDT)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.FixedZone("PDT", -7*60*60)),
			granularityMinutes: 5,
			expected:           time.Date(2023, 1, 1, 10, 35, 0, 0, time.FixedZone("PDT", -7*60*60)),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := roundDateDown(tt.dateToRound, tt.granularityMinutes)
			assert.Equal(t, tt.expected, actual)
			// Also check location if important, though .Equal should check this for time.Time
			assert.Equal(t, tt.expected.Location().String(), actual.Location().String())
		})
	}
}
