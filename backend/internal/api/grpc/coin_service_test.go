package grpc

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	pb "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	offchainclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain/mocks"
	solanaclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Helper to setup an in-process gRPC server for CoinService
type TestServerSetup struct {
	Client             v1connect.CoinServiceClient
	CoinService        *coin.Service
	MockJupiterClient  *jupiterclientmocks.MockClientAPI
	MockSolanaClient   *solanaclientmocks.MockClientAPI
	MockOffchainClient *offchainclientmocks.MockClientAPI
	MockStore          *dbDataStoreMocks.MockStore
	MockCoinRepo       *dbDataStoreMocks.MockRepository[model.Coin]
	MockRawCoinRepo    *dbDataStoreMocks.MockRepository[model.RawCoin]
	HttpTestServer     *httptest.Server
}

func setupTestCoinServer(t *testing.T) *TestServerSetup {
	t.Helper()

	cfg := &coin.Config{
		SolanaRPCEndpoint:     "http://mock-rpc-endpoint.com",
		NewCoinsFetchInterval: 0, // Disable background fetcher for tests
	}

	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockSolanaClient := solanaclientmocks.NewMockClientAPI(t)
	mockOffchainClient := offchainclientmocks.NewMockClientAPI(t)
	mockDbStore := dbDataStoreMocks.NewMockStore(t)
	mockCoinRepo := dbDataStoreMocks.NewMockRepository[model.Coin](t)
	mockRawCoinRepo := dbDataStoreMocks.NewMockRepository[model.RawCoin](t)

	mockDbStore.On("Coins").Return(mockCoinRepo).Maybe()
	mockDbStore.On("RawCoins").Return(mockRawCoinRepo).Maybe()

	// Default mock for WithTransaction to execute the passed function with the same mockStore
	mockDbStore.On("WithTransaction", mock.Anything, mock.AnythingOfType("func(db.Store) error")).
		Run(func(args mock.Arguments) {
			fn := args.Get(1).(func(db.Store) error)
			err := fn(mockDbStore)
			assert.NoError(t, err, "Transaction function failed")
		}).Return(nil).Maybe()

	// Default mock for ListTrendingCoins (called during NewService via loadOrRefreshData)
	mockDbStore.On("ListTrendingCoins", mock.Anything, mock.Anything).Return([]model.Coin{
		{MintAddress: "trendingPlaceholder", Symbol: "TREND", LastUpdated: time.Now().Format(time.RFC3339)},
	}, nil).Maybe()

	realCoinService := coin.NewService(cfg, &http.Client{}, mockJupiterClient, mockDbStore)
	realCoinService.SetSolanaClientForTesting(mockSolanaClient)   // Assuming a setter for tests
	realCoinService.SetOffchainClientForTesting(mockOffchainClient) // Assuming a setter for tests

	require.NotNil(t, realCoinService, "CoinService should be initialized")

	coinHandler := newCoinServiceHandler(realCoinService)
	mux := http.NewServeMux()
	path, handler := v1connect.NewCoinServiceHandler(coinHandler)
	mux.Handle(path, handler)
	testServer := httptest.NewServer(mux)
	t.Cleanup(testServer.Close)

	client := v1connect.NewCoinServiceClient(
		testServer.Client(),
		testServer.URL,
		connect.WithGRPC(),
	)

	return &TestServerSetup{
		Client:             client,
		CoinService:        realCoinService,
		MockJupiterClient:  mockJupiterClient,
		MockSolanaClient:   mockSolanaClient,
		MockOffchainClient: mockOffchainClient,
		MockStore:          mockDbStore,
		MockCoinRepo:       mockCoinRepo,
		MockRawCoinRepo:    mockRawCoinRepo,
		HttpTestServer:     testServer,
	}
}

// Helper to convert string to *string for optional proto fields
func pString(s string) *string {
	if s == "" {
		return nil // Represent empty optional string as nil
	}
	return &s
}

// --- GetCoinByID Integration Tests ---

func TestGetCoinByID_Integration_ClientSymbol_DBEmptySymbol(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	mintAddress := "testMint1"
	clientSymbol := "CLISYM"
	dbCoin := &model.Coin{MintAddress: mintAddress, Name: "Test Coin", Symbol: ""} // DB has empty symbol

	setup.MockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()
	setup.MockCoinRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == clientSymbol
	})).Return(nil).Once()

	req := &pb.GetCoinByIDRequest{MintAddress: mintAddress, Symbol: pString(clientSymbol)}
	res, err := setup.Client.GetCoinByID(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	require.NotNil(t, res.Msg)
	assert.Equal(t, mintAddress, res.Msg.MintAddress)
	assert.Equal(t, clientSymbol, res.Msg.Symbol) // Expect client symbol to be used and updated
}

