package coin

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/memory"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	// Setup
	config := &Config{
		TrendingTokenPath: "testdata/trending_solana_tokens_enriched.json",
		SolanaRPCEndpoint: "https://api.mainnet-beta.solana.com",
	}
	httpClient := &http.Client{}
	jupiterClient := NewMockJupiterClient()
	store := memory.New()

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
	store := memory.New()
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

	// Store test coins
	for _, coin := range testCoins {
		err := store.UpsertCoin(ctx, &coin)
		assert.NoError(t, err)
	}

	// Test
	coins, err := service.GetCoins(ctx)

	// Assertions
	assert.NoError(t, err)
	assert.Len(t, coins, 2)
	assert.Equal(t, "Test Coin 2", coins[0].Name) // Should be sorted by volume
	assert.Equal(t, "Test Coin 1", coins[1].Name)
}

func TestGetTrendingCoins(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := memory.New()
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

	// Store test coins
	for _, coin := range testCoins {
		err := store.UpsertCoin(ctx, &coin)
		assert.NoError(t, err)
	}

	// Test
	coins, err := service.GetTrendingCoins(ctx)

	// Assertions
	assert.NoError(t, err)
	assert.Len(t, coins, 2)
	assert.Equal(t, "Test Coin 3", coins[0].Name) // Should be sorted by volume
	assert.Equal(t, "Test Coin 1", coins[1].Name)
}

func TestGetCoinByID(t *testing.T) {
	// Setup
	ctx := context.Background()
	store := memory.New()
	jupiterClient := NewMockJupiterClient()
	service := &Service{
		store:         store,
		jupiterClient: jupiterClient,
	}

	testCoin := model.Coin{
		ID:          "coin1",
		Name:        "Test Coin 1",
		DailyVolume: 1000.0,
		CreatedAt:   time.Now().Format(time.RFC3339),
	}

	// Store test coin
	err := store.UpsertCoin(ctx, &testCoin)
	assert.NoError(t, err)

	// Test cases
	t.Run("Existing coin", func(t *testing.T) {
		// Test
		coin, err := service.GetCoinByID(ctx, "coin1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, testCoin.ID, coin.ID)
		assert.Equal(t, testCoin.Name, coin.Name)
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
		jupiterClient.On("GetTokenInfo", "newcoin").Return(jupiterInfo, nil)
		jupiterClient.On("GetTokenPrices", []string{"newcoin"}).Return(map[string]float64{"newcoin": 1.5}, nil)

		// Test
		coin, err := service.GetCoinByID(ctx, "newcoin")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, coin)
		assert.Equal(t, "newcoin", coin.ID)
		assert.Equal(t, jupiterInfo.Name, coin.Name)
		assert.Equal(t, jupiterInfo.Symbol, coin.Symbol)
	})

	t.Run("Non-existent coin with Jupiter error", func(t *testing.T) {
		// Setup Jupiter mock
		jupiterClient.On("GetTokenInfo", "invalid").Return(nil, assert.AnError)

		// Test
		coin, err := service.GetCoinByID(ctx, "invalid")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, coin)
	})
}
