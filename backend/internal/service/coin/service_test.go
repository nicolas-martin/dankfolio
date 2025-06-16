package coin

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require" // Import require for assertions within test setup/logic

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	birdeyeclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye/mocks"
	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	clientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/mocks"
	offchainClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	telemetrymocks "github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/util" // Import util for IsValidSolanaAddress
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

	// Default WithTransaction for NewService:
	// This mock is intended for the loadOrRefreshData call during NewService.
	// It might be overridden by specific tests if they need to inspect the transaction.
	// For general setup, we assume it completes without error and doesn't need to execute the actual logic.
	mocks.Store.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Return(func(ctx context.Context, fn func(txStore db.Store) error) error {
			// For the *initial* call in NewService, we want to simulate no refresh needed
			// or a very simple path. Here, we'll mock ListTrendingCoins to return fresh data
			// so that the actual refresh logic inside fn is skipped.
			// This specific ListTrendingCoins mock is only for the NewService context.
			// Tests that call loadOrRefreshData directly will set their own expectations.

			// Use a fresh mock store for the transaction scope during NewService's initial loadOrRefreshData
			// to avoid interference with test-specific mock setups on setup.Mocks.Store.
			initialLoadMockStore := dbDataStoreMocks.NewMockStore(t)
			initialLoadMockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{
				{MintAddress: "existingInitial", LastUpdated: time.Now().Format(time.RFC3339)},
			}, nil).Once()
			initialLoadMockStore.On("Coins").Return(dbDataStoreMocks.NewMockRepository[model.Coin](t)).Maybe() // Avoid nil pointer if Coins() is called

			// If fn is called, it will use initialLoadMockStore
			return fn(initialLoadMockStore)
		}).Maybe() // Maybe, as some tests might not trigger NewService's loadOrRefreshData deeply

	service := NewService(
		cfg,
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

	// Clear default Maybe() expectations for Coins() from setup if we are setting a new one.
	// This ensures that only the .On call relevant to this test is active for Coins().
	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	setup.Mocks.CoinRepo.On("Get", ctx, idStr).Return(expectedCoin, nil).Once()

	coin, err := setup.Service.GetCoinByID(ctx, idStr)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	setup.Mocks.CoinRepo.AssertExpectations(t)
	setup.Mocks.Store.AssertExpectations(t)
}

func TestGetCoinByIDRefactored_InvalidFormat(t *testing.T) {
	ctx := context.Background()
	_ = setupCoinServiceTestRefactored(t) // Service setup might not be strictly needed if not calling service methods

	// Directly test the validation part if possible, or ensure service setup doesn't interfere.
	// For this specific test, GetCoinByID is simple enough.
	s := &Service{} // Minimal service if only GetCoinByID's direct logic is tested

	coin, err := s.GetCoinByID(ctx, "not_a_number")
	assert.Error(t, err)
	assert.Nil(t, coin)
	assert.Contains(t, err.Error(), "invalid coin ID format")
}

func TestGetCoinByIDRefactored_NotFound(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)
	idStr := "456"

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	setup.Mocks.CoinRepo.On("Get", ctx, idStr).Return(nil, db.ErrNotFound).Once()

	coin, err := setup.Service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.True(t, errors.Is(err, db.ErrNotFound)) // Ensure this uses errors.Is
	assert.Nil(t, coin)
	setup.Mocks.CoinRepo.AssertExpectations(t)
	setup.Mocks.Store.AssertExpectations(t)
}

func TestGetCoinByMintAddressRefactored_FoundOnlyInCoinsTable_Success(t *testing.T) {
	setup := setupCoinServiceTestRefactored(t)
	ctx := context.Background()
	// Use a canonical valid Solana address
	testMintAddress := "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin" // Serum DEX Program ID, Length 44
	require.True(t, util.IsValidSolanaAddress(testMintAddress), "Test mint address should be valid")

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

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	setup.Mocks.CoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(expectedCoin, nil).Once()

	coin, err := setup.Service.GetCoinByMintAddress(ctx, testMintAddress)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, expectedCoin, coin)

	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

