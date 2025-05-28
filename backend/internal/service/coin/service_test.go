package coin

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	offchainMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	solanaMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"sync" // Added for robust goroutine testing

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// mockService extends Service to override loadOrRefreshData
type mockService struct {
	*Service                // Embed as pointer to allow method overriding
	loadOrRefreshDataCalled bool
}

func newMockService(config *Config, httpClient *http.Client, jupiterClient jupiter.ClientAPI, solanaClient solana.ClientAPI, offchainClient offchain.ClientAPI, store db.Store) *mockService {
	// Ensure config is not nil and set NewCoinsFetchInterval to 0 if not already set by the test
	// This makes sure that tests using newMockService (which bypasses the real NewService)
	// are explicitly stating that the fetcher is not relevant for them.
	if config.NewCoinsFetchInterval == 0 {
		// If a test provides a positive interval, it will be used.
		// Otherwise, for tests using newMockService, the fetcher is implicitly off.
	}

	baseService := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
		store:          store,
		// fetcherCtx and fetcherCancel are not initialized here because newMockService
		// bypasses the real NewService where they are set up.
	}
	s := &mockService{
		Service: baseService,
	}

	// Call loadOrRefreshData immediately, similar to what NewService does.
	// For mockService, this is a no-op that just sets a flag.
	ctx, cancel := context.WithTimeout(context.Background(), initialLoadTimeout)
	defer cancel()
	_ = s.loadOrRefreshData(ctx)

	return s
}

// Override loadOrRefreshData to do nothing in tests
func (m *mockService) loadOrRefreshData(ctx context.Context) error {
	m.loadOrRefreshDataCalled = true
	return nil
}

func TestNewService(t *testing.T) {
	// Setup
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher for this general NewService field assignment test
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)

	// Test
	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	// Assertions
	assert.NotNil(t, service)
	assert.Equal(t, config, service.config)
	assert.Equal(t, jupiterClient, service.jupiterClient)
	assert.Equal(t, solanaClient, service.solanaClient)
	assert.Equal(t, offchainClient, service.offchainClient)
	assert.Equal(t, store, service.store)
	assert.True(t, service.loadOrRefreshDataCalled, "loadOrRefreshData should have been called")
}

func TestGetCoins(t *testing.T) {
	// Setup
	ctx := context.Background()
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)
	coinRepo := dbMocks.NewMockRepository[model.Coin](t)

	// Setup store expectations
	store.On("Coins").Return(coinRepo)
	coinRepo.On("List", ctx).Return([]model.Coin{
		{
			MintAddress: "coin1",
			Name:        "Test Coin 1",
			Volume24h:   1000.0,
		},
		{
			MintAddress: "coin2",
			Name:        "Test Coin 2",
			Volume24h:   2000.0,
		},
	}, nil)

	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	// Test
	coins, err := service.GetCoins(ctx)

	// Assertions
	assert.NoError(t, err)
	assert.Len(t, coins, 2)
	assert.Equal(t, "Test Coin 2", coins[0].Name) // Should be sorted by volume
	assert.Equal(t, "Test Coin 1", coins[1].Name)
	store.AssertExpectations(t)
	coinRepo.AssertExpectations(t)
}

func TestGetCoins_Error(t *testing.T) {
	// Setup
	ctx := context.Background()
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)
	coinRepo := dbMocks.NewMockRepository[model.Coin](t)

	// Setup store expectations
	store.On("Coins").Return(coinRepo)
	coinRepo.On("List", ctx).Return(nil, errors.New("store error"))

	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	// Test
	coins, err := service.GetCoins(ctx)

	// Assertions
	assert.Error(t, err)
	assert.Nil(t, coins)
	assert.EqualError(t, err, "failed to list coins: store error")
	store.AssertExpectations(t)
	coinRepo.AssertExpectations(t)
}

func TestGetTrendingCoins(t *testing.T) {
	// Setup
	ctx := context.Background()
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)

	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	// Create test coins
	testCoins := []model.Coin{
		{
			MintAddress: "coin1",
			Name:        "Test Coin 1",
			Volume24h:   1000.0,
			IsTrending:  true,
		},
		{
			MintAddress: "coin2",
			Name:        "Test Coin 2",
			Volume24h:   2000.0,
			IsTrending:  false,
		},
		{
			MintAddress: "coin3",
			Name:        "Test Coin 3",
			Volume24h:   3000.0,
			IsTrending:  true,
		},
	}

	// Setup expectations
	trendingCoins := []model.Coin{testCoins[0], testCoins[2]}
	store.On("ListTrendingCoins", ctx).Return(trendingCoins, nil)

	// Test
	coins, err := service.GetTrendingCoins(ctx)

	// Assertions
	assert.NoError(t, err)
	assert.Len(t, coins, 2)
	assert.Equal(t, "Test Coin 3", coins[0].Name) // Should be sorted by volume
	assert.Equal(t, "Test Coin 1", coins[1].Name)
	store.AssertExpectations(t)
}

