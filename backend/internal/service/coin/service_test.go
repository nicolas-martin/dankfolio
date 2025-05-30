package coin

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	offchainMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db" // Imported for db.ErrNotFound
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)


func TestFetchAndStoreNewTokens_SuccessLoop(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockRawCoinRepo := new(dbMocks.MockRepository[model.RawCoin])

	testTimestampStr := "1678886400"
	parsedTestTimestamp, _ := strconv.ParseInt(testTimestampStr, 10, 64)
	expectedTime := time.Unix(parsedTestTimestamp, 0)

	mockNewTokens := []jupiter.NewTokenInfo{
		{Mint: "mint1", Name: "Token 1", Symbol: "TKN1", CreatedAt: testTimestampStr},
		{Mint: "mint2", Name: "Token 2", Symbol: "TKN2", CreatedAt: testTimestampStr},
	}
	mockJupiterResponse := &jupiter.NewTokensResponse{Tokens: mockNewTokens}

	mockJupiterClient.On("GetNewCoins", ctx, mock.AnythingOfType("*jupiter.NewCoinsParams")).Return(mockJupiterResponse, nil)
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo)

	// Mock GetByField, Create/Update loop
	// Token 1 (new)
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint1").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "mint1"
	})).Return(nil).Once()

	// Token 2 (existing)
	existingRawCoin2 := &model.RawCoin{ID: 2, MintAddress: "mint2", Name: "Old Token 2"}
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint2").Return(existingRawCoin2, nil).Once()
	mockRawCoinRepo.On("Update", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "mint2" && rc.ID == existingRawCoin2.ID && rc.Name == "Token 2"
	})).Return(nil).Once()
	
	serviceConfig := &Config{
		NewCoinsFetchInterval: 0,
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test",
	}
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	err := service.FetchAndStoreNewTokens(ctx)

	assert.NoError(t, err)
	mockJupiterClient.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)

	// Verify JupiterCreatedAt was populated (check one of the created/updated coins)
    // This requires capturing args, which makes the mock setup more complex if checking all.
    // For simplicity, AssertExpectations ensures the flow. If detailed field check needed, capture args in mocks.
}


func TestGetAllTokens_SuccessLoop(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockRawCoinRepo := new(dbMocks.MockRepository[model.RawCoin])

	serviceConfig := &Config{
		NewCoinsFetchInterval: 0,
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test",
	}

	mockJupiterAPICoins := []jupiter.Coin{
		{MintAddress: "mint1", Name: "Token One", Symbol: "ONE"},
		{MintAddress: "mint2", Name: "Token Two", Symbol: "TWO"},
	}
	mockJupiterResponse := &jupiter.CoinListResponse{Coins: mockJupiterAPICoins}

	mockJupiterClient.On("GetAllCoins", ctx).Return(mockJupiterResponse, nil)
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo)

	// Mock GetByField, Create/Update loop
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint1").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "mint1" })).Return(nil).Once()
	
	existingRawCoin2 := &model.RawCoin{ID: 20, MintAddress: "mint2", Name: "Old Token Two"}
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint2").Return(existingRawCoin2, nil).Once()
	mockRawCoinRepo.On("Update", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { 
		return rc.MintAddress == "mint2" && rc.ID == existingRawCoin2.ID && rc.Name == "Token Two"
	})).Return(nil).Once()

	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	_, err := service.GetAllTokens(ctx)

	assert.NoError(t, err)
	mockJupiterClient.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
}

func TestGetAllTokens_JupiterAPIFailure(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockRawCoinRepo := new(dbMocks.MockRepository[model.RawCoin])

	serviceConfig := &Config{
		NewCoinsFetchInterval: 0,
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test",
	}
	expectedErr := assert.AnError
	mockJupiterClient.On("GetAllCoins", ctx).Return(nil, expectedErr)

	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	_, err := service.GetAllTokens(ctx)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, expectedErr))
	mockJupiterClient.AssertExpectations(t)
	mockRawCoinRepo.AssertNotCalled(t, "GetByField")
	mockRawCoinRepo.AssertNotCalled(t, "Create")
	mockRawCoinRepo.AssertNotCalled(t, "Update")
}

