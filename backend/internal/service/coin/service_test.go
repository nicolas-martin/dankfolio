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

	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	offchainClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"

	birdeyeclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye/mocks"
	clientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/mocks"
	telemetrymocks "github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry/mocks"
)

type testMocks struct {
	JupiterClient  *jupiterclientmocks.MockClientAPI
	BirdeyeClient  *birdeyeclientmocks.MockClientAPI
	OffchainClient *offchainClientMocks.MockClientAPI
	Store          *dbDataStoreMocks.MockStore
	CoinRepo       *dbDataStoreMocks.MockRepository[model.Coin]
	RawCoinRepo    *dbDataStoreMocks.MockRepository[model.RawCoin]
	TelemetryAPI   *telemetrymocks.MockTelemetryAPI
	SolanaClient   *clientmocks.MockGenericClientAPI
}

type testSetup struct {
	Service *Service
	Config  *Config
	Mocks   *testMocks
}

func setupCoinServiceTestRefactored(t *testing.T) *testSetup {
	cfg := &Config{
		NewCoinsFetchInterval: 0,                                   // Disable automatic fetching for tests
		SolanaRPCEndpoint:     "http://invalid-endpoint-for-tests", // Invalid endpoint to make Solana calls fail
	}

	mocks := &testMocks{
		JupiterClient:  jupiterclientmocks.NewMockClientAPI(t),
		BirdeyeClient:  birdeyeclientmocks.NewMockClientAPI(t),
		OffchainClient: offchainClientMocks.NewMockClientAPI(t),
		Store:          dbDataStoreMocks.NewMockStore(t),
		CoinRepo:       dbDataStoreMocks.NewMockRepository[model.Coin](t),
		RawCoinRepo:    dbDataStoreMocks.NewMockRepository[model.RawCoin](t),
		SolanaClient:   clientmocks.NewMockGenericClientAPI(t),
		TelemetryAPI:   telemetrymocks.NewMockTelemetryAPI(t),
	}

	// Set up default mock behaviors for service initialization
	mocks.Store.On("Coins").Return(mocks.CoinRepo).Maybe()
	mocks.Store.On("RawCoins").Return(mocks.RawCoinRepo).Maybe()

	// Mock for initial loadOrRefreshData call in NewService
	mocks.Store.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Run(func(args mock.Arguments) {
			// For initialization, just return nil to skip the refresh logic
			// Individual tests will set up their own transaction expectations
		}).Return(nil).Maybe()

	// Mock for initial trending coins check in loadOrRefreshData
	mocks.Store.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{
		{MintAddress: "existing", LastUpdated: time.Now().Format(time.RFC3339)}, // Fresh data to skip refresh
	}, nil).Maybe()

	service := NewService(
		cfg,
		&http.Client{},
		mocks.JupiterClient,
		mocks.Store,
		mocks.SolanaClient,
		mocks.BirdeyeClient,
		mocks.TelemetryAPI,
		mocks.OffchainClient,
	)

	return &testSetup{
		Service: service,
		Config:  cfg,
		Mocks:   mocks,
	}
}

func TestGetCoinByIDRefactored_Success(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	expectedID := uint64(123)
	idStr := strconv.FormatUint(expectedID, 10)
	expectedCoin := &model.Coin{ID: expectedID, MintAddress: "mintForID123", Name: "Test Coin by ID"}

	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Maybe()
	setup.Mocks.CoinRepo.On("Get", ctx, idStr).Return(expectedCoin, nil).Once()

	coin, err := setup.Service.GetCoinByID(ctx, idStr)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

func TestGetCoinByIDRefactored_InvalidFormat(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)
	idStr := "not_a_number"

	coin, err := setup.Service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.Nil(t, coin)
	assert.Contains(t, err.Error(), "invalid coin ID format")
}

func TestGetCoinByIDRefactored_NotFound(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)
	idStr := "456"

	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Maybe()
	setup.Mocks.CoinRepo.On("Get", ctx, idStr).Return(nil, db.ErrNotFound).Once()

	coin, err := setup.Service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.True(t, errors.Is(err, db.ErrNotFound))
	assert.Nil(t, coin)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

func TestGetCoinByMintAddressRefactored_FoundOnlyInCoinsTable_Success(t *testing.T) {
	setup := setupCoinServiceTestRefactored(t)
	// Override the chainClient with a new mock for this specific test
	mockSolanaClient := clientmocks.NewMockGenericClientAPI(t)
	setup.Service.chainClient = mockSolanaClient

	ctx := context.Background()
	testMintAddress := "existingCoinMint"
	expectedCoin := &model.Coin{
		ID:              1,
		MintAddress:     testMintAddress,
		Name:            "Existing Coin",
		Symbol:          "EXT",
		Description:     "This is a complete coin.",
		IconUrl:         "some_url",
		ResolvedIconUrl: "some_resolved_url",
		Price:           2.50,
		Decimals:        6,
		LastUpdated:     time.Now().Format(time.RFC3339),
		Volume24h:       10000.0,
		IsTrending:      true,
	}

	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Maybe()
	setup.Mocks.CoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(expectedCoin, nil).Once()

	coin, err := setup.Service.GetCoinByMintAddress(ctx, testMintAddress)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, expectedCoin, coin)

	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)

	// Explicitly assert that other mocks were not called
	setup.Mocks.RawCoinRepo.AssertNotCalled(t, "GetByField", mock.Anything, mock.Anything, mock.Anything)
	setup.Mocks.JupiterClient.AssertNotCalled(t, "GetCoinInfo", mock.Anything, mock.Anything)
	setup.Mocks.JupiterClient.AssertNotCalled(t, "GetCoinPrices", mock.Anything, mock.Anything)
	mockSolanaClient.AssertNotCalled(t, "GetTokenMetadata", mock.Anything, mock.Anything)
	setup.Mocks.OffchainClient.AssertNotCalled(t, "FetchMetadata", mock.Anything)
	setup.Mocks.CoinRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestGetCoinsRefactored_Success(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	expectedCoins := []model.Coin{{ID: 1, MintAddress: "mint1", Name: "Coin 1"}}

	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Maybe()
	setup.Mocks.CoinRepo.On("List", ctx).Return(expectedCoins, nil).Once()

	coins, err := setup.Service.GetCoins(ctx)

	assert.NoError(t, err)
	assert.Equal(t, expectedCoins, coins)
	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

// Helper functions for pointers
func PintRefactored(i int) *int          { return &i }
func PboolRefactored(b bool) *bool       { return &b }
func PstringRefactored(s string) *string { return &s }