func TestGetTrendingCoins_Error(t *testing.T) {
	// Setup
	ctx := context.Background()
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)

	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	// Setup expectations
	store.On("ListTrendingCoins", ctx).Return(nil, errors.New("store error"))

	// Test
	coins, err := service.GetTrendingCoins(ctx)

	// Assertions
	assert.Error(t, err)
	assert.Nil(t, coins)
	assert.EqualError(t, err, "failed to list trending coins: store error")
	store.AssertExpectations(t)
}

func TestGetCoinByID(t *testing.T) {
	// Setup
	ctx := context.Background()
	config := &Config{
		SolanaRPCEndpoint:    "https://api.mainnet-beta.solana.com",
		NewCoinsFetchInterval: 0, // Explicitly disable fetcher
	}
	httpClient := &http.Client{}
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)
	coinRepo := dbMocks.NewMockRepository[model.Coin](t)

	service := newMockService(config, httpClient, jupiterClient, solanaClient, offchainClient, store)

	testCoin := model.Coin{
		MintAddress: "coin1",
		Name:        "Test Coin 1",
		Volume24h:   1000.0,
		CreatedAt:   time.Now().Format(time.RFC3339),
	}

	// Test cases
	t.Run("Existing coin", func(t *testing.T) {
		// Setup store expectations
		store.On("Coins").Return(coinRepo)
		coinRepo.On("Get", ctx, "coin1").Return(&testCoin, nil)

		// Test
		coin, err := service.GetCoinByID(ctx, "coin1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, testCoin.MintAddress, coin.MintAddress)
		assert.Equal(t, testCoin.Name, coin.Name)
		store.AssertExpectations(t)
		coinRepo.AssertExpectations(t)
	})

	t.Run("Non-existent coin with Jupiter fallback", func(t *testing.T) {
		// Setup Jupiter mock
		jupiterInfo := &jupiter.CoinListInfo{
			Address:     "newcoin",
			Name:        "New Coin",
			Symbol:      "NEW",
			Decimals:    9,
			LogoURI:     "http://example.com/logo.png",
			DailyVolume: 5000.0,
			Tags:        []string{"defi", "meme"},
			CreatedAt:   time.Now(),
		}

		// Mock metadata
		metadata := &token_metadata.Metadata{
			Data: token_metadata.Data{
				Name:   "New Coin",
				Symbol: "NEW",
				Uri:    "http://example.com/metadata.json",
			},
		}

		// Mock metadata JSON
		metadataJSON := map[string]interface{}{
			"name":        "New Coin",
			"symbol":      "NEW",
			"description": "A new test coin",
			"image":       "http://example.com/image.png",
		}

		// Setup store expectations
		store.On("Coins").Return(coinRepo)
		coinRepo.On("Get", ctx, "newcoin").Return(nil, errors.New("not found"))
		coinRepo.On("Upsert", ctx, mock.AnythingOfType("*model.Coin")).Return(nil)

		jupiterClient.On("GetCoinInfo", ctx, "newcoin").Return(jupiterInfo, nil)
		jupiterClient.On("GetCoinPrices", ctx, []string{"newcoin"}).Return(map[string]float64{"newcoin": 1.5}, nil)
		solanaClient.On("GetMetadataAccount", ctx, "newcoin").Return(metadata, nil)
		offchainClient.On("FetchMetadata", "http://example.com/metadata.json").Return(metadataJSON, nil)

		// Test
		coin, err := service.GetCoinByID(ctx, "newcoin")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, "newcoin", coin.MintAddress)
		assert.Equal(t, jupiterInfo.Name, coin.Name)
		assert.Equal(t, jupiterInfo.Symbol, coin.Symbol)
		assert.Equal(t, 1.5, coin.Price)
		store.AssertExpectations(t)
		coinRepo.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
		solanaClient.AssertExpectations(t)
		offchainClient.AssertExpectations(t)
	})

	t.Run("Non-existent coin with Jupiter error", func(t *testing.T) {
		// Setup store expectations
		store.On("Coins").Return(coinRepo)
		coinRepo.On("Get", ctx, "invalid").Return(nil, errors.New("not found"))

		// Setup Jupiter mock to return error
		jupiterClient.On("GetCoinInfo", ctx, "invalid").Return(nil, errors.New("not found"))
		jupiterClient.On("GetCoinPrices", ctx, []string{"invalid"}).Return(nil, errors.New("not found"))
		solanaClient.On("GetMetadataAccount", ctx, "invalid").Return(nil, errors.New("not found"))

		// Test
		coin, err := service.GetCoinByID(ctx, "invalid")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, coin)
		assert.Contains(t, err.Error(), "not found and dynamic enrichment failed")
		store.AssertExpectations(t)
		coinRepo.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
		solanaClient.AssertExpectations(t)
	})

	t.Run("Store error on Get", func(t *testing.T) {
		// Setup store expectations
		store.On("Coins").Return(coinRepo)
		coinRepo.On("Get", ctx, "errorcoin").Return(nil, errors.New("random store error"))

		// Setup Jupiter mock to return error for "errorcoin" as enrichment will still be attempted
		jupiterClient.On("GetCoinInfo", ctx, "errorcoin").Return(nil, errors.New("jupiter error for errorcoin")).Maybe()
		jupiterClient.On("GetCoinPrices", ctx, []string{"errorcoin"}).Return(nil, errors.New("jupiter price error for errorcoin")).Maybe()
		solanaClient.On("GetMetadataAccount", ctx, "errorcoin").Return(nil, errors.New("solana error for errorcoin")).Maybe()
		// offchainClient is not directly called in this path if GetMetadataAccount fails or returns nil metadata

		// Test
		coin, err := service.GetCoinByID(ctx, "errorcoin")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, coin)
		// The error message will be from the enrichment part because it's tried after the initial store error (that isn't "not found")
		assert.Contains(t, err.Error(), "not found and dynamic enrichment failed") 
		// We expect the initial "failed to get coin from store" error to be logged, and then the enrichment error to be returned.
		// The final error returned is "coin <coinID> not found and dynamic enrichment failed: <enrichment error>"
		// Let's check for the specific enrichment error part.
		assert.Contains(t, err.Error(), "failed to enrich coin errorcoin: no data available from any source")


		store.AssertExpectations(t)
		coinRepo.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
		solanaClient.AssertExpectations(t)
	})
}