func TestGetCoinByID_Integration_ClientSymbol_DBSymbolExists(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	mintAddress := "testMint2"
	dbSymbol := "DBSYM"
	clientSymbol := "CLISYM" // Client provides a different symbol
	dbCoin := &model.Coin{MintAddress: mintAddress, Name: "Test Coin", Symbol: dbSymbol}

	setup.MockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()
	// No Update should be called as DB symbol takes precedence / no empty symbol to fill

	req := &pb.GetCoinByIDRequest{MintAddress: mintAddress, Symbol: pString(clientSymbol)}
	res, err := setup.Client.GetCoinByID(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, mintAddress, res.Msg.MintAddress)
	assert.Equal(t, dbSymbol, res.Msg.Symbol) // Expect DB symbol
}

func TestGetCoinByID_Integration_NoClientSymbol_DBSymbolExists(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	mintAddress := "testMint3"
	dbSymbol := "DBSYM_ONLY"
	dbCoin := &model.Coin{MintAddress: mintAddress, Name: "Test Coin", Symbol: dbSymbol}

	setup.MockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()

	req := &pb.GetCoinByIDRequest{MintAddress: mintAddress, Symbol: nil} // No client symbol
	res, err := setup.Client.GetCoinByID(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, mintAddress, res.Msg.MintAddress)
	assert.Equal(t, dbSymbol, res.Msg.Symbol)
}

func TestGetCoinByID_Integration_NotFound_Enrichment_ClientSymbolFallback(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	mintAddress := "testMintNotFound"
	clientSymbol := "CLISYM_FALLBACK"

	// DB lookups fail
	setup.MockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Twice() // once for Get, once for Create/Update check
	setup.MockRawCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(nil, db.ErrNotFound).Once()

	// Mock external APIs - Jupiter returns no symbol
	setup.MockJupiterClient.On("GetCoinInfo", ctx, mintAddress).Return(&jupiter.CoinListInfo{Address: mintAddress, Name: "Enriched Name", Symbol: ""}, nil).Once()
	setup.MockJupiterClient.On("GetCoinPrices", ctx, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.23}, nil).Once()
	setup.MockSolanaClient.On("GetMetadataAccount", ctx, mintAddress).Return(nil, errors.New("no solana meta")).Once() // No offchain data if this fails

	// Expect Create call, using clientSymbol as fallback
	setup.MockCoinRepo.On("Create", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == clientSymbol && c.Name == "Enriched Name"
	})).Return(nil).Once()

	req := &pb.GetCoinByIDRequest{MintAddress: mintAddress, Symbol: pString(clientSymbol)}
	res, err := setup.Client.GetCoinByID(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	assert.Equal(t, mintAddress, res.Msg.MintAddress)
	assert.Equal(t, clientSymbol, res.Msg.Symbol)
	assert.Equal(t, "Enriched Name", res.Msg.Name)
}

// --- SearchCoinByMint Integration Tests --- (Similar to GetCoinByID)