func TestGetAllTokens_IndividualDBFailure(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockRawCoinRepo := new(dbMocks.MockRepository[model.RawCoin])

	serviceConfig := &Config{
		NewCoinsFetchInterval: 0,
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test",
	}
	mockJupiterAPICoins := []jupiter.Coin{
		{MintAddress: "mint1", Name: "Token One"},
		{MintAddress: "mint2", Name: "Token Two"}, // This one will fail DB op
		{MintAddress: "mint3", Name: "Token Three"},
	}
	mockJupiterResponse := &jupiter.CoinListResponse{Coins: mockJupiterAPICoins}
	mockJupiterClient.On("GetAllCoins", ctx).Return(mockJupiterResponse, nil)
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo)

	expectedDbErr := assert.AnError

	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint1").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "mint1" })).Return(nil).Once()
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint2").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "mint2" })).Return(expectedDbErr).Once()
	existingToken3 := &model.RawCoin{ID: 3, MintAddress: "mint3", Name: "Old Name"}
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "mint3").Return(existingToken3, nil).Once()
	mockRawCoinRepo.On("Update", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool { return rc.MintAddress == "mint3" && rc.ID == 3 })).Return(nil).Once()

	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	apiResp, err := service.GetAllTokens(ctx)

	assert.NoError(t, err) 
	assert.NotNil(t, apiResp)
	assert.Equal(t, mockJupiterResponse, apiResp)
	mockJupiterClient.AssertExpectations(t)
	mockRawCoinRepo.AssertExpectations(t)
}

func TestGetAllTokens_NoTokensFromJupiter(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockRawCoinRepo := new(dbMocks.MockRepository[model.RawCoin])

	serviceConfig := &Config{
		NewCoinsFetchInterval: 0,
		SolanaRPCEndpoint:     "dummy_rpc_endpoint_for_test",
	}
	mockJupiterResponse := &jupiter.CoinListResponse{Coins: []jupiter.Coin{}}
	mockJupiterClient.On("GetAllCoins", ctx).Return(mockJupiterResponse, nil)
	
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(serviceConfig, nil, mockJupiterClient, mockDbStore)
	apiResp, err := service.GetAllTokens(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, apiResp)
	assert.Empty(t, apiResp.Coins)
	mockJupiterClient.AssertExpectations(t)
	mockRawCoinRepo.AssertNotCalled(t, "GetByField")
	mockRawCoinRepo.AssertNotCalled(t, "Create")
	mockRawCoinRepo.AssertNotCalled(t, "Update")
}

func TestLoadOrRefreshData_DataIsFresh(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	cfg := &Config{SolanaRPCEndpoint: "dummy"}

	freshCoin := model.Coin{MintAddress: "freshCoin", LastUpdated: time.Now().Format(time.RFC3339), IsTrending: true}
	mockDbStore.On("ListTrendingCoins", ctx).Return([]model.Coin{freshCoin}, nil).Once()
	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe() 
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe() // For NewService init

	_ = NewService(cfg, nil, mockJupiterClient, mockDbStore)

	mockDbStore.AssertExpectations(t)
	mockCoinRepo.AssertNotCalled(t, "List")
	mockCoinRepo.AssertNotCalled(t, "BulkUpsert")
	mockCoinRepo.AssertNotCalled(t, "GetByField")
	mockCoinRepo.AssertNotCalled(t, "Create")
	mockCoinRepo.AssertNotCalled(t, "Update")
	mockJupiterClient.AssertNotCalled(t, "GetStrictList") // After init
}