func TestGetCoins_DefaultSorting(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	// Expected defaults
	expectedSortBy := "volume_24h"
	expectedSortDesc := true
	defaultLimit := 20 // GetCoins also applies a default limit

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	// Use MatchedBy to capture and assert the ListOptions
	setup.Mocks.CoinRepo.On("List", ctx, mock.MatchedBy(func(opts db.ListOptions) bool {
		assert.NotNil(t, opts.SortBy, "SortBy should not be nil")
		assert.Equal(t, expectedSortBy, *opts.SortBy, "SortBy should default correctly")
		assert.NotNil(t, opts.SortDesc, "SortDesc should not be nil")
		assert.Equal(t, expectedSortDesc, *opts.SortDesc, "SortDesc should default correctly")
		assert.NotNil(t, opts.Limit, "Limit should not be nil")
		assert.Equal(t, defaultLimit, *opts.Limit, "Limit should default correctly when sort is tested")
		return true
	})).Return([]model.Coin{}, int64(0), nil).Once()

	// Call GetCoins with empty ListOptions to trigger defaults
	var err error
	_, _, err = setup.Service.GetCoins(ctx, db.ListOptions{})
	assert.NoError(t, err)

	setup.Mocks.Store.AssertExpectations(t)    // Ensure Coins() was called
	setup.Mocks.CoinRepo.AssertExpectations(t) // Ensure List() was called with matching options
}