// Helper functions for creating mocks
func NewMockJupiterClient(t interface {
	mock.TestingT
	Cleanup(func())
},
) *jupiterMocks.MockClientAPI {
	return jupiterMocks.NewMockClientAPI(t)
}

func NewMockSolanaClient(t interface {
	mock.TestingT
	Cleanup(func())
},
) *solanaMocks.MockClientAPI {
	return solanaMocks.NewMockClientAPI(t)
}

func NewMockOffchainClient(t interface {
	mock.TestingT
	Cleanup(func())
},
) *offchainMocks.MockClientAPI {
	return offchainMocks.NewMockClientAPI(t)
}

func TestService_FetchAndStoreNewTokens_Success(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockStore := dbMocks.NewMockStore(t)
	mockRawCoinRepo := dbMocks.NewMockRepository[model.RawCoin](t)

	// Minimal config, SolanRPCEndpoint is required by NewService.
	// Fetcher explicitly disabled for this test as it's not testing the fetcher.
	config := &Config{SolanaRPCEndpoint: "dummy-rpc", NewCoinsFetchInterval: 0}
	// Other clients are not directly used by FetchAndStoreNewTokens, so basic mocks are fine.
	// newMockService will handle the setup.
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)

	service := newMockService(config, &http.Client{}, mockJupiterClient, solanaClient, offchainClient, mockStore)
	assert.True(t, service.loadOrRefreshDataCalled, "loadOrRefreshData should have been called by newMockService")

	// Sample data from Jupiter
	jupiterCoins := []jupiter.CoinListInfo{
		{Address: "token1", Name: "Token One", Symbol: "ONE", Decimals: 6, LogoURI: "logo1"},
		{Address: "token2", Name: "Token Two", Symbol: "TWO", Decimals: 8, LogoURI: "logo2"},
	}
	jupiterResponse := &jupiter.CoinListResponse{Coins: jupiterCoins}

	mockJupiterClient.On("GetNewCoins", ctx).Return(jupiterResponse, nil).Once()
	mockStore.On("RawCoins").Return(mockRawCoinRepo) // This will be called once by the function.
	// Expect Upsert to be called for each coin
	mockRawCoinRepo.On("Upsert", ctx, mock.AnythingOfType("*model.RawCoin")).Return(nil).Times(len(jupiterCoins))

	err := service.FetchAndStoreNewTokens(ctx)

	assert.NoError(t, err)
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
}