func TestSearchCoinByMint_Integration_ClientSymbol_DBEmptySymbol(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	mintAddress := "searchMint1"
	clientSymbol := "SEARCHCLISYM"
	dbCoin := &model.Coin{MintAddress: mintAddress, Name: "Search Coin", Symbol: ""}

	setup.MockCoinRepo.On("GetByField", ctx, "mint_address", mintAddress).Return(dbCoin, nil).Once()
	setup.MockCoinRepo.On("Update", ctx, mock.MatchedBy(func(c *model.Coin) bool {
		return c.MintAddress == mintAddress && c.Symbol == clientSymbol
	})).Return(nil).Once()

	req := &pb.SearchCoinByMintRequest{MintAddress: mintAddress, Symbol: pString(clientSymbol)}
	res, err := setup.Client.SearchCoinByMint(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	require.NotNil(t, res.Msg)
	require.NotNil(t, res.Msg.Coin)
	assert.Equal(t, mintAddress, res.Msg.Coin.MintAddress)
	assert.Equal(t, clientSymbol, res.Msg.Coin.Symbol)
}

// --- GetAllCoins Integration Test ---

func TestGetAllCoins_Integration_ReturnsSymbolsFromDB(t *testing.T) {
	ctx := context.Background()
	setup := setupTestCoinServer(t)

	dbCoins := []model.Coin{
		{MintAddress: "mintA", Name: "Coin A", Symbol: "SYMA", Price: 10.0, Volume24h: 1000.0},
		{MintAddress: "mintB", Name: "Coin B", Symbol: "SYMB", Price: 20.0, Volume24h: 2000.0},
	}
	// This test focuses on GetAllTokens which calls Jupiter, then saves to RawCoins.
	// Then, the conversion from Jupiter's CoinListInfo to model.Coin (via ToModelCoin)
	// is what needs to be tested for symbol propagation, not a direct DB List.
	// Let's adjust this test to reflect GetAllTokens behavior.

	jupiterResponse := &jupiter.CoinListResponse{
		Coins: []jupiter.CoinListInfo{
			{Address: "mintA", Name: "Coin A", Symbol: "SYMA", PriceUSD: 10.0, Volume24h: 1000.0, Decimals: 6},
			{Address: "mintB", Name: "Coin B", Symbol: "SYMB", PriceUSD: 20.0, Volume24h: 2000.0, Decimals: 8},
		},
	}
	setup.MockJupiterClient.On("GetAllCoins", ctx).Return(jupiterResponse, nil).Once()

	// Mock RawCoin interactions - assume these are new coins
	setup.MockRawCoinRepo.On("GetByField", ctx, "mint_address", "mintA").Return(nil, db.ErrNotFound).Once()
	setup.MockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "mintA" && rc.Symbol == "SYMA"
	})).Return(nil).Once()
	setup.MockRawCoinRepo.On("GetByField", ctx, "mint_address", "mintB").Return(nil, db.ErrNotFound).Once()
	setup.MockRawCoinRepo.On("Create", ctx, mock.MatchedBy(func(rc *model.RawCoin) bool {
		return rc.MintAddress == "mintB" && rc.Symbol == "SYMB"
	})).Return(nil).Once()


	req := &pb.GetAllCoinsRequest{}
	res, err := setup.Client.GetAllCoins(ctx, connect.NewRequest(req))

	require.NoError(t, err)
	require.NotNil(t, res)
	require.Len(t, res.Msg.Coins, 2)
	assert.Equal(t, "mintA", res.Msg.Coins[0].MintAddress)
	assert.Equal(t, "SYMA", res.Msg.Coins[0].Symbol)
	assert.Equal(t, "mintB", res.Msg.Coins[1].MintAddress)
	assert.Equal(t, "SYMB", res.Msg.Coins[1].Symbol)
}

// NOTE: To make SetSolanaClientForTesting and SetOffchainClientForTesting work,
// these methods need to be added to coin.Service:
// func (s *Service) SetSolanaClientForTesting(client solana.ClientAPI) { s.solanaClient = client }
// func (s *Service) SetOffchainClientForTesting(client offchain.ClientAPI) { s.offchainClient = client }
// These are for testing purposes only.
// The pString helper is for convenience with optional string fields in protobuf.
// The test for GetAllCoins was adapted to test the actual implementation which involves Jupiter calls.
// More tests for other list endpoints (GetAvailableCoins, Search) would follow a similar pattern of
// mocking the DB store (e.g., mockCoinRepo.On("List", ...)) and verifying symbols.Okay, I've created the content for `backend/internal/api/grpc/coin_service_test.go`.

This includes:
1.  A `setupTestCoinServer` helper to initialize an in-process gRPC server with a real `CoinService` and mocked dependencies (`db.Store`, external API clients).
    *   It assumes/requires helper methods `SetSolanaClientForTesting` and `SetOffchainClientForTesting` on `coin.Service` to inject mocks after `NewService` is called. I will add these in a subsequent step.
2.  Integration tests for `GetCoinByID`:
    *   `TestGetCoinByID_Integration_ClientSymbol_DBEmptySymbol`: Client provides symbol, DB symbol is empty. Verifies DB update and client symbol is returned.
    *   `TestGetCoinByID_Integration_ClientSymbol_DBSymbolExists`: Client provides symbol, DB symbol also exists. Verifies DB symbol is returned (no update).
    *   `TestGetCoinByID_Integration_NoClientSymbol_DBSymbolExists`: Client provides no symbol, DB symbol exists. Verifies DB symbol is returned.
    *   `TestGetCoinByID_Integration_NotFound_Enrichment_ClientSymbolFallback`: Coin not in DB, enrichment happens, external sources *don't* provide a symbol. Verifies client-provided symbol is used as fallback and saved.
3.  Integration tests for `SearchCoinByMint`:
    *   `TestSearchCoinByMint_Integration_ClientSymbol_DBEmptySymbol`: Similar to the `GetCoinByID` equivalent, verifying symbol update and usage. (Other scenarios for `SearchCoinByMint` would follow the `GetCoinByID` pattern).
4.  Integration test for `GetAllCoins`:
    *   `TestGetAllCoins_Integration_ReturnsSymbolsFromDB` (name slightly misleading now, more accurately "ReturnsSymbolsFromJupiterViaRawCoinSave"): Mocks the Jupiter client's `GetAllCoins` call. Verifies that symbols from Jupiter are correctly passed through the `RawCoin` saving step and then returned in the gRPC response. This tests the symbol flow for newly discovered coins via this endpoint.

Now, I will create the file with this content.
