package memory

import (
	"context"
	"encoding/json"
	"fmt"
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
	tokenCachePrefix   = "token:"
	tokenCacheFile     = "data/token_cache.json"
)

// Config holds configuration for the memory store
type Config struct {
	DefaultCacheExpiry time.Duration // Default expiration time for cached items
}

// Store implements the db.Store interface using in-memory storage
type Store struct {
	coins  *MemoryRepository[model.Coin]
	trades *MemoryRepository[model.Trade]
	tokens *MemoryRepository[model.Token]
	config Config
}

var _ db.Store = (*Store)(nil) // Ensure Store implements db.Store

// NewWithConfig creates a new in-memory store with custom configuration
func NewWithConfig(config Config) *Store {
	// Set defaults for zero values
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	store := &Store{
		coins:  NewRepository[model.Coin](coinCachePrefix, config),
		trades: NewRepository[model.Trade](tradeCachePrefix, config),
		tokens: NewRepository[model.Token](tokenCachePrefix, config),
		config: config,
	}

	// Load token cache from file if it exists
	if err := store.loadTokenCache(); err != nil {
		fmt.Printf("Warning: Failed to load token cache: %v\n", err)
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

// Tokens returns the token repository
func (s *Store) Tokens() db.Repository[model.Token] {
	return s.tokens
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

// SearchTokens implements db.Store
func (s *Store) SearchTokens(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Token, error) {
	tokens, err := s.tokens.List(ctx)
	if err != nil {
		return nil, err
	}

	// Filter and sort tokens using the same logic from the file implementation
	filtered := model.FilterAndSortTokens(tokens, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
	return filtered, nil
}

// loadTokenCache loads tokens from the cache file
func (s *Store) loadTokenCache() error {
	data, err := os.ReadFile(tokenCacheFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // File doesn't exist yet, which is fine
		}
		return fmt.Errorf("failed to read token cache: %w", err)
	}

	var tokens []model.Token
	if err := json.Unmarshal(data, &tokens); err != nil {
		return fmt.Errorf("failed to unmarshal token cache: %w", err)
	}

	// Store tokens in memory
	ctx := context.Background()
	for i := range tokens {
		if err := s.tokens.Create(ctx, &tokens[i]); err != nil {
			return fmt.Errorf("failed to store token in memory: %w", err)
		}
	}

	return nil
}

// SaveTokenCache saves the current tokens to the cache file
func (s *Store) SaveTokenCache() error {
	ctx := context.Background()
	tokens, err := s.tokens.List(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tokens from memory: %w", err)
	}

	data, err := json.Marshal(tokens)
	if err != nil {
		return fmt.Errorf("failed to marshal tokens: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(tokenCacheFile), 0755); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	if err := os.WriteFile(tokenCacheFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write token cache: %w", err)
	}

	return nil
}
