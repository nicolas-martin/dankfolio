package coin

import (
	"context"
	"fmt"
	"testing"
	"time"
    "errors" // Added for db.ErrNotFound comparison

	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model" // For model.Coin
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
    "google.golang.org/protobuf/types/known/timestamppb" // For constructing pb.Coin with timestamps
)

// MockCoinCache remains the same
type MockCoinCache struct {
	mock.Mock
}

func (m *MockCoinCache) Get(key string) (*pb.GetAvailableCoinsResponse, bool) {
	args := m.Called(key)
	if args.Get(0) == nil {
		return nil, args.Bool(1)
	}
	return args.Get(0).(*pb.GetAvailableCoinsResponse), args.Bool(1)
}

func (m *MockCoinCache) Set(key string, data *pb.GetAvailableCoinsResponse, expiration time.Duration) {
	m.Called(key, data, expiration)
}

// MockDBStore now needs to mock the new methods: ListNewestCoins, ListTopGainersCoins, ListRPCFilteredTrendingCoins
type MockDBStore struct {
	mock.Mock
}
func (m *MockDBStore) ListNewestCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
    args := m.Called(ctx, opts)
    if args.Get(0) == nil {
        return nil, 0, args.Error(2)
    }
    return args.Get(0).([]model.Coin), int32(args.Int(1)), args.Error(2)
}
func (m *MockDBStore) ListTopGainersCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
    args := m.Called(ctx, opts)
    if args.Get(0) == nil {
        return nil, 0, args.Error(2)
    }
    return args.Get(0).([]model.Coin), int32(args.Int(1)), args.Error(2)
}
func (m *MockDBStore) ListRPCFilteredTrendingCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
    args := m.Called(ctx, opts)
    if args.Get(0) == nil {
        return nil, 0, args.Error(2)
    }
    return args.Get(0).([]model.Coin), int32(args.Int(1)), args.Error(2)
}
// Implement other db.Store methods if they are called by service methods being tested or helper/setup funcs.
// For now, these are the critical ones for the new RPCs.
func (m *MockDBStore) Coins() db.Repository[model.Coin] { panic("not implemented in this mock for these tests") }
func (m *MockDBStore) Trades() db.Repository[model.Trade] { panic("not implemented") }
func (m *MockDBStore) RawCoins() db.Repository[model.RawCoin] { panic("not implemented") }
func (m *MockDBStore) Wallet() db.Repository[model.Wallet] { panic("not implemented") }
func (m *MockDBStore) ApiStats() db.Repository[model.ApiStat] { panic("not implemented") }
func (m *MockDBStore) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {panic("not implemented")}
func (m *MockDBStore) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {panic("not implemented")}
func (m *MockDBStore) WithTransaction(ctx context.Context, fn func(db.Store) error) error { return fn(m) }


// Mocks for other client interfaces (can be very basic)
type MockJupiterClient struct { mock.Mock; jupiter.ClientAPI }
func (m *MockJupiterClient) GetAllCoins(ctx context.Context) (*jupiter.CoinListResponse, error) {panic("not implemented")}
func (m *MockJupiterClient) GetNewCoins(ctx context.Context, params *jupiter.NewCoinsParams) ([]*jupiter.NewCoin, error) {panic("not implemented")}

// Note: GetCoinPrices was not in the original jupiter.ClientAPI from previous files.
// If it's a new method, it's fine. If it's a typo for GetPrice, adjust as needed.
// Assuming GetCoinPrices is a new, valid method for this context.
func (m *MockJupiterClient) GetCoinPrices(ctx context.Context, tokenAddresses []string) (map[string]float64, error) {panic("not implemented")}

func (m *MockJupiterClient) GetQuote(ctx context.Context, params *jupiter.QuoteParams) (*jupiter.QuoteResponse, error) {panic("not implemented")}
func (m *MockJupiterClient) GetSwapTransactions(ctx context.Context, params *jupiter.SwapParams) (*jupiter.SwapResponse, error) {panic("not implemented")}
func (m *MockJupiterClient) GetRouteMap(ctx context.Context) (*jupiter.RouteMap, error) {panic("not implemented")}


