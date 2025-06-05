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
	solanaclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

func setupCoinServiceTest(t *testing.T) (
	*Service,
	*Config,
	*jupiterclientmocks.MockClientAPI,
	*solanaclientmocks.MockClientAPI,
	*offchainClientMocks.MockClientAPI,
	*dbDataStoreMocks.MockStore,
	*dbDataStoreMocks.MockRepository[model.Coin],
	*dbDataStoreMocks.MockRepository[model.RawCoin],
) {
	t.Helper()
	cfg := &Config{
		NewCoinsFetchInterval: 0, // Disable automatic fetching for tests
		SolanaRPCEndpoint:     "http://invalid-endpoint-for-tests",
	}

	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockSolanaClient := solanaclientmocks.NewMockClientAPI(t)
	mockOffchainClient := offchainClientMocks.NewMockClientAPI(t)
	mockStore := dbDataStoreMocks.NewMockStore(t)
	mockCoinRepo := dbDataStoreMocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)

	mockStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()

	// Mock for initial loadOrRefreshData call in NewService
	mockStore.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Run(func(args mock.Arguments) {
			// Execute the function with the mockStore itself for simplicity in most tests.
			// Tests requiring specific transactional behavior might need to adjust this.
			fn := args.Get(1).(func(db.Store) error)
			fn(mockStore)
		}).Return(nil).Maybe()

	// Default for ListTrendingCoins inside loadOrRefreshData to prevent actual file/DB access
	// Return a fresh coin to typically skip the refresh logic unless a test overrides this.
	mockStore.On("ListTrendingCoins", mock.Anything).Return([]model.Coin{
		{MintAddress: "trendingPlaceholder", Symbol: "TREND", LastUpdated: time.Now().Format(time.RFC3339)},
	}, nil).Maybe()

	service := NewService(cfg, &http.Client{}, mockJupiterClient, mockStore)
	service.solanaClient = mockSolanaClient
	service.offchainClient = mockOffchainClient

	return service, cfg, mockJupiterClient, mockSolanaClient, mockOffchainClient, mockStore, mockCoinRepo, mockRawCoinRepo
}

func TestGetCoinByID_Success(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)

	expectedID := uint64(123)
	idStr := strconv.FormatUint(expectedID, 10)
	expectedCoin := &model.Coin{ID: expectedID, MintAddress: "mintForID123", Name: "Test Coin by ID", Symbol: "TID"}

	mockStore.On("Coins").Return(mockCoinRepo) // Ensure Coins() is expected
	mockCoinRepo.On("Get", ctx, idStr).Return(expectedCoin, nil).Once()

	coin, err := service.GetCoinByID(ctx, idStr)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoin, coin)
}

func TestGetCoinByID_InvalidFormat(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, _, _, _ := setupCoinServiceTest(t)
	idStr := "not_a_number"

	_, err := service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid coin ID format")
}

func TestGetCoinByID_NotFound(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	idStr := "456"

	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("Get", ctx, idStr).Return(nil, db.ErrNotFound).Once()

	_, err := service.GetCoinByID(ctx, idStr)
	assert.Error(t, err)
	assert.True(t, errors.Is(err, db.ErrNotFound))
}

// --- Tests for GetCoinByMintAddress with new symbol logic ---

func TestGetCoinByMintAddress_FoundInEnriched_SymbolMatches(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "mint1"
	dbSymbol := "DBSYM"
	clientSymbol := "CLISYM"

	expectedCoin := &model.Coin{MintAddress: mintAddress, Symbol: dbSymbol, Name: "DB Coin"}
	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(expectedCoin, nil).Once()
	// No update should be called if DB symbol is present
	mockCoinRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)

	coin, err := service.GetCoinByMintAddress(ctx, mintAddress, &clientSymbol)
	assert.NoError(t, err)
	assert.Equal(t, dbSymbol, coin.Symbol) // Should use DB symbol
}

