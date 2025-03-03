package coin

import (
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

// CoinCache manages the in-memory cache of coin data
type CoinCache struct {
	mu        sync.RWMutex
	coins     map[string]model.Coin
	lastFetch time.Time
	cacheTTL  time.Duration
}

// NewCoinCache creates a new instance of CoinCache
func NewCoinCache(cacheTTL time.Duration) *CoinCache {
	if cacheTTL == 0 {
		cacheTTL = 15 * time.Minute
	}

	return &CoinCache{
		coins:     make(map[string]model.Coin),
		lastFetch: time.Time{},
		cacheTTL:  cacheTTL,
	}
}

// Set adds or updates a coin in the cache
func (c *CoinCache) Set(coin model.Coin) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.coins[coin.ID] = coin
}

// Get retrieves a coin from the cache by ID
func (c *CoinCache) Get(id string) (model.Coin, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	coin, found := c.coins[id]
	return coin, found
}

// GetAll returns all coins in the cache
func (c *CoinCache) GetAll() []model.Coin {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make([]model.Coin, 0, len(c.coins))
	for _, coin := range c.coins {
		result = append(result, coin)
	}
	return result
}

// SetAll replaces all coins in the cache with a new map
func (c *CoinCache) SetAll(coins map[string]model.Coin) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.coins = coins
	c.lastFetch = time.Now()
}

// NeedsRefresh checks if the cache needs to be refreshed based on TTL
func (c *CoinCache) NeedsRefresh() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// If we've never fetched or cache is empty, refresh is needed
	if c.lastFetch.IsZero() || len(c.coins) == 0 {
		return true
	}

	// Check if TTL has expired
	return time.Since(c.lastFetch) > c.cacheTTL
}

// UpdateLastFetch updates the last fetch time to now
func (c *CoinCache) UpdateLastFetch() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lastFetch = time.Now()
}

// Size returns the number of coins in the cache
func (c *CoinCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.coins)
}
