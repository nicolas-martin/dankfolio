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

// Coin operations
func (s *Store) GetCoin(ctx context.Context, id string) (*model.Coin, error) {
	return s.coins.Get(ctx, id)
}

func (s *Store) ListCoins(ctx context.Context) ([]model.Coin, error) {
	return s.coins.List(ctx)
}

func (s *Store) UpsertCoin(ctx context.Context, coin *model.Coin) error {
	return s.coins.Upsert(ctx, coin)
}

func (s *Store) DeleteCoin(ctx context.Context, id string) error {
	return s.coins.Delete(ctx, id)
}

// Trade operations
func (s *Store) GetTrade(ctx context.Context, id string) (*model.Trade, error) {
	return s.trades.Get(ctx, id)
}

func (s *Store) ListTrades(ctx context.Context) ([]*model.Trade, error) {
	trades, err := s.trades.List(ctx)
	if err != nil {
		return nil, err
	}

	// Convert []model.Trade to []*model.Trade to match interface
	tradePtrs := make([]*model.Trade, len(trades))
	for i := range trades {
		tradePtrs[i] = &trades[i]
	}
	return tradePtrs, nil
}

func (s *Store) CreateTrade(ctx context.Context, trade *model.Trade) error {
	return s.trades.Create(ctx, trade)
}

func (s *Store) UpdateTrade(ctx context.Context, trade *model.Trade) error {
	return s.trades.Update(ctx, trade)
}

func (s *Store) DeleteTrade(ctx context.Context, id string) error {
	return s.trades.Delete(ctx, id)
}