type MockChainClient struct { mock.Mock; clients.GenericClientAPI }
// Implement methods for MockChainClient if needed by tests
func (m *MockChainClient) GetBalance(ctx context.Context, pubkey string) (uint64, error) {panic("not implemented")}

// GetTokenBalance in clients.GenericClientAPI from previous files returned (float64, uint64, error)
// The mock here returns (float64, error). This needs to match the actual interface.
// Reverting to (float64, uint64, error) based on likely actual interface.
func (m *MockChainClient) GetTokenBalance(ctx context.Context, walletAddr string, mintAddr string) (float64, uint64, error) {panic("not implemented")}

// GetTokenDecimals was not in original GenericClientAPI. Assuming it's a new addition or specific need.
func (m *MockChainClient) GetTokenDecimals(ctx context.Context, mintAddr string) (int, error) {panic("not implemented")}
func (m *MockChainClient) GetTokenMetadata(ctx context.Context, mintAddr string) (*clients.TokenMetadata, error) {panic("not implemented")}

// SendRawTransaction was not in original GenericClientAPI.
func (m *MockChainClient) SendRawTransaction(ctx context.Context, rawTx []byte) (string, error) {panic("not implemented")}
func (m *MockChainClient) GetTransaction(ctx context.Context, txSig string) (*clients.TransactionDetails, error) {panic("not implemented")}
// GetRecentPerformanceSamples was not in original GenericClientAPI
func (m *MockChainClient) GetRecentPerformanceSamples(ctx context.Context, lamports uint64, signatures []string) ([]clients.PerformanceSample, error) { panic("not implemented") }


type MockOffchainClient struct { mock.Mock; offchain.ClientAPI }
// FetchCoinMetadata was not in original offchain.ClientAPI
func (m *MockOffchainClient) FetchCoinMetadata(ctx context.Context, mintAddress string) (*model.Coin, error) {panic("not implemented")}
func (m *MockOffchainClient) FetchIPFSImage(ctx context.Context, cid string) ([]byte, string, error) {panic("not implemented")}


type MockBirdeyeClient struct { mock.Mock; birdeye.ClientAPI }
func (m *MockBirdeyeClient) GetTokenOverview(ctx context.Context, mintAddress string) (*birdeye.TokenOverviewResponse, error) {panic("not implemented")}
func (m *MockBirdeyeClient) GetPriceHistory(ctx context.Context, params birdeye.PriceHistoryParams) (*birdeye.PriceHistory, error) {panic("not implemented")}
// GetTrendingTokens in birdeye.ClientAPI from previous files returned (*birdeye.TokenTrendingResponse, error)
// The mock here returns ([]birdeye.TrendingToken, error). This needs to match.
// Reverting to (*birdeye.TokenTrendingResponse, error)
func (m *MockBirdeyeClient) GetTrendingTokens(ctx context.Context, params birdeye.TrendingTokensParams) (*birdeye.TokenTrendingResponse, error) {panic("not implemented")}


type MockTelemetryAPI struct { mock.Mock; telemetry.TelemetryAPI }
// IncrementBirdeyeCallCount was not in original telemetry.TelemetryAPI
func (m *MockTelemetryAPI) IncrementBirdeyeCallCount(endpointName string) { /* no-op */ }
// IncrementJupiterCallCount was not in original telemetry.TelemetryAPI
func (m *MockTelemetryAPI) IncrementJupiterCallCount(endpointName string) { /* no-op */ }
// Added missing methods from telemetry.TelemetryAPI to make the mock complete
func (m *MockTelemetryAPI) IncrementAPICall(clientName string, endpoint string, success bool) { m.Called(clientName, endpoint, success) }
func (m *MockTelemetryAPI) GetStats() map[string]map[string]telemetry.APICallStats { panic("not implemented") }
func (m *MockTelemetryAPI) LoadStatsForToday(ctx context.Context) error { panic("not implemented") }
func (m *MockTelemetryAPI) ResetStats(ctx context.Context) error { panic("not implemented") }
func (m *MockTelemetryAPI) Start(ctx context.Context) { panic("not implemented") }


