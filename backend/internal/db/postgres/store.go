package postgres

import (
	"context"
	"fmt"
	"log/slog"
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
	db           *gorm.DB
	coinsRepo    db.Repository[model.Coin]
	tradesRepo   db.Repository[model.Trade]
	rawCoinsRepo db.Repository[model.RawCoin]
	walletRepo   db.Repository[model.Wallet]
	apiStatsRepo db.Repository[model.ApiStat] // Changed to generic repository
}

var _ db.Store = (*Store)(nil) // Compile-time check for interface implementation

// NewStoreWithDB creates a new store with a specific GORM DB instance (can be a transaction).
// This is used internally for creating transactional stores.
func NewStoreWithDB(database *gorm.DB) *Store {
	return &Store{
		db:           database,
		coinsRepo:    NewRepository[schema.Coin, model.Coin](database),
		tradesRepo:   NewRepository[schema.Trade, model.Trade](database),
		rawCoinsRepo: NewRepository[schema.RawCoin, model.RawCoin](database),
		walletRepo:   NewRepository[schema.Wallet, model.Wallet](database),
		apiStatsRepo: NewRepository[model.ApiStat, model.ApiStat](database), // Use generic repo; S=model.ApiStat, M=model.ApiStat
	}
}

// NewStore creates a new PostgreSQL store instance and connects to the database.
func NewStore(dsn string, enableAutoMigrate bool, appLogLevel slog.Level, env string) (*Store, error) {
	gc := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // Default to silent logger
	}

	if env == "development" {
		gc = &gorm.Config{
			Logger: logger.Default,
		}
	}

	db, err := gorm.Open(postgres.Open(dsn), gc)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err = sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if enableAutoMigrate {
		// Auto-migrate the schema, now including model.ApiStat
		if err := db.AutoMigrate(&schema.Coin{}, &schema.Trade{}, &schema.RawCoin{}, &schema.Wallet{}, &model.ApiStat{}); err != nil {
			return nil, fmt.Errorf("failed to auto-migrate schemas: %w", err)
		}
	}

	// Use NewStoreWithDB to initialize the repositories
	return NewStoreWithDB(db), nil
}

// Close closes the database connection.
func (s *Store) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB for closing: %w", err)
	}
	return sqlDB.Close()
}

// WithTransaction executes the given function within a database transaction.
// If the function returns an error, the transaction is rolled back. Otherwise, it's committed.
func (s *Store) WithTransaction(ctx context.Context, fn func(txStore db.Store) error) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create a new Store instance that uses this transaction
		txStore := NewStoreWithDB(tx)
		return fn(txStore)
	})
}

func (s *Store) Wallet() db.Repository[model.Wallet] {
	return s.walletRepo
}

func (s *Store) Coins() db.Repository[model.Coin] {
	return s.coinsRepo
}

func (s *Store) Trades() db.Repository[model.Trade] {
	return s.tradesRepo
}

func (s *Store) RawCoins() db.Repository[model.RawCoin] {
	return s.rawCoinsRepo
}

func (s *Store) ApiStats() db.Repository[model.ApiStat] { // Changed return type
	return s.apiStatsRepo
}

// --- Custom Operations ---

func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	var schemaCoins []schema.Coin
	// Use s.db which could be the main DB connection or a transaction
	if err := s.db.WithContext(ctx).Where("is_trending = ?", true).Order("last_updated DESC").Find(&schemaCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to list trending coins: %w", err)
	}

	// modelCoins := make([]model.Coin, len(schemaCoins))
	// The Coins() method returns the repository which has the toModel method.
	// However, toModel is not exported. For custom queries like this in the store layer,
	// direct mapping or using a temporary repository instance with the same DB handle is needed.
	// For simplicity and consistency, using the existing mapping helpers if they were accessible,
	// or re-mapping here. The current structure uses helper funcs mapSchemaCoinsToModel.
	return mapSchemaCoinsToModel(schemaCoins), nil
}

