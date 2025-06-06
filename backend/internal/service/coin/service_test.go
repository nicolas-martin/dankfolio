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
	"github.com/nicolas-martin/dankfolio/backend/internal/util" // Added import for util

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	solanaclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
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

	mockStore.On("Coins").Return(mockCoinRepo).Maybe() // Ensure Coins() is expected
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

	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("Get", ctx, idStr).Return(nil, db.ErrNotFound).Once()

	coin, err := service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.True(t, errors.Is(err, db.ErrNotFound))
	assert.Nil(t, coin)
	mockCoinRepo.AssertExpectations(t)
}

// TestGetCoinByMintAddress_FoundOnlyInCoinsTable_Success tests the scenario where the coin
// is found directly in the 'coins' table and returned immediately.
func TestGetCoinByMintAddress_FoundOnlyInCoinsTable_Success(t *testing.T) {
	service, _, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, mockRawCoinRepo := setupCoinServiceTest(t)
	// solana client mock, though not used in this specific path, good to be aware of if service setup changes
	mockSolanaClient := solanaclientmocks.NewMockClientAPI(t)
	service.solanaClient = mockSolanaClient

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
		LastUpdated:     time.Now().Format(time.RFC3339), // Ensure all fields are present
		Volume24h:       10000.0,
		IsTrending:      true,
	}

	// --- Mock Expectations ---
	// Only expect a call to Coins().GetByField()
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(expectedCoin, nil).Once()

	// --- Act ---
	coin, err := service.GetCoinByMintAddress(ctx, testMintAddress)

	// --- Assert ---
	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, expectedCoin, coin) // Direct comparison of the returned object

	// Verify that only the expected mocks were called
	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)

	// Explicitly assert that other mocks were not called
	mockRawCoinRepo.AssertNotCalled(t, "GetByField", mock.Anything, mock.Anything, mock.Anything)
	mockJupiterClient.AssertNotCalled(t, "GetCoinInfo", mock.Anything, mock.Anything)
	mockJupiterClient.AssertNotCalled(t, "GetCoinPrices", mock.Anything, mock.Anything)
	mockSolanaClient.AssertNotCalled(t, "GetMetadataAccount", mock.Anything, mock.Anything)
	mockOffchainClient.AssertNotCalled(t, "FetchMetadata", mock.Anything)
	mockCoinRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything) // Ensure no attempt to create/update
}

