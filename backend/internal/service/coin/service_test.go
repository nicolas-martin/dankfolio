package coin

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	jupiterMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	offchainMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	solanaMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestNewService(t *testing.T) {
	// Setup
	config := &Config{
		TrendingTokenPath: "testdata/trending_solana_tokens_enriched.json",
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
	}
	httpClient := &http.Client{}
	jupiterClient := new(jupiterMocks.ClientAPI)
	store := new(dbMocks.Store)

	// Test
	service := NewService(config, httpClient, jupiterClient, store)

	// Assertions
	assert.NotNil(t, service)
	assert.Equal(t, config, service.config)
	assert.Equal(t, jupiterClient, service.jupiterClient)
	assert.Equal(t, store, service.store)
}

func TestGetCoins(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := new(dbMocks.Store)
	service := &Service{store: store}

	// Create test coins
	testCoins := []model.Coin{
		{
			ID:          "coin1",
			Name:        "Test Coin 1",
			DailyVolume: 1000.0,
		},
		{
			ID:          "coin2",
			Name:        "Test Coin 2",
			DailyVolume: 2000.0,
		},
	}

	// Setup expectations
	store.On("ListCoins", ctx).Return(testCoins, nil)

	// Test
	coins, err := service.GetCoins(ctx)

	// Assertions
	assert.NoError(t, err)
	assert.Len(t, coins, 2)
	assert.Equal(t, "Test Coin 2", coins[0].Name) // Should be sorted by volume
	assert.Equal(t, "Test Coin 1", coins[1].Name)
	store.AssertExpectations(t)
}

func TestGetTrendingCoins(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := new(dbMocks.Store)
	service := &Service{store: store}

	// Create test coins
	testCoins := []model.Coin{
		{
			ID:          "coin1",
			Name:        "Test Coin 1",
			DailyVolume: 1000.0,
			IsTrending:  true,
		},
		{
			ID:          "coin2",
			Name:        "Test Coin 2",
			DailyVolume: 2000.0,
			IsTrending:  false,
		},
		{
			ID:          "coin3",
			Name:        "Test Coin 3",
			DailyVolume: 3000.0,
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

func TestGetCoinByID(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := new(dbMocks.Store)
	jupiterClient := new(jupiterMocks.ClientAPI)
	solanaClient := new(solanaMocks.ClientAPI)
	offchainClient := new(offchainMocks.ClientAPI)
	service := &Service{
		store:          store,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
	}

	testCoin := model.Coin{
		ID:          "coin1",
		Name:        "Test Coin 1",
		DailyVolume: 1000.0,
		CreatedAt:   time.Now().Format(time.RFC3339),
	}

	// Setup expectations
	store.On("GetCoin", ctx, "coin1").Return(&testCoin, nil)

	// Test cases
	t.Run("Existing coin", func(t *testing.T) {
		// Test
		coin, err := service.GetCoinByID(ctx, "coin1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, testCoin.ID, coin.ID)
		assert.Equal(t, testCoin.Name, coin.Name)
		store.AssertExpectations(t)
	})

	t.Run("Non-existent coin with Jupiter fallback", func(t *testing.T) {
		// Setup Jupiter mock
		jupiterInfo := &jupiter.TokenInfoResponse{
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

		store.On("GetCoin", ctx, "newcoin").Return(nil, db.ErrNotFound)
		jupiterClient.On("GetTokenInfo", "newcoin").Return(jupiterInfo, nil)
		jupiterClient.On("GetTokenPrices", []string{"newcoin"}).Return(map[string]float64{"newcoin": 1.5}, nil)
		solanaClient.On("GetMetadataAccount", ctx, "newcoin").Return(metadata, nil)
		offchainClient.On("FetchMetadata", "http://example.com/metadata.json").Return(metadataJSON, nil)
		store.On("UpsertCoin", ctx, mock.AnythingOfType("*model.Coin")).Return(nil)

		// Test
		coin, err := service.GetCoinByID(ctx, "newcoin")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, "newcoin", coin.ID)
		assert.Equal(t, jupiterInfo.Name, coin.Name)
		assert.Equal(t, jupiterInfo.Symbol, coin.Symbol)
		store.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
		solanaClient.AssertExpectations(t)
		offchainClient.AssertExpectations(t)
	})

	t.Run("Non-existent coin with Jupiter error", func(t *testing.T) {
		store.On("GetCoin", ctx, "invalid").Return(nil, db.ErrNotFound)
		jupiterClient.On("GetTokenInfo", "invalid").Return(nil, assert.AnError)

		// Test
		coin, err := service.GetCoinByID(ctx, "invalid")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, coin)
		store.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
	})
}

// NewMockJupiterClient creates a new mock Jupiter client
func NewMockJupiterClient(t interface {
	mock.TestingT
	Cleanup(func())
}) *mocks.ClientAPI {
	return mocks.NewClientAPI(t)
}

// NewMockSolanaClient creates a new mock Solana client
func NewMockSolanaClient(t interface {
	mock.TestingT
	Cleanup(func())
}) *solanaMocks.ClientAPI {
	return solanaMocks.NewClientAPI(t)
}

// NewMockOffchainClient creates a new mock Offchain client
func NewMockOffchainClient(t interface {
	mock.TestingT
	Cleanup(func())
}) *offchainMocks.ClientAPI {
	return offchainMocks.NewClientAPI(t)
}
