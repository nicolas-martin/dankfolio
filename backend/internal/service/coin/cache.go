package coin

import (
	"context"
	"log/slog"
	"time"

	"github.com/dgraph-io/ristretto"
	"github.com/eko/gocache/v3/cache"
	"github.com/eko/gocache/v3/store"
	pb "github.com/nicolas-martin/dankfolio/gen/proto/go/dankfolio/v1"
)

type CoinCache interface {
	Get(key string) (*pb.GetAvailableCoinsResponse, bool)
	Set(key string, data *pb.GetAvailableCoinsResponse, expiration time.Duration)
}

type GoCoinCacheAdapter struct {
	cacheManager   cache.CacheInterface[*pb.GetAvailableCoinsResponse]
	ristrettoCache *ristretto.Cache
}

func NewGoCoinCacheAdapter() (*GoCoinCacheAdapter, error) {
	ristrettoCache, err := ristretto.NewCache(&ristretto.Config{
		NumCounters: 1e5,
		MaxCost:     1 << 25,
		BufferItems: 64,
	})
	if err != nil {
		return nil, err
	}
	cacheStore := store.NewRistretto(ristrettoCache)
	cacheManager := cache.New[*pb.GetAvailableCoinsResponse](cacheStore)
	return &GoCoinCacheAdapter{
		cacheManager:   cacheManager,
		ristrettoCache: ristrettoCache,
	}, nil
}

func (a *GoCoinCacheAdapter) Get(key string) (*pb.GetAvailableCoinsResponse, bool) {
	cachedValue, err := a.cacheManager.Get(context.Background(), key)
	if err != nil || cachedValue == nil {
		slog.Info("CoinCache MISS", "key", key, "error", err)
		return nil, false
	}
	slog.Info("CoinCache HIT", "key", key)
	return cachedValue, true
}

func (a *GoCoinCacheAdapter) Set(key string, data *pb.GetAvailableCoinsResponse, expiration time.Duration) {
	err := a.cacheManager.Set(context.Background(), key, data, store.WithExpiration(expiration))
	if err != nil {
		slog.Error("Failed to set item in CoinCache", "key", key, "error", err)
	} else {
		slog.Info("Successfully set item in CoinCache", "key", key)
	}
}