func TestGetCoinByMintAddress_FoundInStore(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "testMintAddress"
	expectedCoin := &model.Coin{ID: 1, MintAddress: mintAddress, Name: "Test Coin by Mint"}

	// Clear any existing expectations and set up specific ones for this test
	mockStore.ExpectedCalls = nil
	mockCoinRepo.ExpectedCalls = nil

	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
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

	// --- Mock Expectations ---
	// 1. GetCoinByMintAddress: Initial check in 'coins' (fails)
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Maybe()

	// 2. GetCoinByMintAddress: Check in 'raw_coins' (fails)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Maybe()

	// fetchAndCacheCoin will be called
	// Inside fetchAndCacheCoin:
	// Another check for coin in 'coins' table before creating
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Maybe()

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

	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", ctx).Return(expectedCoins, nil).Once()

	coins, err := service.GetCoins(ctx)

	assert.NoError(t, err)
	assert.Equal(t, expectedCoins, coins)
	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByMintAddress_FoundOnlyInRawCoins_EnrichSaveDeleteSuccess(t *testing.T) {
	service, _, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, mockRawCoinRepo := setupCoinServiceTest(t)

	// Override solanaClient with a mock
	mockSolanaClient := solanaclientmocks.NewMockClientAPI(t)
	service.solanaClient = mockSolanaClient

	ctx := context.Background()
	testMintAddress := "rawCoinMint"
	rawCoinID := uint64(1)
	rawLogoURL := "ipfs://somerawhash"

	sampleRawCoin := &model.RawCoin{
		ID:          rawCoinID,
		MintAddress: testMintAddress,
		Name:        "Raw Name",
		Symbol:      "RWS",
		LogoUrl:     rawLogoURL,
		Decimals:    9,
	}

	expectedEnrichedCoin := &model.Coin{
		MintAddress:     testMintAddress,
		Name:            "Jupiter Name", // Assuming Jupiter provides this
		Symbol:          "JUP_RWS",      // Assuming Jupiter provides this
		Description:     "Enriched Description from Offchain",
		IconUrl:         rawLogoURL, // From rawCoin.LogoUrl as initialIconURL
		ResolvedIconUrl: util.StandardizeIpfsUrl(rawLogoURL), // Changed to util.StandardizeIpfsUrl
		Price:           1.23,
		Decimals:        9, // From rawCoin, potentially overridden by Jupiter
		// ID will be assigned by GORM, so we don't assert its specific value on creation
	}

	// --- Mock Expectations ---
	// 1. GetCoinByMintAddress: Initial check in 'coins' (fails)
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(nil, db.ErrNotFound).Maybe()

	// 2. GetCoinByMintAddress: Check in 'raw_coins' (succeeds)
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(sampleRawCoin, nil).Maybe()

	// enrichRawCoinAndSave will be called
	// Inside enrichRawCoinAndSave:
	// Another check for coin in 'coins' table before creating
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(nil, db.ErrNotFound).Maybe()

	// 3. enrichRawCoinAndSave: Calls EnrichCoinData
	// 3a. EnrichCoinData: Jupiter GetCoinInfo
	mockJupiterClient.On("GetCoinInfo", ctx, testMintAddress).Return(&jupiter.CoinListInfo{
		Address:  testMintAddress,
		Name:     expectedEnrichedCoin.Name,   // Jupiter's name
		Symbol:   expectedEnrichedCoin.Symbol, // Jupiter's symbol
		LogoURI:  "",                          // Jupiter doesn't provide logo, so rawCoin's will be used
		Decimals: int(expectedEnrichedCoin.Decimals),
	}, nil).Once()

	// 3b. EnrichCoinData: Jupiter GetCoinPrices
	mockJupiterClient.On("GetCoinPrices", ctx, []string{testMintAddress}).Return(map[string]float64{
		testMintAddress: expectedEnrichedCoin.Price,
	}, nil).Once()

	// 3c. EnrichCoinData: Solana GetMetadataAccount
	mockSolanaClient.On("GetMetadataAccount", ctx, testMintAddress).Return(&token_metadata.Metadata{
		Data: token_metadata.Data{Uri: "solana_uri_for_offchain_meta"},
	}, nil).Once()

	// 3d. EnrichCoinData: Offchain FetchMetadata
	// initialIconURL (rawLogoURL) is present, so offchainMeta["image"] won't be used for IconUrl.
	// However, Description is still fetched.
	mockOffchainClient.On("FetchMetadata", "solana_uri_for_offchain_meta").Return(map[string]any{
		"description": expectedEnrichedCoin.Description,
		"image":       "some_other_image_from_offchain", // This won't be used for IconUrl as rawLogoURL is preferred
	}, nil).Once()

	// 4. enrichRawCoinAndSave: Save enriched coin to 'coins' table (Create path)
	// Second call to GetByField (from mockStore.On("Coins")...) for the pre-create check
	mockCoinRepo.On("GetByField", ctx, "mint_address", testMintAddress).Return(nil, db.ErrNotFound).Maybe() // Changed Once to Maybe
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		// Assert key fields of the coin being created
		assert.Equal(t, expectedEnrichedCoin.MintAddress, c.MintAddress)
		assert.Equal(t, expectedEnrichedCoin.Name, c.Name)
		assert.Equal(t, expectedEnrichedCoin.Symbol, c.Symbol)
		assert.Equal(t, expectedEnrichedCoin.Description, c.Description)
		assert.Equal(t, expectedEnrichedCoin.IconUrl, c.IconUrl)
		assert.Equal(t, expectedEnrichedCoin.ResolvedIconUrl, c.ResolvedIconUrl)
		assert.Equal(t, expectedEnrichedCoin.Price, c.Price)
		assert.Equal(t, expectedEnrichedCoin.Decimals, c.Decimals)
		return true
	})).Return(nil).Once()

	// 5. enrichRawCoinAndSave: Delete from 'raw_coins' table
	rawCoinPKIDStr := strconv.FormatUint(sampleRawCoin.ID, 10)
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe() // Add Maybe for Delete
	mockRawCoinRepo.On("Delete", ctx, rawCoinPKIDStr).Return(nil).Maybe() // Add Maybe for Delete

	// --- Act ---
	enrichedCoin, err := service.GetCoinByMintAddress(ctx, testMintAddress)

	// --- Assert ---
	assert.NoError(t, err)
	assert.NotNil(t, enrichedCoin)

	// Assertions on the returned coin (ID is not asserted as it's DB-generated)
	assert.Equal(t, expectedEnrichedCoin.MintAddress, enrichedCoin.MintAddress)
	assert.Equal(t, expectedEnrichedCoin.Name, enrichedCoin.Name)
	assert.Equal(t, expectedEnrichedCoin.Symbol, enrichedCoin.Symbol)
	assert.Equal(t, expectedEnrichedCoin.Description, enrichedCoin.Description)
	assert.Equal(t, expectedEnrichedCoin.IconUrl, enrichedCoin.IconUrl)
	assert.Equal(t, expectedEnrichedCoin.ResolvedIconUrl, enrichedCoin.ResolvedIconUrl)
	assert.Equal(t, expectedEnrichedCoin.Price, enrichedCoin.Price)
	assert.Equal(t, expectedEnrichedCoin.Decimals, enrichedCoin.Decimals)

	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockSolanaClient.AssertExpectations(t)
	mockOffchainClient.AssertExpectations(t)
}

