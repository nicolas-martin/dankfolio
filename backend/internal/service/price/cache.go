package price

import (
	"context"
	"log/slog" // Added import
	"time"

	"github.com/dgraph-io/ristretto" // For NewCache
	"github.com/eko/gocache/v3/cache"
	"github.com/eko/gocache/v3/store" // Generic store package
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
)

// PriceHistoryCache defines the interface for a price history cache.
// This interface remains the same for now.
type PriceHistoryCache interface {
	Get(key string) (*birdeye.PriceHistory, bool)
	Set(key string, data *birdeye.PriceHistory, expiration time.Duration)
}

// GoCacheAdapter implements PriceHistoryCache using eko/gocache.
type GoCacheAdapter struct {
	cacheManager   cache.CacheInterface[*birdeye.PriceHistory]
	ristrettoCache *ristretto.Cache // ADD THIS LINE
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
		ristrettoCache: ristrettoCache, // ADD THIS ASSIGNMENT
	}, nil
}

// Get retrieves an item from the cache.
func (a *GoCacheAdapter) Get(key string) (*birdeye.PriceHistory, bool) {
	startTime := time.Now()

	cachedValue, err := a.cacheManager.Get(context.Background(), key)

	duration := time.Since(startTime)
	numItems := a.ristrettoCache.Metrics.NumKeys()

	// Remove the old logArgs slice approach

	if err != nil {
		// Cache miss due to error or not found
		slog.Info("Cache access",
			slog.String("key", key),
			slog.Duration("duration", duration),
			slog.Uint64("cache_items", numItems),
			slog.String("outcome", "miss"),
			slog.String("error", err.Error()), // Error specific to this path
		)
		return nil, false
	} else if cachedValue == nil {
		// Cache miss (nil value returned without error)
		slog.Info("Cache access",
			slog.String("key", key),
			slog.Duration("duration", duration),
			slog.Uint64("cache_items", numItems),
			slog.String("outcome", "miss (nil value)"), // More specific outcome
		)
		return nil, false
	} else {
		// Cache hit
		slog.Info("Cache access",
			slog.String("key", key),
			slog.Duration("duration", duration),
			slog.Uint64("cache_items", numItems),
			slog.String("outcome", "hit"),
		)
		return cachedValue, true
	}
}

// Set adds an item to the cache with an expiration duration.
func (a *GoCacheAdapter) Set(key string, data *birdeye.PriceHistory, expiration time.Duration) {
	// Context can be background or TODO for cache operations
	err := a.cacheManager.Set(context.Background(), key, data, store.WithExpiration(expiration))
	if err != nil {
		// Log the error, as Set failing might be an issue.
		// For now, we don't propagate the error to the caller to keep interface simple.
		// Consider logging framework here, e.g., slog.Error("Failed to set cache item", "key", key, "error", err)
	}
}

// Note: The cleanup routine is now handled internally by Ristretto/gocache,
// so the manual startCleanupRoutine and cleanupExpired methods are removed.
