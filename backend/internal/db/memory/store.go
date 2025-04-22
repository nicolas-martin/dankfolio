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
	coinListPrefix     = "coins:"
	tradeListPrefix    = "trades:"
)

// Config holds configuration for the memory store
type Config struct {
	DefaultCacheExpiry time.Duration // Default expiration time for cached items
}

// Store implements the db.Store interface using in-memory storage
type Store struct {
	mu             sync.RWMutex
	coins          map[string]model.Coin
	trades         map[string]*model.Trade
	coinCache      *TypedCache[model.Coin]
	coinListCache  *TypedCache[[]model.Coin]
	tradeCache     *TypedCache[*model.Trade]
	tradeListCache *TypedCache[[]*model.Trade]
	config         Config
}

var _ db.Store = (*Store)(nil) // Ensure Store implements db.Store

// NewWithConfig creates a new in-memory store with custom configuration
func NewWithConfig(config Config) *Store {
	// Set defaults for zero values
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	return &Store{
		coins:          make(map[string]model.Coin),
		trades:         make(map[string]*model.Trade),
		coinCache:      NewTypedCache[model.Coin](coinCachePrefix),
		coinListCache:  NewTypedCache[[]model.Coin](coinListPrefix),
		tradeCache:     NewTypedCache[*model.Trade](tradeCachePrefix),
		tradeListCache: NewTypedCache[[]*model.Trade](tradeListPrefix),
		config:         config,
	}
}

// Coin operations
func (s *Store) GetCoin(ctx context.Context, id string) (*model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	if coin, ok, newCtx := s.coinCache.Get(ctx, id); ok {
		ctx = newCtx
		return &coin, nil
	}

	// If not in cache, get from storage
	coin, exists := s.coins[id]
	if !exists {
		return nil, fmt.Errorf("coin not found: %s", id)
	}

	// Cache the result
	s.coinCache.Set(id, coin, s.config.DefaultCacheExpiry)
	return &coin, nil
}

func (s *Store) ListCoins(ctx context.Context) ([]model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	if coins, ok, newCtx := s.coinListCache.Get(ctx, "all"); ok {
		ctx = newCtx
		return coins, nil
	}

	// If not in cache, get from storage
	coins := make([]model.Coin, 0, len(s.coins))
	for _, coin := range s.coins {
		coins = append(coins, coin)
	}

	// Cache the result
	s.coinListCache.Set("all", coins, s.config.DefaultCacheExpiry)
	return coins, nil
}

func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	if coins, ok, newCtx := s.coinListCache.Get(ctx, "trending"); ok {
		ctx = newCtx
		return coins, nil
	}

	// If not in cache, get from storage
	trending := make([]model.Coin, 0)
	for _, coin := range s.coins {
		if coin.IsTrending {
			trending = append(trending, coin)
		}
	}

	// Cache the result
	s.coinListCache.Set("trending", trending, s.config.DefaultCacheExpiry)
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
	s.coinCache.Delete(coin.ID)
	s.coinListCache.Delete("all")
	s.coinListCache.Delete("trending")
	return nil
}

func (s *Store) DeleteCoin(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.coins, id)

	// Invalidate related caches
	s.coinCache.Delete(id)
	s.coinListCache.Delete("all")
	s.coinListCache.Delete("trending")
	return nil
}

// Trade operations
func (s *Store) GetTrade(ctx context.Context, id string) (*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	if trade, ok, newCtx := s.tradeCache.Get(ctx, id); ok {
		ctx = newCtx
		return trade, nil
	}

	// If not in cache, get from storage
	trade, exists := s.trades[id]
	if !exists {
		return nil, fmt.Errorf("trade not found: %s", id)
	}

	// Cache the result
	s.tradeCache.Set(id, trade, s.config.DefaultCacheExpiry)
	return trade, nil
}

func (s *Store) ListTrades(ctx context.Context) ([]*model.Trade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Try cache first
	if trades, ok, newCtx := s.tradeListCache.Get(ctx, "all"); ok {
		ctx = newCtx
		return trades, nil
	}

	// If not in cache, get from storage
	trades := make([]*model.Trade, 0, len(s.trades))
	for _, trade := range s.trades {
		trades = append(trades, trade)
	}

	// Cache the result
	s.tradeListCache.Set("all", trades, s.config.DefaultCacheExpiry)
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
	s.tradeCache.Delete(trade.ID)
	s.tradeListCache.Delete("all")
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
	s.tradeCache.Delete(trade.ID)
	s.tradeListCache.Delete("all")
	return nil
}

func (s *Store) DeleteTrade(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.trades, id)

	// Invalidate related caches
	s.tradeCache.Delete(id)
	s.tradeListCache.Delete("all")
	return nil
}
