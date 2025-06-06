package price

import (
	"context"
	"log/slog"
	"time"

	"github.com/dgraph-io/ristretto"
	"github.com/eko/gocache/v3/cache"
	"github.com/eko/gocache/v3/store"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

type GoCacheAdapter struct {
	cacheManager   cache.CacheInterface[*birdeye.PriceHistory]
	ristrettoCache *ristretto.Cache
}

// NewGoCacheAdapter creates a new GoCacheAdapter with a Ristretto store.
func NewGoCacheAdapter() (*GoCacheAdapter, error) {
	ristrettoCache, err := ristretto.NewCache(&ristretto.Config{ // from dgraph-io/ristretto
		NumCounters: 1e5,     // Num keys to track frequency of (100k).
		MaxCost:     1 << 25, // Maximum cost of cache (32MB).
		BufferItems: 64,      // Number of keys per Get buffer.
	})
	if err != nil {
		return nil, err
	}

	// Use store.NewRistretto from github.com/eko/gocache/v3/store
	cacheStore := store.NewRistretto(ristrettoCache)
	cacheManager := cache.New[*birdeye.PriceHistory](cacheStore)

	return &GoCacheAdapter{
		cacheManager:   cacheManager,
		ristrettoCache: ristrettoCache,
	}, nil
}

// Get retrieves an item from the cache.
func (a *GoCacheAdapter) Get(key string) (*birdeye.PriceHistory, bool) {
	startTime := time.Now()

	cachedValue, err := a.cacheManager.Get(context.Background(), key)

	duration := time.Since(startTime)
	metrics := a.ristrettoCache.Metrics.String()

	if err != nil {
		slog.Info("Cache access",
			slog.String("key", key),
			slog.String("outcome", "miss"),
			slog.Duration("duration", duration),
			slog.Any("metrics", metrics),
			slog.String("error", err.Error()),
		)
		return nil, false
	} else if cachedValue == nil {
		slog.Info("Cache access",
			slog.String("key", key),
			slog.String("outcome", "miss (nil value)"),
			slog.Duration("duration", duration),
			slog.Any("metrics", metrics),
		)
		return nil, false
	} else {
		ttl, b := a.ristrettoCache.GetTTL(key)
		if !b {
			slog.Error("something really weird happend, it's not there anymnore", slog.String("key", key))
		}

		// Cache hit
		slog.Info("Cache access",
			slog.String("key", key),
			slog.String("outcome", "hit"),
			slog.Duration("duration", duration),
			slog.Any("metrics", metrics),
			slog.Duration("remainingTTL", ttl),
		)
		return cachedValue, true
	}
}

// Set adds an item to the cache with an expiration duration.
func (a *GoCacheAdapter) Set(key string, data *birdeye.PriceHistory, expiration time.Duration) {
	// Context can be background or TODO for cache operations
	err := a.cacheManager.Set(context.Background(), key, data, store.WithExpiration(expiration))
	if err != nil {
		slog.Error("Failed to set cache item", slog.String("key", key), slog.String("error", err.Error()))
	}
}