func TestGetCoinByMintAddress_FoundInEnriched_DBSymbolEmpty_ClientSymbolUsedForUpdate(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "mint1"
	clientSymbol := "CLISYM"

	dbCoin := &model.Coin{MintAddress: mintAddress, Symbol: "", Name: "DB Coin No Symbol"} // DB Symbol is empty
	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()
	mockCoinRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == clientSymbol
	})).Return(nil).Once() // Expect update

	coin, err := service.GetCoinByMintAddress(ctx, mintAddress, &clientSymbol)
	assert.NoError(t, err)
	assert.Equal(t, clientSymbol, coin.Symbol) // Symbol should be updated in returned coin
}

func TestGetCoinByMintAddress_FoundInEnriched_DBSymbolEmpty_ClientSymbolNil(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	mintAddress := "mint1"

	dbCoin := &model.Coin{MintAddress: mintAddress, Symbol: "", Name: "DB Coin No Symbol"}
	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()
	// No update expected
	mockCoinRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)


	coin, err := service.GetCoinByMintAddress(ctx, mintAddress, nil) // Client provides nil symbol
	assert.NoError(t, err)
	assert.Equal(t, "", coin.Symbol) // Symbol remains empty
}

func TestGetCoinByMintAddress_NotFoundInEnriched_FoundInRaw_ClientSymbolProvided(t *testing.T) {
	ctx := context.Background()
	service, _, mockJupiter, mockSolana, mockOffchain, mockStore, mockCoinRepo, mockRawCoinRepo := setupCoinServiceTest(t)
	mintAddress := "mintRaw"
	rawCoinSymbol := "RAWSYM"
	clientSymbol := "CLISYM" // Client symbol should be preferred if raw has none, or passed to Enrich

	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Once() // Not in enriched

	rawCoin := &model.RawCoin{MintAddress: mintAddress, Symbol: rawCoinSymbol, Name: "Raw Coin"}
	mockStore.On("RawCoins").Return(mockRawCoinRepo)
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(rawCoin, nil).Once() // Found in raw

	// Mock enrichment process (EnrichCoinData)
	mockJupiter.On("GetCoinInfo", ctx, mintAddress).Return(&jupiter.CoinListInfo{Symbol: "JUPSYM"}, nil).Maybe() // Jupiter provides symbol
	mockJupiter.On("GetCoinPrices", ctx, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil).Maybe()
	mockSolana.On("GetMetadataAccount", ctx, mintAddress).Return(nil, errors.New("solana meta not found")).Maybe() // Simplify, assume no offchain
	mockOffchain.AssertNotCalled(t, "FetchMetadata", mock.Anything)


	// Expect Create after enrichment (as it wasn't in enriched initially)
	// The symbol saved should be from Jupiter (JUPSYM) as it takes precedence.
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Once() // For create/update check
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == "JUPSYM"
	})).Return(nil).Once()
	mockRawCoinRepo.On("Delete", ctx, mock.AnythingOfType("string")).Return(nil).Maybe()


	coin, err := service.GetCoinByMintAddress(ctx, mintAddress, &clientSymbol)
	assert.NoError(t, err)
	assert.Equal(t, "JUPSYM", coin.Symbol)
}

func TestGetCoinByMintAddress_NotFoundAnywhere_ClientSymbolUsedAsFallback(t *testing.T) {
	ctx := context.Background()
	service, _, mockJupiter, mockSolana, mockOffchain, mockStore, mockCoinRepo, mockRawCoinRepo := setupCoinServiceTest(t)
	mintAddress := "mintNew"
	clientSymbol := "CLISYM_FALLBACK"

	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Times(2) // Once for initial, once for create check

	mockStore.On("RawCoins").Return(mockRawCoinRepo)
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Once() // Not in raw

	// Mock enrichment - no symbol from external sources
	mockJupiter.On("GetCoinInfo", ctx, mintAddress).Return(&jupiter.CoinListInfo{Name: "New Coin No Symbol"}, nil).Maybe() // No symbol from Jupiter
	mockJupiter.On("GetCoinPrices", ctx, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil).Maybe()
	mockSolana.On("GetMetadataAccount", ctx, mintAddress).Return(nil, errors.New("solana meta not found")).Maybe()
	mockOffchain.AssertNotCalled(t, "FetchMetadata", mock.Anything)


	// Expect Create. Symbol should be clientProvidedSymbol as fallback.
	mockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == clientSymbol
	})).Return(nil).Once()

	coin, err := service.GetCoinByMintAddress(ctx, mintAddress, &clientSymbol)
	assert.NoError(t, err)
	assert.Equal(t, clientSymbol, coin.Symbol)
}


