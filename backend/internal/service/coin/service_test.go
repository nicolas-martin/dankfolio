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
	offchainMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	solanaMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
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
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	store := dbMocks.NewMockStore(t)

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
	store := dbMocks.NewMockStore(t)
	service := &Service{store: store}

	// Create test coins
	testCoins := []model.Coin{
		{
			MintAddress: "coin1",
			Name:        "Test Coin 1",
			Volume24h:   1000.0,
		},
		{
			Volume24h: 2000.0,
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
	store := dbMocks.NewMockStore(t)
	service := &Service{store: store}

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

func TestGetCoinByID(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := dbMocks.NewMockStore(t)
	jupiterClient := jupiterMocks.NewMockClientAPI(t)
	solanaClient := solanaMocks.NewMockClientAPI(t)
	offchainClient := offchainMocks.NewMockClientAPI(t)
	service := &Service{
		store:          store,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
	}

	testCoin := model.Coin{
		MintAddress: "coin1",
		Name:        "Test Coin 1",
		Volume24h:   1000.0,
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
		assert.Equal(t, testCoin.MintAddress, coin.MintAddress)
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

		store.On("GetCoin", ctx, "newcoin").Return(nil, errors.New("not found"))
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
		assert.Equal(t, "newcoin", coin.MintAddress)
		assert.Equal(t, jupiterInfo.Name, coin.Name)
		assert.Equal(t, jupiterInfo.Symbol, coin.Symbol)
		store.AssertExpectations(t)
		jupiterClient.AssertExpectations(t)
		solanaClient.AssertExpectations(t)
		offchainClient.AssertExpectations(t)
	})

	t.Run("Non-existent coin with Jupiter error", func(t *testing.T) {
		store.On("GetCoin", ctx, "invalid").Return(nil, errors.New("not found"))
		jupiterClient.On("GetTokenInfo", "invalid").Return(nil, assert.AnError)
		jupiterClient.On("GetTokenPrices", []string{"invalid"}).Return(map[string]float64{"invalid": 0}, assert.AnError)
		solanaClient.On("GetMetadataAccount", ctx, "invalid").Return(nil, assert.AnError)

		// Test
		coin, err := service.GetCoinByID(ctx, "invalid")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, coin)
		store.AssertExpectations(t)
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