func TestGetCoins_DefaultLimit(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	// Expected defaults
	expectedLimit := 20
	// Default sorting will also be applied
	expectedSortBy := "volume_24h"
	expectedSortDesc := true

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	// Use MatchedBy to capture and assert the ListOptions
	setup.Mocks.CoinRepo.On("List", ctx, mock.MatchedBy(func(opts db.ListOptions) bool {
		assert.NotNil(t, opts.Limit, "Limit should not be nil")
		assert.Equal(t, expectedLimit, *opts.Limit, "Limit should default correctly")
		// Also check that default sort is applied
		assert.NotNil(t, opts.SortBy, "SortBy should not be nil when testing default limit")
		assert.Equal(t, expectedSortBy, *opts.SortBy, "SortBy should default when testing default limit")
		assert.NotNil(t, opts.SortDesc, "SortDesc should not be nil when testing default limit")
		assert.Equal(t, expectedSortDesc, *opts.SortDesc, "SortDesc should default when testing default limit")
		return true
	})).Return([]model.Coin{}, int64(0), nil).Once()

	// Call GetCoins with empty ListOptions to trigger defaults
	var err error
	_, _, err = setup.Service.GetCoins(ctx, db.ListOptions{})
	assert.NoError(t, err)

	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

func TestGetCoins_MaxLimitCapping(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	largeLimit := 200
	expectedCappedLimit := 100
	// Default sorting will also be applied
	expectedSortBy := "volume_24h"
	expectedSortDesc := true

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	// Use MatchedBy to capture and assert the ListOptions
	setup.Mocks.CoinRepo.On("List", ctx, mock.MatchedBy(func(opts db.ListOptions) bool {
		assert.NotNil(t, opts.Limit, "Limit should not be nil")
		assert.Equal(t, expectedCappedLimit, *opts.Limit, "Limit should be capped correctly")
		// Also check that default sort is applied
		assert.NotNil(t, opts.SortBy, "SortBy should not be nil when testing max limit")
		assert.Equal(t, expectedSortBy, *opts.SortBy, "SortBy should default when testing max limit")
		assert.NotNil(t, opts.SortDesc, "SortDesc should not be nil when testing max limit")
		assert.Equal(t, expectedSortDesc, *opts.SortDesc, "SortDesc should default when testing max limit")
		return true
	})).Return([]model.Coin{}, int64(0), nil).Once()

	// Call GetCoins with a large limit
	var err error
	_, _, err = setup.Service.GetCoins(ctx, db.ListOptions{Limit: &largeLimit})
	assert.NoError(t, err)

	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

func TestGetCoins_ClientSpecifiedOptions(t *testing.T) {
	ctx := context.Background()
	setup := setupCoinServiceTestRefactored(t)

	clientSortBy := "name"
	clientSortDesc := false
	clientLimit := 10

	setup.Mocks.Store.Mock.ExpectedCalls = removeCall(setup.Mocks.Store.Mock.ExpectedCalls, "Coins")
	setup.Mocks.Store.On("Coins").Return(setup.Mocks.CoinRepo).Once()

	// Use MatchedBy to capture and assert the ListOptions
	setup.Mocks.CoinRepo.On("List", ctx, mock.MatchedBy(func(opts db.ListOptions) bool {
		assert.NotNil(t, opts.SortBy, "SortBy should not be nil")
		assert.Equal(t, clientSortBy, *opts.SortBy, "Client-specified SortBy should be used")
		assert.NotNil(t, opts.SortDesc, "SortDesc should not be nil")
		assert.Equal(t, clientSortDesc, *opts.SortDesc, "Client-specified SortDesc should be used")
		assert.NotNil(t, opts.Limit, "Limit should not be nil")
		assert.Equal(t, clientLimit, *opts.Limit, "Client-specified Limit should be used")
		return true
	})).Return([]model.Coin{}, int64(0), nil).Once()

	// Call GetCoins with client-specified options
	// Ensure 'err' is declared, and then assigned to using '='.
	// This is to be absolutely certain about the fix for "no new variables on left side of :="
	var err error
	var coins []model.Coin
	var totalCount int32
	coins, totalCount, err = setup.Service.GetCoins(ctx, db.ListOptions{
		SortBy:   &clientSortBy,
		SortDesc: &clientSortDesc,
		Limit:    &clientLimit,
	})
	assert.NoError(t, err)
	// Add dummy assertions for coins and totalCount to avoid "declared and not used" if they were not used later.
	// In this test, they are not used, but good practice if they were.
	_ = coins
	_ = totalCount

	setup.Mocks.Store.AssertExpectations(t)
	setup.Mocks.CoinRepo.AssertExpectations(t)
}

// removeCall is a helper to filter out specific expected calls from a slice of calls.
// This is useful for overriding Maybe() calls from a shared setup.
func removeCall(calls []*mock.Call, methodName string) []*mock.Call {
	var filtered []*mock.Call
	for _, call := range calls {
		if call.Method != methodName {
			filtered = append(filtered, call)
		}
	}
	return filtered
}

func TestLoadOrRefreshData_NoTokensFromBirdeye_ClearsTrending(t *testing.T) {
	ctx := context.Background()
	// Use a clean setup for this test to have full control over mock expectations,
	// especially for WithTransaction and ListTrendingCoins during the tested loadOrRefreshData call.
	cfg := &Config{NewCoinsFetchInterval: 0}
	testSpecificMocks := &testMocks{
		JupiterClient:  jupiterclientmocks.NewMockClientAPI(t),
		BirdeyeClient:  birdeyeclientmocks.NewMockClientAPI(t),
		OffchainClient: offchainClientMocks.NewMockClientAPI(t),
		Store:          dbDataStoreMocks.NewMockStore(t),
		CoinRepo:       dbDataStoreMocks.NewMockRepository[model.Coin](t),
		RawCoinRepo:    dbDataStoreMocks.NewMockRepository[model.RawCoin](t),
		SolanaClient:   clientmocks.NewMockGenericClientAPI(t),
		TelemetryAPI:   telemetrymocks.NewMockTelemetryAPI(t),
	}

	// Service instance for this test, distinct from the global setup's service instance.
	// We pass testSpecificMocks.Store here.
	service := &Service{
		config:         cfg,
		jupiterClient:  testSpecificMocks.JupiterClient,
		birdeyeClient:  testSpecificMocks.BirdeyeClient,
		offchainClient: testSpecificMocks.OffchainClient,
		store:          testSpecificMocks.Store, // Use the test-specific store
		chainClient:    testSpecificMocks.SolanaClient,
		apiTracker:     testSpecificMocks.TelemetryAPI,
	}

	oldTime := time.Now().Add(-(TrendingDataTTL + time.Hour)) // Ensure it's older than TTL
	oldTimeStr := oldTime.Format(time.RFC3339)
	initialTrendingCoin := model.Coin{
		ID:          1,
		MintAddress: "trendingCoin1",
		Name:        "Old Trending Coin",
		Symbol:      "OTC",
		IsTrending:  true,
		LastUpdated: oldTimeStr,
	}

	// 1. Mock WithTransaction: Crucial for loadOrRefreshData.
	// It must execute the passed function (fn) using the testSpecificMocks.Store.
	testSpecificMocks.Store.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Return(func(ctx context.Context, fn func(txStore db.Store) error) error {
			return fn(testSpecificMocks.Store) // Pass the same testSpecificMocks.Store into the transaction block
		}).Once()

	// 2. Mock ListTrendingCoins: Called by loadOrRefreshData to determine if a refresh is needed.
	testSpecificMocks.Store.On("ListTrendingCoins", ctx).Return([]model.Coin{initialTrendingCoin}, nil).Once()

	// 3. Mock BirdeyeClient.GetTrendingTokens: Simulate Birdeye returning no tokens.
	testSpecificMocks.BirdeyeClient.On("GetTrendingTokens", ctx, mock.AnythingOfType("birdeye.TrendingTokensParams")).Return(&birdeye.TokenTrendingResponse{Data: birdeye.TokenTrendingData{Tokens: []birdeye.TokenDetails{}}}, nil).Once()

	// 4. Mock Store.Coins() to return the CoinRepo, then mock CoinRepo.List.
	// This is for loadOrRefreshData's step of clearing IsTrending on existing coins.
	testSpecificMocks.Store.On("Coins").Return(testSpecificMocks.CoinRepo) // This will be called multiple times potentially
	// Updated mock to expect db.ListOptions
	testSpecificMocks.CoinRepo.On("List", ctx, mock.AnythingOfType("db.ListOptions")).Return([]model.Coin{initialTrendingCoin}, int64(1), nil).Once()

	// 5. Mock CoinRepo.BulkUpsert: Expect the initialTrendingCoin to be updated.
	var capturedCoinsForBulkUpsert []model.Coin
	testSpecificMocks.CoinRepo.On("BulkUpsert", ctx, mock.MatchedBy(func(coins *[]model.Coin) bool {
		if coins == nil || len(*coins) != 1 {
			return false
		}
		capturedCoinsForBulkUpsert = *coins // Capture for assertion
		return (*coins)[0].ID == initialTrendingCoin.ID
	})).Return(int64(1), nil).Once()

	// --- Execute the target logic: Directly call loadOrRefreshData ---
	err := service.loadOrRefreshData(ctx)
	assert.NoError(t, err)

	// --- Assert results ---
	assert.Len(t, capturedCoinsForBulkUpsert, 1, "Should have captured one coin for bulk update")
	if len(capturedCoinsForBulkUpsert) == 1 {
		updatedCoin := capturedCoinsForBulkUpsert[0]
		assert.Equal(t, initialTrendingCoin.ID, updatedCoin.ID, "Updated coin ID should match initial")
		assert.False(t, updatedCoin.IsTrending, "IsTrending should now be false")
		assert.NotEqual(t, oldTimeStr, updatedCoin.LastUpdated, "LastUpdated timestamp should have changed")

		newTimestamp, parseErr := time.Parse(time.RFC3339, updatedCoin.LastUpdated)
		assert.NoError(t, parseErr, "Failed to parse new LastUpdated timestamp")
		assert.True(t, time.Since(newTimestamp) < time.Minute, "New LastUpdated timestamp should be very recent")
	}

	// Verify all mock expectations were met
	testSpecificMocks.Store.AssertExpectations(t)
	testSpecificMocks.CoinRepo.AssertExpectations(t)
	testSpecificMocks.BirdeyeClient.AssertExpectations(t)
}

// Helper functions for pointers
func PintRefactored(i int) *int          { return &i }
func PboolRefactored(b bool) *bool       { return &b }
func PstringRefactored(s string) *string { return &s }