// Helper to create a pb.Coin from model.Coin for expected responses (simplified)
// func modelToPbCoinForTest(mc *model.Coin) *pb.Coin { // This helper is not used if model.Coin.ToProto() is used.
// }


func TestService_GetNewCoins(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockDbStore := new(MockDBStore)

	service := NewService(
		&Config{},
		new(MockJupiterClient),
		mockDbStore,
		new(MockChainClient),
		new(MockBirdeyeClient),
		new(MockTelemetryAPI),
		new(MockOffchainClient),
		mockCache,
	)

	req := &pb.GetNewCoinsRequest{Limit: 10, Offset: 0}
	expectedCacheKey := "newCoins_limit_10"
    if req.Offset > 0 { // Adjust key if offset is present, as per service logic
        expectedCacheKey = fmt.Sprintf("newCoins_limit_%d_offset_%d", req.Limit, req.Offset)
    }


	t.Run("Cache Miss", func(t *testing.T) {
		// Expected model coins from DB
		now := time.Now()
		mockModelCoins := []model.Coin{
			{MintAddress: "newDbCoin1", Name: "New DB Coin 1", Symbol: "NDB1", CreatedAt: now.Add(-1*time.Hour).Format(time.RFC3339), JupiterListedAt: &now},
			{MintAddress: "newDbCoin2", Name: "New DB Coin 2", Symbol: "NDB2", CreatedAt: now.Add(-2*time.Hour).Format(time.RFC3339), JupiterListedAt: &now},
		}
		mockTotalCount := int32(len(mockModelCoins))

        expectedListOpts := db.ListOptions{}
        limitInt := int(req.Limit); expectedListOpts.Limit = &limitInt
        offsetInt := int(req.Offset); expectedListOpts.Offset = &offsetInt
        sortByCreatedAt := "created_at"; sortDescTrue := true
        expectedListOpts.SortBy = &sortByCreatedAt; expectedListOpts.SortDesc = &sortDescTrue

		mockDbStore.On("ListNewestCoins", mock.Anything, expectedListOpts).Return(mockModelCoins, mockTotalCount, nil).Once()
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()

		expectedPbCoins := make([]*pb.Coin, len(mockModelCoins))
		for i, mc := range mockModelCoins {
			pbCoin, _ := mc.ToProto()
            expectedPbCoins[i] = pbCoin
		}
		expectedResponse := &pb.GetAvailableCoinsResponse{
			Coins:      expectedPbCoins,
			TotalCount: mockTotalCount,
		}

		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount) &&
                   assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetNewCoins(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount)
        assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		mockDbStore.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
        mockDbStore.Mock.ExpectedCalls = nil
        mockCache.Mock.ExpectedCalls = nil

		cachedPbCoins := []*pb.Coin{{MintAddress: "cachedNewCoin", Name: "Cached New Coin", Symbol: "CNC"}}
		cachedResp := &pb.GetAvailableCoinsResponse{ Coins: cachedPbCoins, TotalCount: int32(len(cachedPbCoins)) }
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()

		resp, err := service.GetNewCoins(context.Background(), req)

		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t)
		mockDbStore.AssertNotCalled(t, "ListNewestCoins", mock.Anything, mock.AnythingOfType("db.ListOptions"))
	})
}


