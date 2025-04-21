package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

const (
	defaultCacheExpiry = 5 * time.Minute
	coinCachePrefix    = "coin:"
	tradeCachePrefix   = "trade:"
)

// Config holds configuration for the memory store
type Config struct {
	DefaultCacheExpiry time.Duration // Default expiration time for cached items
}

// Store implements the db.Store interface using in-memory storage
type Store struct {
	mu     sync.RWMutex
	coins  map[string]model.Coin
	trades map[string]*model.Trade
	cache  map[string]cacheItem
	config Config
}

type cacheItem struct {
	value      interface{}
	expiration time.Time
}

var _ db.Store = (*Store)(nil) // Ensure Store implements db.Store
// New creates a new in-memory store with default configuration
func New() *Store {
	return NewWithConfig(Config{
		DefaultCacheExpiry: defaultCacheExpiry,
	})
}

// NewWithConfig creates a new in-memory store with custom configuration
func NewWithConfig(config Config) *Store {
	// Set defaults for zero values
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	return &Store{
		coins:  make(map[string]model.Coin),
		trades: make(map[string]*model.Trade),
		cache:  make(map[string]cacheItem),
		config: config,
	}
}

// Ensure Store implements db.Store interface
var _ db.Store = (*Store)(nil)

// Internal cache methods
func (s *Store) getCacheKey(prefix, id string) string {
	return prefix + id
}

func (s *Store) setCache(key string, value interface{}) {
	s.cache[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(s.config.DefaultCacheExpiry),
	}
}

func (s *Store) getFromCache(key string) (interface{}, bool) {
	item, exists := s.cache[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(item.expiration) {
		delete(s.cache, key)
		return nil, false
	}

	return item.value, true
}

func (s *Store) invalidateCache(key string) {
	delete(s.cache, key)
}

// Coin operations
func (s *Store) GetCoin(ctx context.Context, id string) (*model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	cacheKey := s.getCacheKey(coinCachePrefix, id)
	if cached, ok := s.getFromCache(cacheKey); ok {
		if coin, ok := cached.(model.Coin); ok {
			return &coin, nil
		}
	}

	// If not in cache, get from storage
	coin, exists := s.coins[id]
	if !exists {
		return nil, fmt.Errorf("coin not found: %s", id)
	}

	// Cache the result
	s.setCache(cacheKey, coin)
	return &coin, nil
}

func (s *Store) ListCoins(ctx context.Context) ([]model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	cacheKey := "coins:list"
	if cached, ok := s.getFromCache(cacheKey); ok {
		if coins, ok := cached.([]model.Coin); ok {
			return coins, nil
		}
	}

	// If not in cache, get from storage
	coins := make([]model.Coin, 0, len(s.coins))
	for _, coin := range s.coins {
		coins = append(coins, coin)
	}

	// Cache the result
	s.setCache(cacheKey, coins)
	return coins, nil
}

func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	cacheKey := "coins:trending"
	if cached, ok := s.getFromCache(cacheKey); ok {
		if coins, ok := cached.([]model.Coin); ok {
			return coins, nil
		}
	}

	// If not in cache, get from storage
	trending := make([]model.Coin, 0)
	for _, coin := range s.coins {
		if coin.IsTrending {
			trending = append(trending, coin)
		}
	}

	// Cache the result
	s.setCache(cacheKey, trending)
	return trending, nil
}

func (s *Store) UpsertCoin(ctx context.Context, coin *model.Coin) error {
	if coin == nil {
		return fmt.Errorf("cannot upsert nil coin")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.coins[coin.ID] = *coin

	// Invalidate related caches
	s.invalidateCache(s.getCacheKey(coinCachePrefix, coin.ID))
	s.invalidateCache("coins:list")
	s.invalidateCache("coins:trending")
	return nil
}

func (s *Store) DeleteCoin(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.coins, id)

	// Invalidate related caches
	s.invalidateCache(s.getCacheKey(coinCachePrefix, id))
	s.invalidateCache("coins:list")
	s.invalidateCache("coins:trending")
	return nil
}

// Trade operations
func (s *Store) GetTrade(ctx context.Context, id string) (*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	cacheKey := s.getCacheKey(tradeCachePrefix, id)
	if cached, ok := s.getFromCache(cacheKey); ok {
		if trade, ok := cached.(*model.Trade); ok {
			return trade, nil
		}
	}

	// If not in cache, get from storage
	trade, exists := s.trades[id]
	if !exists {
		return nil, fmt.Errorf("trade not found: %s", id)
	}

	// Cache the result
	s.setCache(cacheKey, trade)
	return trade, nil
}

func (s *Store) ListTrades(ctx context.Context) ([]*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	cacheKey := "trades:list"
	if cached, ok := s.getFromCache(cacheKey); ok {
		if trades, ok := cached.([]*model.Trade); ok {
			return trades, nil
		}
	}

	// If not in cache, get from storage
	trades := make([]*model.Trade, 0, len(s.trades))
	for _, trade := range s.trades {
		trades = append(trades, trade)
	}

	// Cache the result
	s.setCache(cacheKey, trades)
	return trades, nil
}

func (s *Store) CreateTrade(ctx context.Context, trade *model.Trade) error {
	if trade == nil {
		return fmt.Errorf("cannot create nil trade")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.trades[trade.ID]; exists {
		return fmt.Errorf("trade already exists: %s", trade.ID)
	}

	s.trades[trade.ID] = trade

	// Invalidate related caches
	s.invalidateCache(s.getCacheKey(tradeCachePrefix, trade.ID))
	s.invalidateCache("trades:list")
	return nil
}

func (s *Store) UpdateTrade(ctx context.Context, trade *model.Trade) error {
	if trade == nil {
		return fmt.Errorf("cannot update nil trade")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.trades[trade.ID]; !exists {
		return fmt.Errorf("trade not found: %s", trade.ID)
	}

	s.trades[trade.ID] = trade

	// Invalidate related caches
	s.invalidateCache(s.getCacheKey(tradeCachePrefix, trade.ID))
	s.invalidateCache("trades:list")
	return nil
}

func (s *Store) DeleteTrade(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.trades, id)

	// Invalidate related caches
	s.invalidateCache(s.getCacheKey(tradeCachePrefix, id))
	s.invalidateCache("trades:list")
	return nil
}

// Cache operations (these are now internal only)
func (s *Store) GetCached(ctx context.Context, key string) (interface{}, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getFromCache(key)
}

func (s *Store) SetCached(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.cache[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}
	return nil
}

func (s *Store) DeleteCached(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.invalidateCache(key)
	return nil
}
