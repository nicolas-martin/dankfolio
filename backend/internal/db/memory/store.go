package memory

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

const (
	defaultCacheExpiry = 5 * time.Minute
	coinCachePrefix    = "coin:"
	tradeCachePrefix   = "trade:"
	coinCacheFile      = "data/coin_cache.json"
)

// Config holds configuration for the memory store
type Config struct {
	DefaultCacheExpiry time.Duration // Default expiration time for cached items
}

// Store implements the db.Store interface using in-memory storage
type Store struct {
	coins    *MemoryRepository[model.Coin]
	trades   *MemoryRepository[model.Trade]
	rawCoins *MemoryRepository[model.RawCoin]
	config   Config
}

var _ db.Store = (*Store)(nil) // Ensure Store implements db.Store

// NewWithConfig creates a new in-memory store with custom configuration
func NewWithConfig(config Config) *Store {
	// Set defaults for zero values
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	store := &Store{
		coins:    NewRepository[model.Coin](coinCachePrefix, config),
		trades:   NewRepository[model.Trade](tradeCachePrefix, config),
		rawCoins: NewRepository[model.RawCoin]("rawcoin:", config),
		config:   config,
	}

	// Load coin cache from file if it exists
	if err := store.loadCoinCache(); err != nil {
		fmt.Printf("Warning: Failed to load coin cache: %v\n", err)
	}

	return store
}

// Coins returns the coin repository
func (s *Store) Coins() db.Repository[model.Coin] {
	return s.coins
}

// Trades returns the trade repository
func (s *Store) Trades() db.Repository[model.Trade] {
	return s.trades
}

// RawCoins returns the raw coins repository
func (s *Store) RawCoins() db.Repository[model.RawCoin] {
	return s.rawCoins
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

// SearchCoins implements db.Store
func (s *Store) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	coins, err := s.coins.List(ctx)
	if err != nil {
		return nil, err
	}
	log.Printf("Loaded %d coins from memory", len(coins))

	// Filter and sort coins
	filtered := model.FilterAndSortCoins(coins, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	return filtered, nil
}

// loadCoinCache loads coins from the cache file
func (s *Store) loadCoinCache() error {
	data, err := os.ReadFile(coinCacheFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // File doesn't exist yet, which is fine
		}
		return fmt.Errorf("failed to read coin cache: %w", err)
	}

	var coins []model.Coin
	if err := json.Unmarshal(data, &coins); err != nil {
		return fmt.Errorf("failed to unmarshal coin cache: %w", err)
	}

	// Store coins in memory
	ctx := context.Background()
	for i := range coins {
		if err := s.coins.Create(ctx, &coins[i]); err != nil {
			return fmt.Errorf("failed to store coin in memory: %w", err)
		}
	}

	return nil
}

// SaveCoinCache saves the current coins to the cache file
func (s *Store) SaveCoinCache() error {
	ctx := context.Background()
	coins, err := s.coins.List(ctx)
	if err != nil {
		return fmt.Errorf("failed to get coins from memory: %w", err)
	}

	data, err := json.Marshal(coins)
	if err != nil {
		return fmt.Errorf("failed to marshal coins: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(coinCacheFile), 0o755); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	if err := os.WriteFile(coinCacheFile, data, 0o644); err != nil {
		return fmt.Errorf("failed to write coin cache: %w", err)
	}

	return nil
}
