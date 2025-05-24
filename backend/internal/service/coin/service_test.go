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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// mockService extends Service to override loadOrRefreshData
type mockService struct {
	*Service                // Embed as pointer to allow method overriding
	loadOrRefreshDataCalled bool
}

func newMockService(config *Config, httpClient *http.Client, jupiterClient jupiter.ClientAPI, solanaClient solana.ClientAPI, offchainClient offchain.ClientAPI, store db.Store) *mockService {
	baseService := &Service{
		config:         config,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
		store:          store,
	}
	s := &mockService{
		Service: baseService,
	}

	// Call loadOrRefreshData immediately to match the behavior of NewService
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
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