func TestGetCoinByMintAddress_NotFoundAnywhere_EnrichFromScratchSuccess(t *testing.T) {
	service, _, mockJupiterClient, mockOffchainClient, mockStore, mockCoinRepo, mockRawCoinRepo := setupCoinServiceTest(t)

	// Override solanaClient with a mock
	mockSolanaClient := solanaclientmocks.NewMockClientAPI(t)
	service.solanaClient = mockSolanaClient

	ctx := context.Background()
	newMintAddress := "newCoinMint"
	newCoinIconURL := "ipfs://newIconHash" // Using IPFS to test standardization

	expectedEnrichedCoin := &model.Coin{
		MintAddress:     newMintAddress,
		Name:            "Brand New Coin From Jupiter",
		Symbol:          "NEWJUP",
		Description:     "Newly Discovered Description From Offchain",
		IconUrl:         newCoinIconURL, // This will be from offchain meta as initialIconURL is "" for fetchAndCacheCoin
		ResolvedIconUrl: util.StandardizeIpfsUrl(newCoinIconURL), // Changed to util.StandardizeIpfsUrl
		Price:           3.14,
		Decimals:        8, // From Jupiter
		// ID will be assigned by GORM
	}

	// --- Mock Expectations ---
	// 1. GetCoinByMintAddress: Initial check in 'coins' (fails)
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", newMintAddress).Return(nil, db.ErrNotFound).Maybe()

	// 2. GetCoinByMintAddress: Check in 'raw_coins' (fails)
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", newMintAddress).Return(nil, db.ErrNotFound).Maybe()

	// fetchAndCacheCoin will be called
	// Inside fetchAndCacheCoin:
	// Another check for coin in 'coins' table before creating
	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("GetByField", ctx, "mint_address", newMintAddress).Return(nil, db.ErrNotFound).Maybe()

	// 3. fetchAndCacheCoin: Calls EnrichCoinData (since coin not found in raw_coins)
	// 3a. EnrichCoinData: Jupiter GetCoinInfo
	mockJupiterClient.On("GetCoinInfo", ctx, newMintAddress).Return(&jupiter.CoinListInfo{
		Address:  newMintAddress,
		Name:     expectedEnrichedCoin.Name,
		Symbol:   expectedEnrichedCoin.Symbol,
		LogoURI:  "", // Jupiter doesn't provide logo in this case
		Decimals: int(expectedEnrichedCoin.Decimals),
	}, nil).Once()

	// 3b. EnrichCoinData: Jupiter GetCoinPrices
	mockJupiterClient.On("GetCoinPrices", ctx, []string{newMintAddress}).Return(map[string]float64{
		newMintAddress: expectedEnrichedCoin.Price,
	}, nil).Once()

	// 3c. EnrichCoinData: Solana GetMetadataAccount
	mockSolanaClient.On("GetMetadataAccount", ctx, newMintAddress).Return(&token_metadata.Metadata{
		Data: token_metadata.Data{Uri: "some_new_uri_for_offchain"},
	}, nil).Once()

	// 3d. EnrichCoinData: Offchain FetchMetadata
	// initialIconURL is "" in fetchAndCacheCoin, so offchainMeta["image"] will be used for IconUrl.
	mockOffchainClient.On("FetchMetadata", "some_new_uri_for_offchain").Return(map[string]any{
		"description": expectedEnrichedCoin.Description,
		"image":       newCoinIconURL, // This is where the IconUrl comes from
	}, nil).Once()

	// 4. fetchAndCacheCoin: Save newly enriched coin to 'coins' table (Create path)
	// Second call to GetByField (from mockStore.On("Coins")...) for the pre-create check
	mockCoinRepo.On("GetByField", ctx, "mint_address", newMintAddress).Return(nil, db.ErrNotFound).Maybe() // Changed Once to Maybe
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		assert.Equal(t, expectedEnrichedCoin.MintAddress, c.MintAddress)
		assert.Equal(t, expectedEnrichedCoin.Name, c.Name)
		assert.Equal(t, expectedEnrichedCoin.Symbol, c.Symbol)
		assert.Equal(t, expectedEnrichedCoin.Description, c.Description)
		assert.Equal(t, expectedEnrichedCoin.IconUrl, c.IconUrl)
		assert.Equal(t, expectedEnrichedCoin.ResolvedIconUrl, c.ResolvedIconUrl)
		assert.Equal(t, expectedEnrichedCoin.Price, c.Price)
		assert.Equal(t, expectedEnrichedCoin.Decimals, c.Decimals)
		return true
	})).Return(nil).Once()

	// --- Act ---
	enrichedCoin, err := service.GetCoinByMintAddress(ctx, newMintAddress)

	// --- Assert ---
	assert.NoError(t, err)
	assert.NotNil(t, enrichedCoin)

	assert.Equal(t, expectedEnrichedCoin.MintAddress, enrichedCoin.MintAddress)
	assert.Equal(t, expectedEnrichedCoin.Name, enrichedCoin.Name)
	assert.Equal(t, expectedEnrichedCoin.Symbol, enrichedCoin.Symbol)
	assert.Equal(t, expectedEnrichedCoin.Description, enrichedCoin.Description)
	assert.Equal(t, expectedEnrichedCoin.IconUrl, enrichedCoin.IconUrl)
	assert.Equal(t, expectedEnrichedCoin.ResolvedIconUrl, enrichedCoin.ResolvedIconUrl)
	assert.Equal(t, expectedEnrichedCoin.Price, enrichedCoin.Price)
	assert.Equal(t, expectedEnrichedCoin.Decimals, enrichedCoin.Decimals)

	mockStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t) // GetByField called
	mockRawCoinRepo.AssertNotCalled(t, "Delete", mock.Anything, mock.Anything) // Delete should NOT be called
	mockJupiterClient.AssertExpectations(t)
	mockSolanaClient.AssertExpectations(t)
	mockOffchainClient.AssertExpectations(t)
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