func TestService_FetchAndStoreNewTokens_JupiterError(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockStore := dbMocks.NewMockStore(t) // Upsert should not be called

	config := &Config{SolanaRPCEndpoint: "dummy-rpc", NewCoinsFetchInterval: 0}
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	service := newMockService(config, &http.Client{}, mockJupiterClient, solanaClient, offchainClient, mockStore)
	assert.True(t, service.loadOrRefreshDataCalled)

	expectedError := errors.New("jupiter client error")
	mockJupiterClient.On("GetNewCoins", ctx).Return(nil, expectedError).Once()

	// mockStore.RawCoins() should not be called, so no expectation for it or Upsert.

	err := service.FetchAndStoreNewTokens(ctx)

	assert.Error(t, err)
	assert.Equal(t, "failed to get new coins from Jupiter: jupiter client error", err.Error())
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertNotCalled(t, "RawCoins") // Verify RawCoins() itself is not called
}

func TestService_FetchAndStoreNewTokens_StoreUpsertFails(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockStore := dbMocks.NewMockStore(t)
	mockRawCoinRepo := dbMocks.NewMockRepository[model.RawCoin](t)

	config := &Config{SolanaRPCEndpoint: "dummy-rpc", NewCoinsFetchInterval: 0}
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	service := newMockService(config, &http.Client{}, mockJupiterClient, solanaClient, offchainClient, mockStore)
	assert.True(t, service.loadOrRefreshDataCalled)

	jupiterCoins := []jupiter.CoinListInfo{
		{Address: "token1", Name: "Token One", Symbol: "ONE", Decimals: 6, LogoURI: "logo1"},
		{Address: "token2", Name: "Token Two", Symbol: "TWO", Decimals: 8, LogoURI: "logo2"}, // This one will fail
		{Address: "token3", Name: "Token Three", Symbol: "THREE", Decimals: 9, LogoURI: "logo3"},
	}
	jupiterResponse := &jupiter.CoinListResponse{Coins: jupiterCoins}
	upsertError := errors.New("upsert failed")

	mockJupiterClient.On("GetNewCoins", ctx).Return(jupiterResponse, nil).Once()
	mockStore.On("RawCoins").Return(mockRawCoinRepo)

	// Mock Upsert behavior: success for token1, failure for token2, success for token3
	mockRawCoinRepo.On("Upsert", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "token1" })).Return(nil).Once()
	mockRawCoinRepo.On("Upsert", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "token2" })).Return(upsertError).Once()
	mockRawCoinRepo.On("Upsert", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "token3" })).Return(nil).Once()

	err := service.FetchAndStoreNewTokens(ctx)

	// As per current design, FetchAndStoreNewTokens logs errors but returns nil overall if Jupiter call succeeds.
	assert.NoError(t, err)
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
	// Slog is used for logging; verifying log output is more complex and often skipped in unit tests
	// unless a specific log testing library is used or logs are passed to a mockable interface.
}

func TestService_FetchAndStoreNewTokens_EmptyList(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockStore := dbMocks.NewMockStore(t) // RawCoins and Upsert should not be called

	config := &Config{SolanaRPCEndpoint: "dummy-rpc", NewCoinsFetchInterval: 0}
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	service := newMockService(config, &http.Client{}, mockJupiterClient, solanaClient, offchainClient, mockStore)
	assert.True(t, service.loadOrRefreshDataCalled)

	emptyJupiterResponse := &jupiter.CoinListResponse{Coins: []jupiter.CoinListInfo{}}
	mockJupiterClient.On("GetNewCoins", ctx).Return(emptyJupiterResponse, nil).Once()

	// mockStore.RawCoins() should not be called.

	err := service.FetchAndStoreNewTokens(ctx)

	assert.NoError(t, err)
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertNotCalled(t, "RawCoins")
}

