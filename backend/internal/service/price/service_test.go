package price

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	// Added for PublicKey type

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	birdeyeMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye/mocks" // Added for NewTokenInfo type
	jupiterMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks" // Added for NewTokenInfo type

	// Changed from jupitermocks to jupiterclientmocks
	dbmocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPriceHistoryCache is a mock implementation of PriceHistoryCache
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

func TestGetPriceHistory(t *testing.T) {
	ctx := context.Background()
	// Use generated mocks
	mockBirdeyeClient := birdeyeMocks.NewMockClientAPI(t)
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockDbStore := dbmocks.NewMockStore(t)
	mockCoinRepo := dbmocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbmocks.NewMockRepository[model.RawCoin](t)

	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	mockCache := new(MockPriceHistoryCache)
	mockCache.On("Get", mock.Anything).Return(nil, false).Maybe()
	mockCache.On("Set", mock.Anything, mock.Anything, mock.Anything).Return().Maybe()

	service := NewService(mockBirdeyeClient, mockJupiterClient, mockDbStore, mockCache)

	coinAddress := "testCoinAddress"
	timeStr := time.Now().Format(time.RFC3339)
	addressType := "token"
	config := TimeframeConfigMap[pb.GetPriceHistoryRequest_ONE_HOUR]

	t.Run("Success - No Debug", func(t *testing.T) {
		expectedHistoryResponse := &birdeye.PriceHistory{
			Data: birdeye.PriceHistoryData{
				Items: []birdeye.PriceHistoryItem{
					{UnixTime: time.Now().Unix(), Value: 100.0},
					{UnixTime: time.Now().Add(-1 * time.Hour).Unix(), Value: 90.0},
				},
			},
			Success: true,
		}

		// Parse the time string to calculate expected parameters
		parsedTime, _ := time.Parse(time.RFC3339, timeStr)
		timeFrom := parsedTime.Add(-config.DefaultViewDuration)
		timeTo := parsedTime
		roundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
		roundedTimeTo := roundDateDown(timeTo, config.Rounding)

		expectedBirdeyeParams := birdeye.PriceHistoryParams{
			Address:     coinAddress,
			AddressType: addressType,
			HistoryType: config.BirdeyeType,
			TimeFrom:    roundedTimeFrom,
			TimeTo:      roundedTimeTo,
		}

		mockBirdeyeClient.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedHistoryResponse, nil).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, config, timeStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedHistoryResponse, history)
		mockBirdeyeClient.AssertExpectations(t)
	})

	t.Run("Success - Debug Mode", func(t *testing.T) {
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)

		history, err := service.GetPriceHistory(debugCtx, coinAddress, config, timeStr, addressType)

		assert.NoError(t, err)
		assert.NotNil(t, history)
		assert.True(t, history.Success)
		assert.NotEmpty(t, history.Data.Items)
	})

	t.Run("BirdeyeClient Error - No Debug", func(t *testing.T) {
		parsedTime, _ := time.Parse(time.RFC3339, timeStr)
		timeFrom := parsedTime.Add(-config.DefaultViewDuration)
		timeTo := parsedTime
		roundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
		roundedTimeTo := roundDateDown(timeTo, config.Rounding)

		expectedBirdeyeParams := birdeye.PriceHistoryParams{
			Address:     coinAddress,
			AddressType: addressType,
			HistoryType: config.BirdeyeType,
			TimeFrom:    roundedTimeFrom,
			TimeTo:      roundedTimeTo,
		}

		mockBirdeyeClient.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(nil, errors.New("birdeye error")).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, config, timeStr, addressType)

		assert.Error(t, err)
		assert.Nil(t, history)
		assert.Contains(t, err.Error(), "failed to fetch price history from birdeye: birdeye error")
		mockBirdeyeClient.AssertExpectations(t)
	})

	t.Run("Invalid TimeFormat Error - No Debug", func(t *testing.T) {
		_, err := service.GetPriceHistory(ctx, coinAddress, config, "invalid-time-format", addressType)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse time_from")
	})
}

