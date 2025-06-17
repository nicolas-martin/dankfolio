package coin

import (
	"context"
	"fmt"
	"testing"
	"time"

	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
	"github.com/nicolas-martin/dankfolio/backend/internal/db" // Import for db.Store
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCoinCache is a mock type for the CoinCache interface
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

// MockDBStore is a mock type for the db.Store interface
type MockDBStore struct {
	mock.Mock
}

// Implement methods of db.Store that might be called by placeholder functions if any
// For now, NewService just takes it, and our tested methods don't directly use db.Store
// So, no specific mocked methods are strictly needed for *these* tests.
// Add methods here if other CoinService methods were to be tested that use the store.
func (m *MockDBStore) GetUserByWalletAddress(ctx context.Context, walletAddress string) (*db.User, error) {
    args := m.Called(ctx, walletAddress)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*db.User), args.Error(1)
}
// Add other db.Store methods as needed if service.go placeholders evolve
// Adding Coins() and RawCoins() as they are often used in service initialization or other methods
func (m *MockDBStore) Coins() db.Repository[db.Coin] {
	args := m.Called()
	if args.Get(0) == nil {
		// To prevent panic if a test doesn't mock Coins() but it's called by a non-tested path in NewService
		// Return a new mock repository that does nothing by default
		return new(MockCoinRepository) // You'd need to define MockCoinRepository if not already defined
	}
	return args.Get(0).(db.Repository[db.Coin])
}

func (m *MockDBStore) RawCoins() db.Repository[db.RawCoin] {
	args := m.Called()
	if args.Get(0) == nil {
		return new(MockRawCoinRepository) // You'd need to define MockRawCoinRepository
	}
	return args.Get(0).(db.Repository[db.RawCoin])
}

func (m *MockDBStore) WithTransaction(ctx context.Context, fn func(txStore db.Store) error) error {
    args := m.Called(ctx, fn)
    // Execute the function with the mock store itself, or a specially prepared one for transactions
    // For simplicity, using the same mock store.
    err := fn(m)
    if err != nil { // if fn returns an error, pass it through
        return err
    }
    return args.Error(0) // Return the error configured for WithTransaction mock
}


// MockCoinRepository is a mock type for db.Repository[db.Coin]
type MockCoinRepository struct {
    mock.Mock
}

func (m *MockCoinRepository) Get(ctx context.Context, id string) (*db.Coin, error) { panic("not implemented"); }
func (m *MockCoinRepository) GetByField(ctx context.Context, field string, value any) (*db.Coin, error) { panic("not implemented"); }
func (m *MockCoinRepository) List(ctx context.Context, opts db.ListOptions) ([]db.Coin, int64, error) { panic("not implemented"); }
func (m *MockCoinRepository) Create(ctx context.Context, entity *db.Coin) error { panic("not implemented"); }
func (m *MockCoinRepository) Update(ctx context.Context, entity *db.Coin) error { panic("not implemented"); }
func (m *MockCoinRepository) Delete(ctx context.Context, id string) error { panic("not implemented"); }
func (m *MockCoinRepository) BulkUpsert(ctx context.Context, entities *[]db.Coin) (int64, error) { panic("not implemented"); }

// MockRawCoinRepository is a mock type for db.Repository[db.RawCoin]
type MockRawCoinRepository struct {
    mock.Mock
}
func (m *MockRawCoinRepository) Get(ctx context.Context, id string) (*db.RawCoin, error) { panic("not implemented"); }
func (m *MockRawCoinRepository) GetByField(ctx context.Context, field string, value any) (*db.RawCoin, error) { panic("not implemented"); }
func (m *MockRawCoinRepository) List(ctx context.Context, opts db.ListOptions) ([]db.RawCoin, int64, error) { panic("not implemented"); }
func (m *MockRawCoinRepository) Create(ctx context.Context, entity *db.RawCoin) error { panic("not implemented"); }
func (m *MockRawCoinRepository) Update(ctx context.Context, entity *db.RawCoin) error { panic("not implemented"); }
func (m *MockRawCoinRepository) Delete(ctx context.Context, id string) error { panic("not implemented"); }
func (m *MockRawCoinRepository) BulkUpsert(ctx context.Context, entities *[]db.RawCoin) (int64, error) { panic("not implemented"); }


