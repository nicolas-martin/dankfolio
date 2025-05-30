package coin

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	offchainClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

func setupCoinServiceTest(t *testing.T) (
	*Service,
	*Config,
	*jupiterclientmocks.MockClientAPI,
	*offchainClientMocks.MockClientAPI,
	*dbDataStoreMocks.MockStore,
	*dbDataStoreMocks.MockRepository[model.Coin],
	*dbDataStoreMocks.MockRepository[model.RawCoin],
) {
	cfg := &Config{
		NewCoinsFetchInterval: 0,                                   // Disable automatic fetching for tests
		SolanaRPCEndpoint:     "http://invalid-endpoint-for-tests", // Invalid endpoint to make Solana calls fail
	}

	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockOffchainClient := offchainClientMocks.NewMockClientAPI(t)
	mockStore := dbDataStoreMocks.NewMockStore(t)
	mockCoinRepo := dbDataStoreMocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)

	// Set up default mock behaviors for service initialization
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()

	// Mock for initial loadOrRefreshData call in NewService
	mockStore.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Run(func(args mock.Arguments) {
			// For initialization, just return nil to skip the refresh logic
			// Individual tests will set up their own transaction expectations
		}).Return(nil).Maybe()

	// Mock for initial trending coins check in loadOrRefreshData
	mockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{
		{MintAddress: "existing", LastUpdated: time.Now().Format(time.RFC3339)}, // Fresh data to skip refresh
	}, nil).Maybe()

	service := NewService(cfg, &http.Client{}, mockJupiterClient, mockStore)
	service.offchainClient = mockOffchainClient // Set mock offchain client on service

	return service, cfg, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, mockRawCoinRepo
}

func TestGetCoinByID_Success(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)

	expectedID := uint64(123)
	idStr := strconv.FormatUint(expectedID, 10)
	expectedCoin := &model.Coin{ID: expectedID, MintAddress: "mintForID123", Name: "Test Coin by ID"}

	mockStore.On("Coins").Return(mockCoinRepo) // Ensure Coins() is expected
	mockCoinRepo.On("Get", ctx, idStr).Return(expectedCoin, nil).Once()

	coin, err := service.GetCoinByID(ctx, idStr)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByID_InvalidFormat(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, _, _ := setupCoinServiceTest(t)
	idStr := "not_a_number"

	coin, err := service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.Nil(t, coin)
	assert.Contains(t, err.Error(), "invalid coin ID format")
}

func TestGetCoinByID_NotFound(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	idStr := "456"

	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("Get", ctx, idStr).Return(nil, db.ErrNotFound).Once()

	coin, err := service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.True(t, errors.Is(err, db.ErrNotFound))
	assert.Nil(t, coin)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByMintAddress_FoundInStore(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "testMintAddress"
	expectedCoin := &model.Coin{ID: 1, MintAddress: mintAddress, Name: "Test Coin by Mint"}

	// Clear any existing expectations and set up specific ones for this test
	mockStore.ExpectedCalls = nil
	mockCoinRepo.ExpectedCalls = nil

	mockStore.On("Coins").Return(mockCoinRepo).Once()
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(expectedCoin, nil).Once()

	coin, err := service.GetCoinByMintAddress(ctx, mintAddress)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByMintAddress_NotFound_EnrichmentSuccess_Create(t *testing.T) {
	ctx := context.Background()
	service, _, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "unknownMint"

	// Clear any existing expectations and set up specific ones for this test
	mockStore.ExpectedCalls = nil
	mockCoinRepo.ExpectedCalls = nil
	mockJupiterClient.ExpectedCalls = nil
	mockOffchainClient.ExpectedCalls = nil

	// First call to GetByField in GetCoinByMintAddress - not found
	mockStore.On("Coins").Return(mockCoinRepo).Times(3)                                                 // GetCoinByMintAddress, fetchAndCacheCoin check, fetchAndCacheCoin create
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Twice() // First for GetCoinByMintAddress, second for fetchAndCacheCoin

	// Mock the enrichment process - Jupiter calls
	mockJupiterClient.On("GetCoinInfo", ctx, mintAddress).Return(&jupiter.CoinListInfo{
		Address:  mintAddress,
		Name:     "Enriched Coin",
		Symbol:   "ENR",
		Decimals: 6,
	}, nil).Once()
	mockJupiterClient.On("GetCoinPrices", ctx, []string{mintAddress}).Return(map[string]float64{
		mintAddress: 0.001,
	}, nil).Once()

	// Mock the Solana metadata account call
	// For simplicity, let's make this fail so we don't need to mock FetchMetadata
	// This will cause EnrichCoinData to return with just Jupiter data
	// We need to import the solana client types or create a simple mock

	// Mock for Create in fetchAndCacheCoin
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Name == "Enriched Coin" && c.ID == 0 // ID is 0 for new coins
	})).Return(nil).Once()

	coin, err := service.GetCoinByMintAddress(ctx, mintAddress)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, mintAddress, coin.MintAddress)
	assert.Equal(t, "Enriched Coin", coin.Name)
	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
}

func TestGetCoins_Success(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)

	expectedCoins := []model.Coin{{ID: 1, MintAddress: "mint1", Name: "Coin 1"}}

	// Clear any existing expectations and set up specific ones for this test
	mockStore.ExpectedCalls = nil
	mockCoinRepo.ExpectedCalls = nil

	mockStore.On("Coins").Return(mockCoinRepo).Once()
	mockCoinRepo.On("List", ctx).Return(expectedCoins, nil).Once()

	coins, err := service.GetCoins(ctx)

	assert.NoError(t, err)
	assert.Equal(t, expectedCoins, coins)
	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
}

func TestLoadOrRefreshData_NoRefreshNeeded(t *testing.T) {
	ctx := context.Background()
	service, cfg, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	cfg.NewCoinsFetchInterval = 0 // Ensure NewService doesn't start goroutine that might interfere

	// Clear any existing expectations and set up specific ones for this test
	mockStore.ExpectedCalls = nil
	mockCoinRepo.ExpectedCalls = nil
	mockJupiterClient.ExpectedCalls = nil
	mockOffchainClient.ExpectedCalls = nil

	// --- Setup for loadOrRefreshData NOT needing refresh ---
	freshCoinTime := time.Now().Format(time.RFC3339) // Fresh data

	// Mock the WithTransaction call
	mockStore.On("WithTransaction", ctx, mock.AnythingOfType("func(db.Store) error")).
		Run(func(args mock.Arguments) {
			fn := args.Get(1).(func(db.Store) error)
			fn(mockStore) // Execute the function with the main mockStore acting as txStore
		}).Return(nil).Once()

	// This is the ListTrendingCoins call inside WithTransaction - return fresh data
	mockStore.On("ListTrendingCoins", ctx).Return([]model.Coin{{MintAddress: "fresh", LastUpdated: freshCoinTime}}, nil).Once()

	// Since data is fresh, no other calls should be made

	err := service.loadOrRefreshData(ctx) // This call will use the WithTransaction mock

	// The method should succeed without doing any refresh operations
	assert.NoError(t, err)
	mockStore.AssertExpectations(t) // Verifies ListTrendingCoins on txStore
}

// Helper functions for pointers
func Pint(i int) *int          { return &i }
func Pbool(b bool) *bool       { return &b }
func Pstring(s string) *string { return &s }