func TestGetCoinPrices(t *testing.T) {
	ctx := context.Background()

	// Use generated mocks
	mockBirdeyeClient := birdeyeMocks.NewMockClientAPI(t)
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockDbStore := dbmocks.NewMockStore(t)
	mockCoinRepo := dbmocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbmocks.NewMockRepository[model.RawCoin](t)

	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	mockCache := new(MockPriceHistoryCache)
	mockCache.On("Get", mock.Anything).Return(nil, false).Maybe()
	mockCache.On("Set", mock.Anything, mock.Anything, mock.Anything).Return().Maybe()

	service := NewService(mockBirdeyeClient, mockJupiterClient, mockDbStore, mockCache)
	coinAddresses := []string{"coin1", "coin2"}

	t.Run("Success - No Debug", func(t *testing.T) {
		expectedPrices := map[string]float64{
			"coin1": 10.0,
			"coin2": 20.0,
		}
		mockJupiterClient.On("GetCoinPrices", ctx, coinAddresses).Return(expectedPrices, nil).Once()

		prices, err := service.GetCoinPrices(ctx, coinAddresses)

		assert.NoError(t, err)
		assert.Equal(t, expectedPrices, prices)
		mockJupiterClient.AssertExpectations(t)
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
		mockJupiterClient.On("GetCoinPrices", ctx, coinAddresses).Return(nil, errors.New("jupiter error")).Once()

		prices, err := service.GetCoinPrices(ctx, coinAddresses)

		assert.Error(t, err)
		assert.Nil(t, prices)
		assert.EqualError(t, err, "failed to get coin prices from jupiter: jupiter error")
		mockJupiterClient.AssertExpectations(t)
	})

	t.Run("Empty Coin Addresses - No Debug", func(t *testing.T) {
		mockJupiterClient.On("GetCoinPrices", ctx, []string{}).Return(nil, errors.New("no token addresses provided")).Once()

		prices, err := service.GetCoinPrices(ctx, []string{})

		assert.Error(t, err)
		assert.Nil(t, prices)
		assert.EqualError(t, err, "failed to get coin prices from jupiter: no token addresses provided")
		mockJupiterClient.AssertExpectations(t)
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
	mockDbStore := dbmocks.NewMockStore(t)
	mockCoinRepo := dbmocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbmocks.NewMockRepository[model.RawCoin](t)

	// Setup mock store interactions
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe()

	address := "cacheTestTokenAddress"
	addressType := "token"
	config := TimeframeConfigMap[pb.GetPriceHistoryRequest_ONE_HOUR]
	timeStr := "2023-04-01T10:35:00Z"

	// Parse time and calculate expected parameters
	parsedTime, _ := time.Parse(time.RFC3339, timeStr)
	timeFrom := parsedTime.Add(-config.DefaultViewDuration)
	timeTo := parsedTime
	expectedRoundedTimeFrom := roundDateDown(timeFrom, config.Rounding)
	expectedRoundedTimeTo := roundDateDown(timeTo, config.Rounding)

	expectedCacheKey := fmt.Sprintf("%s-%s", address, config.HistoryType)
	expectedCacheDuration := config.Rounding

	expectedPriceHistory := &birdeye.PriceHistory{
		Data: birdeye.PriceHistoryData{
			Items: []birdeye.PriceHistoryItem{{UnixTime: expectedRoundedTimeFrom.Unix(), Value: 150.5}},
		},
		Success: true,
	}

	expectedBirdeyeParams := birdeye.PriceHistoryParams{
		Address:     address,
		AddressType: addressType,
		HistoryType: config.BirdeyeType,
		TimeFrom:    expectedRoundedTimeFrom,
		TimeTo:      expectedRoundedTimeTo,
	}

	t.Run("CacheMiss_FetchFromSourceAndStore", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := birdeyeMocks.NewMockClientAPI(t)
		mockJupiter := jupiterMocks.NewMockClientAPI(t)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedPriceHistory, nil).Once()
		mockCache.On("Set", expectedCacheKey, expectedPriceHistory, expectedCacheDuration).Return().Once()

		result, err := service.GetPriceHistory(ctx, address, config, timeStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		mockBirdeye.AssertExpectations(t)
	})

	t.Run("CacheHit_ReturnFromCache", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := birdeyeMocks.NewMockClientAPI(t)
		mockJupiter := jupiterMocks.NewMockClientAPI(t)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(expectedPriceHistory, true).Once()

		result, err := service.GetPriceHistory(ctx, address, config, timeStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		// Ensure birdeye client was not called when cache hit
		mockBirdeye.AssertNotCalled(t, "GetPriceHistory", mock.Anything, mock.Anything)
	})

	t.Run("CacheExpired_FetchFromSourceAndStore", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := birdeyeMocks.NewMockClientAPI(t)
		mockJupiter := jupiterMocks.NewMockClientAPI(t)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once() // Simulates expired or not found
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(expectedPriceHistory, nil).Once()
		mockCache.On("Set", expectedCacheKey, expectedPriceHistory, expectedCacheDuration).Return().Once()

		result, err := service.GetPriceHistory(ctx, address, config, timeStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedPriceHistory, result)
		mockCache.AssertExpectations(t)
		mockBirdeye.AssertExpectations(t)
	})

	t.Run("FetchError_NoCacheSetAndErrorPropagated", func(t *testing.T) {
		mockCache := new(MockPriceHistoryCache)
		mockBirdeye := birdeyeMocks.NewMockClientAPI(t)
		mockJupiter := jupiterMocks.NewMockClientAPI(t)

		service := NewService(mockBirdeye, mockJupiter, mockDbStore, mockCache)
		fetchErr := errors.New("birdeye client error")

		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		mockBirdeye.On("GetPriceHistory", ctx, expectedBirdeyeParams).Return(nil, fetchErr).Once()

		result, err := service.GetPriceHistory(ctx, address, config, timeStr, addressType)

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
		granularityMinutes time.Duration
		expected           time.Time
	}{
		{
			name:               "Round down to 5 minutes",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 5 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.UTC),
		},
		{
			name:               "Already rounded (5 minutes)",
			dateToRound:        time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC),
			granularityMinutes: 5 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 35, 0, 0, time.UTC),
		},
		{
			name:               "Round down to 1 minute",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 1 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.UTC),
		},
		{
			name:               "Round down to 60 minutes (hour)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: 60 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.UTC),
		},
		{
			name:               "Zero granularity (should return original time, effectively)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 123, time.UTC),
			granularityMinutes: 0,
			// Code returns dateToRound as is when granularityMinutes is 0.
			expected: time.Date(2023, 1, 1, 10, 37, 45, 123, time.UTC),
		},
		{
			name:               "Negative granularity (should return original time)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
			granularityMinutes: -5 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 37, 45, 0, time.UTC),
		},
		{
			name:               "Round down with different location (PDT)",
			dateToRound:        time.Date(2023, 1, 1, 10, 37, 45, 0, time.FixedZone("PDT", -7*60*60)),
			granularityMinutes: 5 * time.Minute,
			expected:           time.Date(2023, 1, 1, 10, 37, 0, 0, time.FixedZone("PDT", -7*60*60)),
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
