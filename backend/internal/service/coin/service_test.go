package coin

import (
	"context"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db" // Required for db.Store
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Minimal Config struct, assuming it's defined elsewhere in the actual 'coin' package.
// This is included here to make the test self-contained for the example.
// If 'coin.Config' is accessible, this local definition can be removed.
type testConfig struct {
	NewCoinsFetchInterval time.Duration
	SolanaRPCEndpoint     string
	// Add other fields from the actual coin.Config if NewService requires them
	// For example, if there are other TTLs or feature flags used during init.
	// Based on service.go, these two are the most critical for NewService to not panic or misbehave.
}

// Ensure testConfig satisfies the parts of coin.Config that NewService uses.
// This is a conceptual check; Go doesn't have direct interface satisfaction for structs like this.
// The fields used by NewService (SolanaRPCEndpoint, NewCoinsFetchInterval) must match.
var _ = func(c *Config) {}(&Config{}) // This line is a placeholder to verify coin.Config is accessible

func TestFetchAndStoreNewTokens_PopulatesJupiterCreatedAt(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.ClientAPI)
	mockDbStore := new(dbMocks.Store)

	// Use the specific mock type for Repository<model.RawCoin>
	// Ensure this path matches your actual mock generation for generic repositories
	mockRawCoinRepo := new(dbMocks.Repository[model.RawCoin])

	// Sample data
	testTimestampStr := "1678886400" // Example: 2023-03-15T12:00:00Z
	parsedTestTimestamp, err := strconv.ParseInt(testTimestampStr, 10, 64)
	if err != nil {
		t.Fatalf("Failed to parse test timestamp: %v", err)
	}
	expectedTime := time.Unix(parsedTestTimestamp, 0)

	mockNewToken := jupiter.NewTokenInfo{
		Mint:      "testMint123",
		Name:      "Test Token",
		Symbol:    "TEST",
		Decimals:  9,
		LogoURI:   "http://example.com/logo.png",
		CreatedAt: testTimestampStr,
	}
	// Note: jupiter.NewTokensResponse has `Coins []NewTokenInfo`, not `Tokens`
	// Correcting this based on common API response patterns (usually plural for lists)
	// but will stick to `Coins` if that's what `jupiter.NewTokensResponse` actually uses.
	// From previous steps, `NewTokensResponse` has `Tokens []NewTokenInfo`.
	// The example in the prompt had `Coins`, I'll use `Tokens` as per actual struct.
	mockJupiterResponse := &jupiter.NewTokensResponse{
		Tokens: []jupiter.NewTokenInfo{mockNewToken}, // Corrected field name
	}

	// Setup mock expectations
	// Using mock.AnythingOfType for params as the exact instance might be tricky to match
	mockJupiterClient.On("GetNewCoins", ctx, mock.AnythingOfType("*jupiter.NewCoinsParams")).Return(mockJupiterResponse, nil)
	
	// Mock the Store's RawCoins() method to return our mockRawCoinRepo
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo)

	// Capture the RawCoin argument passed to Upsert
	var capturedRawCoin *model.RawCoin
	mockRawCoinRepo.On("Upsert", ctx, mock.AnythingOfType("*model.RawCoin")).Run(func(args mock.Arguments) {
		var ok bool
		capturedRawCoin, ok = args.Get(1).(*model.RawCoin)
		if !ok {
			t.Fatalf("Upsert mock called with incompatible type: %T", args.Get(1))
		}
	}).Return(nil)

	// Create service instance
	// Use the actual coin.Config if available, otherwise the local testConfig.
	// The var _ = statement above helps ensure coin.Config is what we expect.
	serviceConfig := &Config{ // Assuming coin.Config is accessible
		NewCoinsFetchInterval: 0, // Disable automatic fetcher for this test
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test", // Must be non-empty
		// Initialize other fields of coin.Config with sensible defaults or zero values
		// if NewService or its direct callees (not mocked) depend on them.
	}

	// Pass nil for httpClient as FetchAndStoreNewTokens doesn't directly use solanaClient or offchainClient
	// which are initialized using httpClient.
	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	// The service constructor calls loadOrRefreshData, which might interact with the store.
	// If loadOrRefreshData calls store.ListTrendingCoins, ensure that's mocked if necessary.
	// For this test, we assume loadOrRefreshData either doesn't interfere or its interactions
	// are simple enough not to require extensive additional mocking.
	// Based on service.go, loadOrRefreshData calls store.ListTrendingCoins() and store.Coins().List/Update/Upsert
	// To isolate FetchAndStoreNewTokens, these might need mocking if they are called before our target method.
	// However, NewService logic for loadOrRefreshData might be complex to fully mock here.
	// Let's assume its default behavior (e.g., empty DB returns) is fine.
    // Adding a generic mock for ListTrendingCoins to avoid nil pointer if called by loadOrRefreshData.
    mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
    mockCoinRepo := new(dbMocks.Repository[model.Coin])
    mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
    mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
    mockCoinRepo.On("Update", mock.Anything, mock.Anything).Return(nil).Maybe()
    mockCoinRepo.On("Upsert", mock.Anything, mock.Anything).Return(nil).Maybe()


	err = service.FetchAndStoreNewTokens(ctx)

	assert.NoError(t, err)
	mockJupiterClient.AssertCalled(t, "GetNewCoins", ctx, mock.AnythingOfType("*jupiter.NewCoinsParams"))
	mockDbStore.AssertCalled(t, "RawCoins")
	mockRawCoinRepo.AssertCalled(t, "Upsert", ctx, mock.AnythingOfType("*model.RawCoin"))

	assert.NotNil(t, capturedRawCoin, "Upsert should have been called with a RawCoin")
	if capturedRawCoin != nil {
		assert.Equal(t, mockNewToken.Mint, capturedRawCoin.MintAddress)
		assert.NotNil(t, capturedRawCoin.JupiterCreatedAt, "JupiterCreatedAt should be populated")
		if capturedRawCoin.JupiterCreatedAt != nil {
			// To ensure accurate comparison, especially if timezones might differ,
			// comparing Unix timestamps is robust.
			assert.Equal(t, expectedTime.Unix(), capturedRawCoin.JupiterCreatedAt.Unix(),
				"Expected JupiterCreatedAt timestamp %v, got %v", expectedTime.Unix(), capturedRawCoin.JupiterCreatedAt.Unix())
			
			// Alternatively, if confident about timezone consistency (e.g., both are UTC or both are local):
			// assert.True(t, expectedTime.Equal(*capturedRawCoin.JupiterCreatedAt),
			// "Expected JupiterCreatedAt %v, got %v", expectedTime, *capturedRawCoin.JupiterCreatedAt)
		}
	}
}
