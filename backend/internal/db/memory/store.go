package memory

import (
	"context"
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
	coins  *MemoryRepository[model.Coin]
	trades *MemoryRepository[model.Trade]
	config Config
}

var _ db.Store = (*Store)(nil) // Ensure Store implements db.Store

// NewWithConfig creates a new in-memory store with custom configuration
func NewWithConfig(config Config) *Store {
	// Set defaults for zero values
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	return &Store{
		coins:  NewRepository[model.Coin](coinCachePrefix, config),
		trades: NewRepository[model.Trade](tradeCachePrefix, config),
		config: config,
	}
}

// Coins returns the coin repository
func (s *Store) Coins() db.Repository[model.Coin] {
	return s.coins
}

// Trades returns the trade repository
func (s *Store) Trades() db.Repository[model.Trade] {
	return s.trades
}

// ListTrendingCoins returns only the trending coins
func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	allCoins, err := s.coins.List(ctx)
	if err != nil {
		return nil, err
	}

	trending := make([]model.Coin, 0)
	for _, coin := range allCoins {
		if coin.IsTrending {
			trending = append(trending, coin)
		}
	}
	return trending, nil
}