func TestLoadOrRefreshData_RefreshSuccess_FullScenario(t *testing.T) {
	ctx := context.Background()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockOffchainClient := new(offchainMocks.ClientAPI)
	mockDbStore := new(dbMocks.MockStore)
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])

	cfg := &Config{SolanaRPCEndpoint: "dummy", OffchainDataSources: []string{"source1"}}

	oldCoinTime := time.Now().Add(-2 * TrendingDataTTL).Format(time.RFC3339)
	mockDbStore.On("ListTrendingCoins", ctx).Return([]model.Coin{{MintAddress: "old", LastUpdated: oldCoinTime}}, nil).Once()

	strictListCoins := []jupiter.CoinMetadata{
		{Address: "newMint1", Name: "New Coin 1", Symbol: "NC1"},
		{Address: "existingMintToUpdate", Name: "Existing To Update", Symbol: "ETU"},
	}
	mockJupiterClient.On("GetStrictList", ctx).Return(strictListCoins, nil).Once()
	mockOffchainClient.On("GetCoinData", ctx, "newMint1").Return(&model.OffchainCoinData{Name: "New Coin 1 Enriched"}, nil).Once()
	mockOffchainClient.On("GetCoinData", ctx, "existingMintToUpdate").Return(&model.OffchainCoinData{Name: "Existing Updated Enriched"}, nil).Once()

	dbExistingCoins := []model.Coin{
		{ID: 1, MintAddress: "dbCoin1", Name: "DB Coin One", IsTrending: true},
		{ID: 2, MintAddress: "existingMintToUpdate", Name: "Old Name ETU", IsTrending: true},
		{ID: 3, MintAddress: "dbCoinNonTrending", Name: "DB Coin NonTrending", IsTrending: false},
	}
	mockDbStore.On("Coins").Return(mockCoinRepo) 
	mockCoinRepo.On("List", ctx).Return(dbExistingCoins, nil).Once()
	
	var capturedExistingCoinsUpdate *[]model.Coin
	mockCoinRepo.On("BulkUpsert", ctx, mock.MatchedBy(func(items *[]model.Coin) bool {
		if items == nil || len(*items) == 0 { return false }
		// Check if this is the call to update existing coins to IsTrending=false
		isUpdateCall := true
		for _, item := range *items {
			if item.IsTrending { isUpdateCall = false; break }
			if !(item.MintAddress == "dbCoin1" || item.MintAddress == "existingMintToUpdate") {
				isUpdateCall = false; break
			}
		}
		if isUpdateCall { capturedExistingCoinsUpdate = items}
		return isUpdateCall
	})).Return(int64(2), nil).Once()

	// Mocks for storing/updating enriched coins (loop of GetByField, Update/Create)
	// Enriched Coin 1 ("newMint1") - expect Create
	mockCoinRepo.On("GetByField", ctx, "mint_address", "newMint1").Return(nil, db.ErrNotFound).Once()
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == "newMint1" && c.Name == "New Coin 1 Enriched" && c.IsTrending
	})).Return(nil).Once()

	// Enriched Coin 2 ("existingMintToUpdate") - expect Update
	mockExistingCoinForEnrichUpdate := &model.Coin{ID: 2, MintAddress: "existingMintToUpdate", Name: "Old Name ETU", IsTrending: false} 
	mockCoinRepo.On("GetByField", ctx, "mint_address", "existingMintToUpdate").Return(mockExistingCoinForEnrichUpdate, nil).Once()
	mockCoinRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == "existingMintToUpdate" &&
			c.Name == "Existing Updated Enriched" &&
			c.ID == mockExistingCoinForEnrichUpdate.ID && c.IsTrending
	})).Return(nil).Once()
	
	service := NewService(cfg, nil, mockJupiterClient, mockDbStore)
	service.offchainClient = mockOffchainClient 

	mockDbStore.AssertExpectations(t)
	mockCoinRepo.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockOffchainClient.AssertExpectations(t)

	assert.NotNil(t, capturedExistingCoinsUpdate)
	if capturedExistingCoinsUpdate != nil {
		assert.Len(t, *capturedExistingCoinsUpdate, 2)
	}
}