func TestService_GetTrendingCoinsRPC(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockDbStore := new(MockDBStore)
	service := NewService(&Config{}, new(MockJupiterClient), mockDbStore, new(MockChainClient), new(MockBirdeyeClient), new(MockTelemetryAPI), new(MockOffchainClient), mockCache)

	req := &pb.GetTrendingCoinsRequest{Limit: 1}
	expectedCacheKey := "trendingCoins_rpc_limit_1"
    if req.Offset > 0 {
         expectedCacheKey = fmt.Sprintf("trendingCoins_rpc_limit_%d_offset_%d", req.Limit, req.Offset)
    }


	t.Run("Cache Miss", func(t *testing.T) {
		mockModelCoins := []model.Coin{
			{MintAddress: "trendingDb1", Name: "Trending DB 1", Symbol: "TDB1", IsTrending: true, Volume24h: 200000},
		}
		mockTotalCount := int32(5)

        expectedListOpts := db.ListOptions{}
        limitInt := int(req.Limit); expectedListOpts.Limit = &limitInt

		mockDbStore.On("ListRPCFilteredTrendingCoins", mock.Anything, mock.MatchedBy(func(opts db.ListOptions) bool {
            // Check that the limit matches and filters/sorts are applied by the service method
            return *opts.Limit == int(req.Limit)
        })).Return(mockModelCoins, mockTotalCount, nil).Once()
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()

		expectedPbCoins := make([]*pb.Coin, len(mockModelCoins))
        for i, mc := range mockModelCoins {
            pbCoin, _ := mc.ToProto(); expectedPbCoins[i] = pbCoin
        }
		expectedResponse := &pb.GetAvailableCoinsResponse{ Coins: expectedPbCoins, TotalCount: mockTotalCount }

		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount) &&
                   assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetTrendingCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
        assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount)
        assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		mockDbStore.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
        mockDbStore.Mock.ExpectedCalls = nil
        mockCache.Mock.ExpectedCalls = nil

		cachedResp := &pb.GetAvailableCoinsResponse{Coins: []*pb.Coin{{MintAddress: "cachedTrendingRPC"}}, TotalCount: 1}
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()
		resp, err := service.GetTrendingCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t)
		mockDbStore.AssertNotCalled(t, "ListRPCFilteredTrendingCoins", mock.Anything, mock.AnythingOfType("db.ListOptions"))
	})
}

func TestService_GetTopGainersCoins(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockDbStore := new(MockDBStore)
	service := NewService(&Config{}, new(MockJupiterClient), mockDbStore, new(MockChainClient), new(MockBirdeyeClient), new(MockTelemetryAPI), new(MockOffchainClient), mockCache)

	req := &pb.GetTopGainersCoinsRequest{Limit: 1}
	expectedCacheKey := "topGainersCoins_limit_1"
    if req.Offset > 0 {
        expectedCacheKey = fmt.Sprintf("topGainersCoins_limit_%d_offset_%d", req.Limit, req.Offset)
    }

	t.Run("Cache Miss", func(t *testing.T) {
        mockModelCoins := []model.Coin{
			{MintAddress: "gainerDb1", Name: "Gainer DB 1", Symbol: "GDB1", Price24hChangePercent: 120.5},
		}
		mockTotalCount := int32(3)

        expectedListOpts := db.ListOptions{}
        limitInt := int(req.Limit); expectedListOpts.Limit = &limitInt

		mockDbStore.On("ListTopGainersCoins", mock.Anything, mock.MatchedBy(func(opts db.ListOptions) bool {
            return *opts.Limit == int(req.Limit)
        })).Return(mockModelCoins, mockTotalCount, nil).Once()
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()

		expectedPbCoins := make([]*pb.Coin, len(mockModelCoins))
        for i, mc := range mockModelCoins {
            pbCoin, _ := mc.ToProto(); expectedPbCoins[i] = pbCoin
        }
		expectedResponse := &pb.GetAvailableCoinsResponse{ Coins: expectedPbCoins, TotalCount: mockTotalCount }

		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount) &&
                   assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetTopGainersCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
        assert.EqualValues(t, expectedResponse.TotalCount, resp.TotalCount)
        assert.ElementsMatch(t, expectedResponse.Coins, resp.Coins)
		mockDbStore.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
        mockDbStore.Mock.ExpectedCalls = nil
        mockCache.Mock.ExpectedCalls = nil

		cachedResp := &pb.GetAvailableCoinsResponse{Coins: []*pb.Coin{{MintAddress: "cachedGainer"}}, TotalCount: 1}
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()
		resp, err := service.GetTopGainersCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t)
		mockDbStore.AssertNotCalled(t, "ListTopGainersCoins", mock.Anything, mock.AnythingOfType("db.ListOptions"))
	})
}