// --- Tests for listing and discovery methods ---

func TestGetCoins_ReturnsSymbols(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockCoinRepo, _ := setupCoinServiceTest(t)
	expectedCoins := []model.Coin{
		{MintAddress: "mint1", Name: "Coin 1", Symbol: "SYM1"},
		{MintAddress: "mint2", Name: "Coin 2", Symbol: "SYM2"},
	}
	mockStore.On("Coins").Return(mockCoinRepo)
	mockCoinRepo.On("List", ctx).Return(expectedCoins, nil).Once()

	coins, err := service.GetCoins(ctx)
	assert.NoError(t, err)
	assert.Equal(t, expectedCoins, coins)
}

func TestFetchAndStoreNewTokens_SavesSymbolToRawCoins(t *testing.T) {
	ctx := context.Background()
	service, _, mockJupiter, _, _, mockStore, _, mockRawCoinRepo := setupCoinServiceTest(t)

	jupiterNewTokens := []jupiter.NewTokenInfo{
		{Mint: "newMint1", Symbol: "NEWSYM1", Name: "New Token 1", Decimals: 6, CreatedAt: "1678886400"},
		{Mint: "newMint2", Symbol: "NEWSYM2", Name: "New Token 2", Decimals: 9, CreatedAt: "1678886400"},
	}
	mockJupiter.On("GetNewCoins", ctx, mock.AnythingOfType("*jupiter.NewCoinsParams")).Return(jupiterNewTokens, nil).Once()

	// Mock RawCoins().Create or Update for each token
	mockStore.On("RawCoins").Return(mockRawCoinRepo)
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "newMint1").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "newMint1" && rc.Symbol == "NEWSYM1"
	})).Return(nil).Once()

	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "newMint2").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "newMint2" && rc.Symbol == "NEWSYM2"
	})).Return(nil).Once()


	err := service.FetchAndStoreNewTokens(ctx)
	assert.NoError(t, err)
	// Assertions are on the mock calls
}


func TestGetAllTokens_SavesSymbolToRawCoins(t *testing.T) {
	ctx := context.Background()
	service, _, mockJupiter, _, _, mockStore, _, mockRawCoinRepo := setupCoinServiceTest(t)

	jupiterCoinList := &jupiter.CoinListResponse{
		Coins: []jupiter.CoinListInfo{
			{Address: "allMint1", Symbol: "ALLSYM1", Name: "All Token 1", Decimals: 6},
			{Address: "allMint2", Symbol: "ALLSYM2", Name: "All Token 2", Decimals: 9},
		},
	}
	mockJupiter.On("GetAllCoins", ctx).Return(jupiterCoinList, nil).Once()

	mockStore.On("RawCoins").Return(mockRawCoinRepo)
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "allMint1").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "allMint1" && rc.Symbol == "ALLSYM1"
	})).Return(nil).Once()
	mockRawCoinRepo.On("GetByField", ctx, "mint_address", "allMint2").Return(nil, db.ErrNotFound).Once()
	mockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "allMint2" && rc.Symbol == "ALLSYM2"
	})).Return(nil).Once()

	_, err := service.GetAllTokens(ctx)
	assert.NoError(t, err)
}


// Helper functions for pointers (if needed for clientProvidedSymbol, but string pointers are fine)
func Pstring(s string) *string { return &s }