func TestGetCoinByID_SuccessByID(t *testing.T) {
	ctx := context.Background()
	mockDbStore := new(dbMocks.MockStore)
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	cfg := &Config{SolanaRPCEndpoint: "dummy"}

	expectedID := uint64(123)
	idStr := strconv.FormatUint(expectedID, 10)
	expectedCoin := &model.Coin{ID: expectedID, MintAddress: "mintForID123", Name: "Test Coin by ID"}

	mockDbStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("Get", ctx, idStr).Return(expectedCoin, nil).Once()
	
	// Mocks for NewService init
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient := new(jupiterMocks.MockClientAPI) // Need this for NewService
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()


	service := NewService(cfg, nil, mockJupiterClient, mockDbStore)
	coin, err := service.GetCoinByID(ctx, idStr)

	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByID_SuccessByMintAddress(t *testing.T) {
	ctx := context.Background()
	mockDbStore := new(dbMocks.MockStore)
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	cfg := &Config{SolanaRPCEndpoint: "dummy"}

	mintAddress := "testMintAddress"
	expectedCoin := &model.Coin{ID: 1, MintAddress: mintAddress, Name: "Test Coin by Mint"}

	// First, Get by numeric ID will be attempted if mintAddress happens to be numeric (not in this case)
	// Then, GetByField will be called.
	mockDbStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(expectedCoin, nil).Once()

	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	mockJupiterClient := new(jupiterMocks.MockClientAPI)
	mockJupiterClient.On("GetStrictList", mock.Anything).Return([]jupiter.CoinMetadata{}, nil).Maybe()

	service := NewService(cfg, nil, mockJupiterClient, mockDbStore)
	coin, err := service.GetCoinByID(ctx, mintAddress)

	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
	mockCoinRepo.AssertExpectations(t)
}

func TestGetCoinByID_NotFound_EnrichmentSuccess(t *testing.T) {
	ctx := context.Background()
	mockDbStore := new(dbMocks.MockStore)
	mockCoinRepo := new(dbMocks.MockRepository[model.Coin])
	mockJupiterClient := new(jupiterMocks.MockClientAPI) // For NewService and ScrapeAndEnrichToFile via EnrichCoinData
	mockOffchainClient := new(offchainMocks.ClientAPI) // For EnrichCoinData

	cfg := &Config{SolanaRPCEndpoint: "dummy", OffchainDataSources: []string{"source1"}}
	mintAddress := "unknownMint"
	enrichedCoin := &model.Coin{MintAddress: mintAddress, Name: "Enriched Coin", Symbol: "ENR", Decimals: 6, ID: 0} // ID is 0 before Create

	mockDbStore.On("Coins").Return(mockCoinRepo)
	// Get by numeric ID (assuming mintAddress is not numeric, so this path isn't taken for Get)
	// Get by mint_address fails
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Twice() // Once in GetCoinByID, once in fetchAndCacheCoin for Create/Update
	
	// Mock for EnrichCoinData (indirectly via fetchAndCacheCoin)
	// For simplicity, assume GetStrictList is part of EnrichCoinData or its deps
	mockJupiterClient.On("GetStrictList", ctx).Return([]jupiter.CoinMetadata{{Address: mintAddress, Name: "Enriched Coin", Symbol: "ENR", Decimals: 6}}, nil).Maybe()
	mockOffchainClient.On("GetCoinData", ctx, mintAddress).Return(&model.OffchainCoinData{Name: "Enriched Coin", Symbol: "ENR"}, nil).Maybe()
	
	// Mock for Create in fetchAndCacheCoin
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Name == "Enriched Coin"
	})).Return(nil).Once()

	// Mocks for NewService init
	mockDbStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("List", mock.Anything).Return([]model.Coin{}, nil).Maybe()
	mockCoinRepo.On("BulkUpsert", mock.Anything, mock.AnythingOfType("*[]model.Coin")).Return(int64(0), nil).Maybe()
	// GetStrictList already Maybe'd for NewService, if ScrapeAndEnrichToFile is called during init.

	service := NewService(cfg, nil, mockJupiterClient, mockDbStore)
	service.offchainClient = mockOffchainClient // Inject mock for EnrichCoinData

	coin, err := service.GetCoinByID(ctx, mintAddress)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, mintAddress, coin.MintAddress)
	assert.Equal(t, "Enriched Coin", coin.Name)
	mockCoinRepo.AssertExpectations(t)
	mockOffchainClient.AssertExpectations(t)
}