func TestService_GetNewCoins(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockStore := new(MockDBStore) // Create a mock store
	// Mock the Coins() and RawCoins() methods for NewService if it calls them.
    // The simplified NewService in the prompt's service.go doesn't use them directly.
    // However, if other methods called by tests (even placeholders) might, this is safer.
    mockStore.On("Coins").Return(new(MockCoinRepository)).Maybe()
    mockStore.On("RawCoins").Return(new(MockRawCoinRepository)).Maybe()

	service := NewService(mockStore, mockCache) // Pass mock store

	req := &pb.GetNewCoinsRequest{Limit: 10, Offset: 0}
	// Construct cache key exactly as in service.go
	expectedCacheKey := "newCoins"
	if req.Limit > 0 { expectedCacheKey = fmt.Sprintf("%s_limit_%d", expectedCacheKey, req.Limit) }
	if req.Offset > 0 { expectedCacheKey = fmt.Sprintf("%s_offset_%d", expectedCacheKey, req.Offset) }

	t.Run("Cache Miss", func(t *testing.T) {
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()

		// This is the full placeholder list from service.go
		placeholderCoins := []*pb.Coin{
			{MintAddress: "newCoin1", Name: "New Coin Alpha", Symbol: "NCA", Price: 0.5, DailyVolume: 10000},
			{MintAddress: "newCoin2", Name: "New Coin Beta", Symbol: "NCB", Price: 1.2, DailyVolume: 25000},
		}
		totalOriginalCount := int32(len(placeholderCoins))

		// Apply offset and limit to placeholder data as in service.go
		var finalExpectedCoins []*pb.Coin
		start := int32(0)
		if req.Offset > 0 { start = req.Offset }
		end := totalOriginalCount
		if req.Limit > 0 {
			if start+req.Limit < totalOriginalCount { end = start + req.Limit }
		}
		if start < totalOriginalCount { finalExpectedCoins = placeholderCoins[start:end]
		} else { finalExpectedCoins = []*pb.Coin{} }

		expectedResponse := &pb.GetAvailableCoinsResponse{
			Coins:      finalExpectedCoins,
			TotalCount: totalOriginalCount,
		}

		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.ObjectsAreEqualValues(expectedResponse, resp)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetNewCoins(context.Background(), req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, expectedResponse.TotalCount, resp.TotalCount)
		assert.Len(t, resp.Coins, len(expectedResponse.Coins))
		if len(expectedResponse.Coins) > 0 && len(resp.Coins) > 0 {
            assert.Equal(t, expectedResponse.Coins[0].MintAddress, resp.Coins[0].MintAddress)
        }
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
		cachedResp := &pb.GetAvailableCoinsResponse{
			Coins:      []*pb.Coin{{MintAddress: "cachedNewCoin", Name: "Cached New Coin", Symbol: "CNC"}},
			TotalCount: 1,
		}
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()

		resp, err := service.GetNewCoins(context.Background(), req)

		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t) // Verifies Get was called, and Set was not.
	})
}

func TestService_GetTrendingCoins(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockStore := new(MockDBStore)
	mockStore.On("Coins").Return(new(MockCoinRepository)).Maybe()
    mockStore.On("RawCoins").Return(new(MockRawCoinRepository)).Maybe()
	service := NewService(mockStore, mockCache)

	req := &pb.GetTrendingCoinsRequest{Limit: 1} // Test with a limit that slices the placeholder
	expectedCacheKey := "trendingCoins"
    if req.Limit > 0 { expectedCacheKey = fmt.Sprintf("%s_limit_%d", expectedCacheKey, req.Limit) }
    if req.Offset > 0 { expectedCacheKey = fmt.Sprintf("%s_offset_%d", expectedCacheKey, req.Offset) }


	t.Run("Cache Miss", func(t *testing.T) {
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		placeholderCoins := []*pb.Coin{
			{MintAddress: "trendingCoin1", Name: "Trending Coin X", Symbol: "TCX", Price: 10.5, DailyVolume: 1000000, IsTrending: true},
			{MintAddress: "trendingCoin2", Name: "Trending Coin Y", Symbol: "TCY", Price: 5.2, DailyVolume: 500000, IsTrending: true},
		}
        totalOriginalCount := int32(len(placeholderCoins))

        var finalExpectedCoins []*pb.Coin
        start := int32(0)
        if req.Offset > 0 { start = req.Offset }
        end := totalOriginalCount
        if req.Limit > 0 {
            if start+req.Limit < totalOriginalCount { end = start + req.Limit }
        }
        if start < totalOriginalCount { finalExpectedCoins = placeholderCoins[start:end]
        } else { finalExpectedCoins = []*pb.Coin{} }


		expectedResponse := &pb.GetAvailableCoinsResponse{
			Coins:      finalExpectedCoins,
			TotalCount: totalOriginalCount,
		}
		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.ObjectsAreEqualValues(expectedResponse, resp)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetTrendingCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.EqualValues(t, expectedResponse, resp)
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
		cachedResp := &pb.GetAvailableCoinsResponse{
			Coins:      []*pb.Coin{{MintAddress: "cachedTrending", Name: "Cached Trending", Symbol: "CTC"}},
			TotalCount: 1,
		}
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()
		resp, err := service.GetTrendingCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t)
	})
}

