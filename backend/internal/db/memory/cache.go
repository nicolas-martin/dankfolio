package memory

import (
	"log"
	"sync"
	"time"
)

// TypedCache is a generic cache implementation that provides type-safe caching
type TypedCache[T any] struct {
	mu        sync.RWMutex
	items     map[string]typedCacheItem[T]
	keyPrefix string
}

// typedCacheItem is a generic type for cached values with expiration
type typedCacheItem[T any] struct {
	value      T
	expiration time.Time
}

// NewTypedCache creates a new generic cache instance
func NewTypedCache[T any](keyPrefix string) *TypedCache[T] {
	return &TypedCache[T]{
		items:     make(map[string]typedCacheItem[T]),
		keyPrefix: keyPrefix,
	}
}

// getCacheKey generates a cache key with the configured prefix
func (c *TypedCache[T]) getCacheKey(id string) string {
	if c.keyPrefix == "" {
		log.Fatalf("keyPrefix is empty")
	}
	return c.keyPrefix + id
}

// Set stores a value in the cache with the given expiration
func (c *TypedCache[T]) Set(id string, value T, expiration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.getCacheKey(id)
	c.items[key] = typedCacheItem[T]{
		value:      value,
		expiration: time.Now().Add(expiration),
	}
}

// Get retrieves a value from the cache if it exists and hasn't expired
func (c *TypedCache[T]) Get(id string) (T, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var zero T
	key := c.getCacheKey(id)
	item, exists := c.items[key]
	if !exists {
		log.Printf("[cache:MISS] key=%s", key)
		return zero, false
	}

	if time.Now().After(item.expiration) {
		delete(c.items, key)
		log.Printf("[cache:MISS:expired] key=%s", key)
		return zero, false
	}

	log.Printf("[cache:HIT] key=%s", key)
	return item.value, true
}

// Delete removes a value from the cache
func (c *TypedCache[T]) Delete(id string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	key := c.getCacheKey(id)
	delete(c.items, key)
}