func TestService_NewService_StartsFetcherAndInitialFetch(t *testing.T) {
	mockJupiterClient := jupiterMocks.NewMockClientAPI(t)
	mockStore := dbMocks.NewMockStore(t)
	mockRawCoinRepo := dbMocks.NewMockRepository[model.RawCoin](t)
	// Mocks for dependencies of loadOrRefreshData, which NewService calls.
	// These need to be lenient as loadOrRefreshData is complex and not the focus here.
	mockCoinRepo := dbMocks.NewMockRepository[model.Coin](t)

	// Configure a positive interval to enable the fetcher
	config := &Config{
		SolanaRPCEndpoint:    "dummy-rpc-for-fetcher-test",
		NewCoinsFetchInterval: 50 * time.Millisecond, // Short interval for testing
		// Other config fields like BirdEyeBaseURL might be needed if loadOrRefreshData uses them
		// For this test, we assume loadOrRefreshData can proceed or fail gracefully if these are empty.
	}
	httpClient := &http.Client{}
	// These clients are used by loadOrRefreshData if it proceeds with scraping.
	// We need to provide them, but their interactions are not the primary focus of this test.
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)

	// --- Setup expectations for loadOrRefreshData ---
	// loadOrRefreshData calls:
	// 1. store.ListTrendingCoins(ctx)
	// 2. If refresh needed:
	//    - jupiterClient.GetAllCoins(ctx) (within ScrapeAndEnrichToFile -> scrapeJupiter)
	//    - store.Coins().List(ctx)
	//    - store.Coins().Update(ctx, &c) for each coin
	//    - store.Coins().Upsert(ctx, &coin) for each enriched coin
	// For this test, we'll make these lenient to focus on FetchAndStoreNewTokens.

	// Lenient mocks for loadOrRefreshData dependencies
	mockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe() // Allow empty or some data
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("Update", mock.Anything, mock.AnythingOfType("*model.Coin")).Return(nil).Maybe()
	mockCoinRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.Coin")).Return(nil).Maybe()
	// For ScrapeAndEnrichToFile -> scrapeJupiter -> jupiterClient.GetAllCoins
	// This is a complex part of loadOrRefreshData. If needsRefresh is false, it's skipped.
	// To simplify, assume needsRefresh is false by returning a recent trending coin.
	mockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{
		{LastUpdated: time.Now().Format(time.RFC3339)},
	}, nil).Once().// Ensure it's called
	Then(func(args mock.Arguments) { // Subsequent calls can be Maybe
		mockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	})
	// If loadOrRefreshData *does* call GetAllCoins, allow it:
	mockJupiterClient.On("GetAllCoins", mock.Anything).Return(&jupiter.CoinListResponse{Coins: []jupiter.CoinListInfo{}}, nil).Maybe()


	// --- Setup expectations for the new token fetcher's initial call ---
	var wg sync.WaitGroup
	wg.Add(1) // For the initial FetchAndStoreNewTokens call

	jupiterCoins := []jupiter.CoinListInfo{
		{Address: "newCoin1", Name: "New Coin One", Symbol: "NEW1", Decimals: 6},
	}
	jupiterResponse := &jupiter.CoinListResponse{Coins: jupiterCoins}

	// This is the GetNewCoins call from the initial fetch in runNewTokenFetcher
	mockJupiterClient.On("GetNewCoins", mock.Anything).Run(func(args mock.Arguments) {
		// wg.Done() // Done should be after Upsert for more robustness, or just use Times(1)
	}).Return(jupiterResponse, nil).Once() // Expect it once for the initial fetch

	mockStore.On("RawCoins").Return(mockRawCoinRepo).Once() // Called by FetchAndStoreNewTokens
	mockRawCoinRepo.On("Upsert", mock.Anything, mock.AnythingOfType("*model.RawCoin")).Run(func(args mock.Arguments) {
		wg.Done() // Signal that Upsert (end of FetchAndStoreNewTokens processing) has been called
	}).Return(nil).Once() // Expect Upsert once for the newCoin1

	// Call the real NewService
	// This will start the loadOrRefreshData and the runNewTokenFetcher goroutine
	service := NewService(config, httpClient, mockJupiterClient, solanaClient, offchainClient, mockStore)
	require.NotNil(t, service)
	defer service.Shutdown() // Ensure fetcher goroutine is stopped

	// Wait for the initial FetchAndStoreNewTokens to complete
	// Add a timeout to prevent test hanging indefinitely if something goes wrong
	waitTimeout := 5 * time.Second // Reasonable timeout for a local goroutine task
	c := make(chan struct{})
	go func() {
		defer close(c)
		wg.Wait()
	}()
	select {
	case <-c:
		// WaitGroup finished within timeout
	case <-time.After(waitTimeout):
		t.Fatal("Timeout waiting for initial new token fetch to complete. Mocks for GetNewCoins or Upsert might not have been called as expected.")
	}

	// Verify all expectations
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
	// solanaClient and offchainClient might have been called by loadOrRefreshData,
	// but we are not asserting their calls strictly here as they are not the focus.
}