func TestService_GetTopGainersCoins(t *testing.T) {
	mockCache := new(MockCoinCache)
	mockStore := new(MockDBStore)
	mockStore.On("Coins").Return(new(MockCoinRepository)).Maybe()
    mockStore.On("RawCoins").Return(new(MockRawCoinRepository)).Maybe()
	service := NewService(mockStore, mockCache)

	req := &pb.GetTopGainersCoinsRequest{Limit: 1} // Test with a limit that slices
	expectedCacheKey := "topGainersCoins"
    if req.Limit > 0 { expectedCacheKey = fmt.Sprintf("%s_limit_%d", expectedCacheKey, req.Limit) }
    if req.Offset > 0 { expectedCacheKey = fmt.Sprintf("%s_offset_%d", expectedCacheKey, req.Offset) }

	val1 := 55.5
	// val2 := 150.0 // Not used if limit is 1

	t.Run("Cache Miss", func(t *testing.T) {
		mockCache.On("Get", expectedCacheKey).Return(nil, false).Once()
		placeholderCoins := []*pb.Coin{
			{MintAddress: "gainerCoin1", Name: "Gainer Coin Up", Symbol: "GCU", Price: 2.5, PriceChangePercentage24H: &val1, DailyVolume: 75000},
			// {MintAddress: "gainerCoin2", Name: "Gainer Coin Sky", Symbol: "GCS", Price: 0.8, PriceChangePercentage24H: &val2, DailyVolume: 120000},
		}
		// The service.go code for GetTopGainers has PriceChangePercentage24H: &val1 for the first coin
		// and &val2 for the second. If limit is 1, only the first is taken.
		totalOriginalCountFromService := int32(2) // The placeholder list in service.go has 2 items.

		var finalExpectedCoins []*pb.Coin
        start := int32(0)
        // The full placeholder list from service.go for GetTopGainersCoins
        fullPlaceholder := []*pb.Coin{
            {MintAddress: "gainerCoin1", Name: "Gainer Coin Up", Symbol: "GCU", Price: 2.5, PriceChangePercentage24H: &val1, DailyVolume: 75000},
            {MintAddress: "gainerCoin2", Name: "Gainer Coin Sky", Symbol: "GCS", Price: 0.8, PriceChangePercentage24H: new(float64), DailyVolume: 120000}, // Placeholder for val2
        }
        // Manually assign the second coin's PriceChangePercentage24H if it's included
        if len(fullPlaceholder) > 1 {
            val2FromService := 150.0
            fullPlaceholder[1].PriceChangePercentage24H = &val2FromService
        }


        if req.Offset > 0 { start = req.Offset }
        end := totalOriginalCountFromService
        if req.Limit > 0 {
           if start+req.Limit < totalOriginalCountFromService { end = start + req.Limit }
        }
        if start < totalOriginalCountFromService { finalExpectedCoins = fullPlaceholder[start:end]
        } else { finalExpectedCoins = []*pb.Coin{} }


		expectedResponse := &pb.GetAvailableCoinsResponse{
			Coins:      finalExpectedCoins,
			TotalCount: totalOriginalCountFromService,
		}

		mockCache.On("Set", expectedCacheKey, mock.MatchedBy(func(resp *pb.GetAvailableCoinsResponse) bool {
			return assert.ObjectsAreEqualValues(expectedResponse, resp)
		}), defaultCacheTTL).Return().Once()

		resp, err := service.GetTopGainersCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.EqualValues(t, expectedResponse, resp)
		mockCache.AssertExpectations(t)
	})

	t.Run("Cache Hit", func(t *testing.T) {
		cachedResp := &pb.GetAvailableCoinsResponse{
			Coins:      []*pb.Coin{{MintAddress: "cachedGainer", Name: "Cached Gainer", Symbol: "CGC"}},
			TotalCount: 1,
		}
		mockCache.On("Get", expectedCacheKey).Return(cachedResp, true).Once()
		resp, err := service.GetTopGainersCoins(context.Background(), req)
		assert.NoError(t, err)
		assert.Equal(t, cachedResp, resp)
		mockCache.AssertExpectations(t)
	})
}
