package cache

import (
	"context"
	"log/slog"
	"time"

	"github.com/dgraph-io/ristretto"
	"github.com/eko/gocache/v3/cache"
	"github.com/eko/gocache/v3/store"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Type aliases for specific cache interfaces to maintain compatibility and ease mocking
type (
	CoinCache         = GenericCache[[]model.Coin]
	PriceHistoryCache = GenericCache[*birdeye.PriceHistory]
)

// GoGenericCacheAdapter provides a generic cache implementation using Ristretto
type GoGenericCacheAdapter[T any] struct {
	cacheManager   cache.CacheInterface[T]
	ristrettoCache *ristretto.Cache
	logPrefix      string
}

// NewGoGenericCacheAdapter creates a new generic cache adapter
func NewGoGenericCacheAdapter[T any](logPrefix string) (*GoGenericCacheAdapter[T], error) {
	ristrettoCache, err := ristretto.NewCache(&ristretto.Config{
		NumCounters: 1e5,     // Num keys to track frequency of (100k).
		MaxCost:     1 << 25, // Maximum cost of cache (32MB).
		BufferItems: 64,      // Number of keys per Get buffer.
	})
	if err != nil {
		return nil, err
	}

	cacheStore := store.NewRistretto(ristrettoCache)
	cacheManager := cache.New[T](cacheStore)

	return &GoGenericCacheAdapter[T]{
		cacheManager:   cacheManager,
		ristrettoCache: ristrettoCache,
		logPrefix:      logPrefix,
	}, nil
}

func NewCoinCache() (CoinCache, error) {
	return NewGoGenericCacheAdapter[[]model.Coin]("coin")
}

func NewPriceHistoryCache() (PriceHistoryCache, error) {
	return NewGoGenericCacheAdapter[*birdeye.PriceHistory]("price")
}

// Get retrieves an item from the cache
func (a *GoGenericCacheAdapter[T]) Get(key string) (T, bool) {
	var zero T
	startTime := time.Now()

	cachedValue, err := a.cacheManager.Get(context.Background(), key)

	duration := time.Since(startTime)
	metrics := a.ristrettoCache.Metrics

	if err != nil {
		slog.Info("🔍 Cache access - MISS (error)",
			slog.String("service", a.logPrefix),
			slog.String("key", key),
			slog.String("outcome", "miss"),
			slog.Duration("accessDuration", duration),
			slog.Uint64("hits", metrics.Hits()),
			slog.Uint64("misses", metrics.Misses()),
			slog.Float64("hitRatio", metrics.Ratio()),
			slog.String("error", err.Error()),
		)
		return zero, false
	}

	return cachedValue, true
}

// Set adds an item to the cache with an expiration duration
func (a *GoGenericCacheAdapter[T]) Set(key string, data T, expiration time.Duration) {
	startTime := time.Now()
	err := a.cacheManager.Set(context.Background(), key, data, store.WithExpiration(expiration))
	duration := time.Since(startTime)

	if err != nil {
		slog.Error("❌ Failed to store item in cache",
			slog.String("service", a.logPrefix),
			slog.String("key", key),
			slog.Duration("expiration", expiration),
			slog.Duration("storeDuration", duration),
			slog.String("error", err.Error()),
		)
	}
}

// Delete removes an item from the cache
func (a *GoGenericCacheAdapter[T]) Delete(key string) {
	startTime := time.Now()
	err := a.cacheManager.Delete(context.Background(), key)
	duration := time.Since(startTime)

	if err != nil {
		slog.Error("❌ Failed to delete item from cache",
			slog.String("service", a.logPrefix),
			slog.String("key", key),
			slog.Duration("deleteDuration", duration),
			slog.String("error", err.Error()),
		)
	}
}
