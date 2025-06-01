package price

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	birdeyeclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye/mocks" // Renamed alias
	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks" // Renamed alias
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"               // Import dbDataStoreMocks
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGetPriceHistory(t *testing.T) {
	ctx := context.Background()
	mockBirdeyeClient := birdeyeclientmocks.NewMockClientAPI(t)
	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockDbStore := dbDataStoreMocks.NewMockStore(t)
	mockCoinRepo := dbDataStoreMocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)

	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe() // Changed to Maybe
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe() // Changed to Maybe
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe() // Changed to Maybe
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe() // Changed to Maybe

	service := NewService(mockBirdeyeClient, mockJupiterClient, mockDbStore)

	coinAddress := "testCoinAddress"
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
		mockBirdeyeClient.On("GetPriceHistory", ctx, mock.MatchedBy(func(params birdeye.PriceHistoryParams) bool {
			return params.Address == coinAddress && params.HistoryType == historyType && params.AddressType == addressType
		})).Return(expectedHistoryResponse, nil).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.NoError(t, err)
		assert.Equal(t, expectedHistoryResponse, history)
		mockBirdeyeClient.AssertExpectations(t)
	})

	t.Run("Success - Debug Mode", func(t *testing.T) {
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)
		history, err := service.GetPriceHistory(debugCtx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.NoError(t, err)
		assert.NotNil(t, history)
		assert.True(t, history.Success)
	})

	t.Run("BirdeyeClient Error - No Debug", func(t *testing.T) {
		mockBirdeyeClient.On("GetPriceHistory", ctx, mock.MatchedBy(func(params birdeye.PriceHistoryParams) bool {
			return params.Address == coinAddress && params.HistoryType == historyType && params.AddressType == addressType
		})).Return(nil, errors.New("birdeye error")).Once()

		history, err := service.GetPriceHistory(ctx, coinAddress, historyType, timeFromStr, timeToStr, addressType)

		assert.Error(t, err)
		assert.Nil(t, history)
		assert.Contains(t, err.Error(), "birdeye error")
		mockBirdeyeClient.AssertExpectations(t)
	})

	t.Run("Invalid TimeFormat Error - No Debug", func(t *testing.T) {
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
	mockBirdeyeClient := birdeyeclientmocks.NewMockClientAPI(t)
	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockDbStore := dbDataStoreMocks.NewMockStore(t)
	mockCoinRepo := dbDataStoreMocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)

	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe() // Changed to Maybe
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe() // Changed to Maybe
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe() // Changed to Maybe
	mockRawCoinRepo.On("List", mock.Anything).Return([]model.RawCoin{}, nil).Maybe() // Changed to Maybe

	service := NewService(mockBirdeyeClient, mockJupiterClient, mockDbStore)
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
		mockBirdeyeClient.AssertNotCalled(t, "GetPriceHistory", mock.Anything, mock.Anything)
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