func (s *Store) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	if strings.ToLower(sortBy) == "listed_at" || strings.ToLower(sortBy) == "jupiter_listed_at" {
		slog.Debug("SearchCoins: Sorting by 'listed_at' or 'jupiter_listed_at', querying raw_coins directly.")
		var rawCoins []schema.RawCoin
		rawTx := s.db.WithContext(ctx).Model(&schema.RawCoin{})

		if query != "" {
			searchQuery := "%" + strings.ToLower(query) + "%"
			rawTx = rawTx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
		}

		dbSortColumn := "jupiter_created_at"
		order := "DESC"
		if !sortDesc {
			order = "ASC"
		}
		rawTx = rawTx.Order(fmt.Sprintf("%s %s NULLS LAST", dbSortColumn, order))

		if limit > 0 {
			rawTx = rawTx.Limit(int(limit))
		}
		if offset > 0 {
			rawTx = rawTx.Offset(int(offset))
		}

		if err := rawTx.Find(&rawCoins).Error; err != nil {
			return nil, fmt.Errorf("failed to search raw coins by listed_at: %w", err)
		}
		return mapRawCoinsToModel(rawCoins), nil
	}

	slog.Debug("SearchCoins: Using default search logic (enriched then raw).")
	var schemaCoins []schema.Coin
	tx := s.db.WithContext(ctx).Model(&schema.Coin{})

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
	}
	if len(tags) > 0 {
		tx = tx.Where("tags && ?", pq.Array(tags))
	}
	if minVolume24h > 0 {
		tx = tx.Where("volume_24h >= ?", minVolume24h)
	}

	if sortBy != "" {
		dbColumn := mapSortBy(sortBy)
		order := "ASC"
		if sortDesc {
			order = "DESC"
		}
		tx = tx.Order(fmt.Sprintf("%s %s", dbColumn, order))
	} else {
		tx = tx.Order("market_cap DESC NULLS LAST, volume_24h DESC NULLS LAST, created_at DESC")
	}

	if limit > 0 {
		tx = tx.Limit(int(limit))
	}
	if offset > 0 {
		tx = tx.Offset(int(offset))
	}

	if err := tx.Find(&schemaCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to search enriched coins: %w", err)
	}
	enriched := mapSchemaCoinsToModel(schemaCoins)

	var rawCoins []schema.RawCoin
	rawTx := s.db.WithContext(ctx).Model(&schema.RawCoin{})
	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		rawTx = rawTx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
	}
	if limit > 0 {
		rawTx = rawTx.Limit(int(limit))
	}
	if offset > 0 {
		rawTx = rawTx.Offset(int(offset))
	}

	if err := rawTx.Find(&rawCoins).Error; err != nil {
		slog.Error("Failed to search raw coins for secondary fill", "error", err)
	}
	rawMapped := mapRawCoinsToModel(rawCoins)

	coinMap := make(map[string]model.Coin)
	result := make([]model.Coin, 0, len(enriched)+len(rawMapped))

	for _, coin := range enriched {
		coinMap[coin.MintAddress] = coin
		result = append(result, coin)
	}
	for _, coin := range rawMapped {
		if _, exists := coinMap[coin.MintAddress]; !exists {
			result = append(result, coin)
		}
	}
	return result, nil
}

func mapSortBy(sortBy string) string {
	switch strings.ToLower(sortBy) {
	case "name":
		return "name"
	case "symbol":
		return "symbol"
	case "price":
		return "price"
	case "volume24h":
		return "volume_24h"
	case "marketcap":
		return "market_cap"
	case "created_at":
		return "created_at"
	case "last_updated":
		return "last_updated"
	case "listed_at", "jupiter_listed_at":
		return "jupiter_created_at"
	default:
		return "created_at"
	}
}

func mapSchemaCoinsToModel(schemaCoins []schema.Coin) []model.Coin {
	coins := make([]model.Coin, len(schemaCoins))
	for i, sc := range schemaCoins {
		coins[i] = model.Coin{
			ID:              sc.ID, // Ensure ID is mapped
			MintAddress:     sc.MintAddress,
			Name:            sc.Name,
			Symbol:          sc.Symbol,
			Decimals:        sc.Decimals,
			Description:     sc.Description,
			IconUrl:         sc.IconUrl,
			ResolvedIconUrl: sc.ResolvedIconUrl,
			Tags:            sc.Tags,
			Price:           sc.Price,
			Change24h:       sc.Change24h,
			MarketCap:       sc.MarketCap,
			Volume24h:       sc.Volume24h,
			Website:         sc.Website,
			Twitter:         sc.Twitter,
			Telegram:        sc.Telegram,
			Discord:         sc.Discord,
			IsTrending:      sc.IsTrending,
			CreatedAt:       sc.CreatedAt.Format(time.RFC3339),
			LastUpdated:     sc.LastUpdated.Format(time.RFC3339),
			JupiterListedAt: sc.JupiterCreatedAt,
		}
	}
	return coins
}

func mapRawCoinsToModel(rawCoins []schema.RawCoin) []model.Coin {
	coins := make([]model.Coin, len(rawCoins))
	for i, rc := range rawCoins {
		coins[i] = model.Coin{
			ID:              rc.ID, // Ensure ID is mapped
			MintAddress:     rc.MintAddress,
			Name:            rc.Name,
			Symbol:          rc.Symbol,
			Decimals:        rc.Decimals,
			IconUrl:         rc.LogoUrl,
			JupiterListedAt: &rc.JupiterCreatedAt,
		}
	}
	return coins
}
