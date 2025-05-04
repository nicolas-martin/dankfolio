package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/lib/pq"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Store implements the db.Store interface using PostgreSQL and GORM.
type Store struct {
	db *gorm.DB
	// Specialized repositories using the generic implementation
	coinsRepo  db.Repository[model.Coin]
	tradesRepo db.Repository[model.Trade]
}

var _ db.Store = (*Store)(nil) // Compile-time check for interface implementation

// NewStore creates a new PostgreSQL store instance.
func NewStore(dsn string, enableSQLLogging bool) (*Store, error) {
	gormConfig := &gorm.Config{}
	if enableSQLLogging {
		gormConfig.Logger = logger.Default.LogMode(logger.Info)
	} else {
		gormConfig.Logger = logger.Default.LogMode(logger.Silent)
	}

	dbConn, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Optional: Ping DB to verify connection
	sqlDB, err := dbConn.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err = sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Optional: Auto-migrate schema (useful for dev, but we primarily use Goose)
	// Comment out if only Goose migrations are preferred.
	// if err := dbConn.AutoMigrate(&schema.Coin{}, &schema.Trade{}); err != nil {
	// 	 return nil, fmt.Errorf("failed to auto-migrate schema: %w", err)
	// }

	store := &Store{
		db: dbConn,
		// Initialize repositories, explicitly casting the types
		coinsRepo:  NewRepository[schema.Coin, model.Coin](dbConn),
		tradesRepo: NewRepository[schema.Trade, model.Trade](dbConn),
	}

	return store, nil
}

// Close closes the database connection.
func (s *Store) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB for closing: %w", err)
	}
	return sqlDB.Close()
}

// Coins returns the coin repository.
func (s *Store) Coins() db.Repository[model.Coin] {
	return s.coinsRepo
}

// Trades returns the trade repository.
func (s *Store) Trades() db.Repository[model.Trade] {
	return s.tradesRepo
}

// --- Custom Operations ---

// ListTrendingCoins returns coins marked as trending.
func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	var schemaCoins []schema.Coin
	if err := s.db.WithContext(ctx).Where("is_trending = ?", true).Find(&schemaCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to list trending coins: %w", err)
	}

	// Map schema to model
	modelCoins := make([]model.Coin, len(schemaCoins))
	// Need access to the mapping function. Since it's part of the generic repo, we can use the instance.
	coinMapper := s.coinsRepo.(*Repository[schema.Coin, model.Coin])
	for i, sc := range schemaCoins {
		modelCoin := coinMapper.toModel(sc)
		modelCoins[i] = *modelCoin.(*model.Coin) // Assert and dereference
	}

	return modelCoins, nil
}

// SearchCoins searches for coins based on criteria.
func (s *Store) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	var schemaCoins []schema.Coin

	tx := s.db.WithContext(ctx).Model(&schema.Coin{})

	// Apply search query (simple case-insensitive search on name and symbol)
	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ?", searchQuery, searchQuery)
	}

	// Apply tag filter (match any tag in the list)
	if len(tags) > 0 {
		// Use array overlap operator && for PostgreSQL
		tx = tx.Where("tags && ?", pq.Array(tags))
	}

	// Apply minimum volume filter
	if minVolume24h > 0 {
		tx = tx.Where("volume_24h >= ?", minVolume24h)
	}

	// Apply sorting
	if sortBy != "" {
		// Basic validation/mapping of sortBy field to prevent SQL injection
		// In a real app, map API sort fields to actual DB columns securely.
		dbColumn := "created_at" // default sort
		switch strings.ToLower(sortBy) {
		case "name":
			dbColumn = "name"
		case "symbol":
			dbColumn = "symbol"
		case "price":
			dbColumn = "price"
		case "volume24h":
			dbColumn = "volume_24h"
		case "marketcap":
			dbColumn = "market_cap"
		case "created_at":
			dbColumn = "created_at"
		case "last_updated":
			dbColumn = "last_updated"
		}

		order := "ASC"
		if sortDesc {
			order = "DESC"
		}
		tx = tx.Order(fmt.Sprintf("%s %s", dbColumn, order))
	} else {
		// Default sort order if none provided
		tx = tx.Order("created_at DESC")
	}

	// Apply pagination
	if limit > 0 {
		tx = tx.Limit(int(limit))
	}
	if offset > 0 {
		tx = tx.Offset(int(offset))
	}

	// Execute query
	if err := tx.Find(&schemaCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to search coins: %w", err)
	}

	// Map schema to model
	modelCoins := make([]model.Coin, len(schemaCoins))
	coinMapper := s.coinsRepo.(*Repository[schema.Coin, model.Coin])
	for i, sc := range schemaCoins {
		modelCoin := coinMapper.toModel(sc)
		modelCoins[i] = *modelCoin.(*model.Coin)
	}

	return modelCoins, nil
}
