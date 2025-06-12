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
	metrics := a.ristrettoCache.Metrics

	if err != nil {
		slog.Info("🔍 Cache access - MISS (error)",
			slog.String("key", key),
			slog.String("outcome", "miss"),
			slog.Duration("accessDuration", duration),
			slog.Uint64("hits", metrics.Hits()),
			slog.Uint64("misses", metrics.Misses()),
			slog.Float64("hitRatio", metrics.Ratio()),
			slog.String("error", err.Error()),
		)
		return nil, false
	} else if cachedValue == nil {
		slog.Info("🔍 Cache access - MISS (nil value)",
			slog.String("key", key),
			slog.String("outcome", "miss"),
			slog.Duration("accessDuration", duration),
			slog.Uint64("hits", metrics.Hits()),
			slog.Uint64("misses", metrics.Misses()),
			slog.Float64("hitRatio", metrics.Ratio()),
		)
		return nil, false
	} else {
		ttl, ttlExists := a.ristrettoCache.GetTTL(key)
		if !ttlExists {
			slog.Error("⚠️ Cache inconsistency detected - item exists but no TTL found", slog.String("key", key))
		}

		// Cache hit with enhanced metrics
		slog.Info("⚡ Cache access - HIT",
			slog.String("key", key),
			slog.String("outcome", "hit"),
			slog.Duration("accessDuration", duration),
			slog.Duration("remainingTTL", ttl),
			slog.Uint64("hits", metrics.Hits()),
			slog.Uint64("misses", metrics.Misses()),
			slog.Float64("hitRatio", metrics.Ratio()),
			slog.Int("dataPoints", len(cachedValue.Data.Items)),
		)
		return cachedValue, true
	}
}

// Set adds an item to the cache with an expiration duration.
func (a *GoCacheAdapter) Set(key string, data *birdeye.PriceHistory, expiration time.Duration) {
	startTime := time.Now()

	// Context can be background or TODO for cache operations
	err := a.cacheManager.Set(context.Background(), key, data, store.WithExpiration(expiration))

	duration := time.Since(startTime)
	metrics := a.ristrettoCache.Metrics

	if err != nil {
		slog.Error("❌ Failed to store item in cache",
			slog.String("key", key),
			slog.Duration("expiration", expiration),
			slog.Duration("storeDuration", duration),
			slog.Int("dataPoints", len(data.Data.Items)),
			slog.String("error", err.Error()),
		)
	} else {
		slog.Info("💾 Successfully stored item in cache",
			slog.String("key", key),
			slog.Duration("expiration", expiration),
			slog.Duration("storeDuration", duration),
			slog.Int("dataPoints", len(data.Data.Items)),
			slog.Uint64("totalHits", metrics.Hits()),
			slog.Uint64("totalMisses", metrics.Misses()),
			slog.Float64("hitRatio", metrics.Ratio()),
		)
	}
}
