package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/plugin/opentelemetry/tracing"

	"github.com/lib/pq"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Store implements the db.Store interface using PostgreSQL and GORM.
type Store struct {
	db               *gorm.DB
	coinsRepo        db.Repository[model.Coin]
	tradesRepo       db.Repository[model.Trade]
	walletRepo       db.Repository[model.Wallet]
	naughtyWordsRepo db.Repository[model.NaughtyWord]
}

var _ db.Store = (*Store)(nil) // Compile-time check for interface implementation

// NewStoreWithDB creates a new store with a specific GORM DB instance (can be a transaction).
// This is used internally for creating transactional stores.
func NewStoreWithDB(database *gorm.DB) *Store {
	return &Store{
		db:               database,
		coinsRepo:        NewRepository[schema.Coin, model.Coin](database),
		tradesRepo:       NewRepository[schema.Trade, model.Trade](database),
		walletRepo:       NewRepository[schema.Wallet, model.Wallet](database),
		naughtyWordsRepo: NewRepository[schema.NaughtyWord, model.NaughtyWord](database),
	}
}

// NewStore creates a new PostgreSQL store instance and connects to the database.
func NewStore(dsn string, enableAutoMigrate bool, appLogLevel slog.Level, env string) (*Store, error) {
	var gc *gorm.Config

	if env == "development" {
		gc = &gorm.Config{
			Logger: logger.Default,
		}
	} else {
		gc = &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent), // Default to silent logger
		}
	}

	db, err := gorm.Open(postgres.Open(dsn), gc)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Add OpenTelemetry instrumentation if not in development
	if env != "development" {
		if err := db.Use(tracing.NewPlugin(
			tracing.WithAttributes(attribute.String("db.orm", "gorm")),
			tracing.WithDBSystem("postgresql"),
		)); err != nil {
			slog.Warn("Failed to register OpenTelemetry plugin for database", "error", err)
			// Continue without instrumentation
		} else {
			slog.Info("Database OpenTelemetry instrumentation enabled")
		}
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
		// Auto-migrate the schema, now including model.ApiStat and schema.NaughtyWord
		if err := db.AutoMigrate(&schema.Coin{}, &schema.Trade{}, &schema.Wallet{}, &schema.NaughtyWord{}); err != nil {
			return nil, fmt.Errorf("failed to auto-migrate schemas: %w", err)
		}
		
		// Drop unused columns from trades table
		if err := dropUnusedTradeColumns(db); err != nil {
			slog.Warn("Failed to drop unused trade columns", "error", err)
			// Don't fail startup - just log the warning
		}
	}

	// Use NewStoreWithDB to initialize the repositories
	return NewStoreWithDB(db), nil
}

// DB returns the underlying GORM database instance
func (s *Store) DB() *gorm.DB {
	return s.db
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

// NaughtyWords returns the repository for NaughtyWord entities.
func (s *Store) NaughtyWords() db.Repository[model.NaughtyWord] { // <<< ADD THIS METHOD
	return s.naughtyWordsRepo
}

// --- Custom Operations ---

func loggableInt(p *int) any {
	if p == nil {
		return nil
	}
	return *p
}

func (s *Store) ListTrendingCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	slog.DebugContext(ctx, "PostgresStore: ListTrendingCoins called", "limit", loggableInt(opts.Limit), "offset", loggableInt(opts.Offset))

	// Use SearchCoins to filter by the "trending" tag
	limit := int32(10) // default limit
	offset := int32(0)

	if opts.Limit != nil {
		limit = int32(*opts.Limit)
	}
	if opts.Offset != nil {
		offset = int32(*opts.Offset)
	}

	// Define default sorting by volume_24h descending
	sortBy := "volume_24h"
	sortDesc := true

	if opts.SortBy != nil && *opts.SortBy != "" {
		sortBy = *opts.SortBy
	}
	if opts.SortDesc != nil {
		sortDesc = *opts.SortDesc
	}

	// Search for coins with the "trending" tag
	coins, err := s.SearchCoins(ctx, "", []string{"trending"}, 0, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search for trending coins: %w", err)
	}

	return coins, int32(len(coins)), nil
}

func (s *Store) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	// Handle date-based sorting using created_at from coins table
	if strings.ToLower(sortBy) == "listed_at" || strings.ToLower(sortBy) == "jupiter_listed_at" || strings.ToLower(sortBy) == "created_at" {
		slog.Debug("SearchCoins: Sorting by date, using created_at from coins table.")
		sortBy = "created_at" // Normalize to use created_at column
	}

	slog.Debug("SearchCoins: Using coins table for search.")
	var schemaCoins []schema.Coin
	tx := s.db.WithContext(ctx).Model(&schema.Coin{})

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(address) LIKE ?", searchQuery, searchQuery, searchQuery)
	}
	if len(tags) > 0 {
		tx = tx.Where("tags @> ?", pq.Array(tags))
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
		tx = tx.Order("marketcap DESC NULLS LAST, volume_24h_usd DESC NULLS LAST, created_at DESC")
	}

	if limit > 0 {
		tx = tx.Limit(int(limit))
	}
	if offset > 0 {
		tx = tx.Offset(int(offset))
	}

	if err := tx.Find(&schemaCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to search coins: %w", err)
	}

	return mapSchemaCoinsToModel(schemaCoins), nil
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
		return "volume_24h_usd"
	case "marketcap":
		return "marketcap"
	case "created_at":
		return "created_at"
	case "last_updated":
		return "last_updated"
	case "listed_at", "jupiter_listed_at":
		return "created_at"
	case "price_24h_change_percent":
		return "price_24h_change_percent"
	default:
		return "created_at"
	}
}

func mapSchemaCoinsToModel(schemaCoins []schema.Coin) []model.Coin {
	coins := make([]model.Coin, len(schemaCoins))
	for i, sc := range schemaCoins {
		coins[i] = model.Coin{
			ID:                     sc.ID, // Ensure ID is mapped
			Address:                sc.Address,
			Name:                   sc.Name,
			Symbol:                 sc.Symbol,
			Decimals:               sc.Decimals,
			Description:            sc.Description,
			LogoURI:                sc.LogoURI,
			Tags:                   sc.Tags,
			Price:                  sc.Price,
			Price24hChangePercent:  sc.Price24hChangePercent,
			Marketcap:              sc.Marketcap,
			Volume24hUSD:           sc.Volume24hUSD,
			Volume24hChangePercent: sc.Volume24hChangePercent,
			Liquidity:              sc.Liquidity,
			FDV:                    sc.FDV,
			Rank:                   sc.Rank,
			Website:                sc.Website,
			Twitter:                sc.Twitter,
			Telegram:               sc.Telegram,
			Discord:                sc.Discord,
			CreatedAt:              sc.CreatedAt.Format(time.RFC3339),
			LastUpdated:            sc.LastUpdated.Format(time.RFC3339),
			JupiterListedAt:        sc.JupiterCreatedAt,
		}
	}
	return coins
}

// --- New Custom Store Methods ---

// ListNewestCoins fetches the most recently created coins.
func (s *Store) ListNewestCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	slog.DebugContext(ctx, "PostgresStore: ListNewestCoins called", "limit", loggableInt(opts.Limit), "offset", loggableInt(opts.Offset))

	// Use SearchCoins to filter by the "new-coin" tag
	limit := int32(10) // default limit
	offset := int32(0)

	if opts.Limit != nil {
		limit = int32(*opts.Limit)
	}
	if opts.Offset != nil {
		offset = int32(*opts.Offset)
	}

	// Define default sorting by created_at descending (newest first)
	sortBy := "created_at"
	sortDesc := true

	if opts.SortBy != nil && *opts.SortBy != "" {
		sortBy = *opts.SortBy
	}
	if opts.SortDesc != nil {
		sortDesc = *opts.SortDesc
	}

	// Search for coins with the "new-coin" tag
	coins, err := s.SearchCoins(ctx, "", []string{"new-coin"}, 0, limit, offset, sortBy, sortDesc)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search for new coins: %w", err)
	}

	return coins, int32(len(coins)), nil
}

// ListTopGainersCoins fetches coins with the highest positive price change in 24h.
func (s *Store) ListTopGainersCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	slog.DebugContext(ctx, "PostgresStore: ListTopGainersCoins called", "limit", loggableInt(opts.Limit), "offset", loggableInt(opts.Offset))

	// Use SearchCoins to filter by the "top-gainer" tag
	limit := int32(10) // default limit
	offset := int32(0)

	if opts.Limit != nil {
		limit = int32(*opts.Limit)
	}
	if opts.Offset != nil {
		offset = int32(*opts.Offset)
	}

	// Search for coins with the "top-gainer" tag, sorted by price change percentage descending
	coins, err := s.SearchCoins(ctx, "", []string{"top-gainer"}, 0, limit, offset, "price_24h_change_percent", true)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search for top gainer coins: %w", err)
	}

	return coins, int32(len(coins)), nil
}

// DeleteAccount deletes all data associated with a wallet/account.
// This includes the wallet record and all associated trades.
// This operation is performed in a transaction for atomicity.
func (s *Store) DeleteAccount(ctx context.Context, walletPublicKey string) error {
	slog.InfoContext(ctx, "PostgresStore: DeleteAccount called", "wallet", walletPublicKey)
	
	// Use a transaction to ensure atomicity
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all trades associated with this wallet
		if err := tx.Where("user_id = ?", walletPublicKey).Delete(&schema.Trade{}).Error; err != nil {
			slog.ErrorContext(ctx, "Failed to delete trades", "wallet", walletPublicKey, "error", err)
			return fmt.Errorf("failed to delete trades for wallet %s: %w", walletPublicKey, err)
		}
		
		// Delete the wallet record
		if err := tx.Where("public_key = ?", walletPublicKey).Delete(&schema.Wallet{}).Error; err != nil {
			slog.ErrorContext(ctx, "Failed to delete wallet", "wallet", walletPublicKey, "error", err)
			return fmt.Errorf("failed to delete wallet %s: %w", walletPublicKey, err)
		}
		
		// Note: We don't delete coins as they're shared across all users
		// We also don't have user-specific portfolio data in the database (it's computed on-the-fly)
		
		slog.InfoContext(ctx, "Successfully deleted account", "wallet", walletPublicKey)
		return nil
	})
}

// dropUnusedTradeColumns drops columns that are no longer used in the Trade model
func dropUnusedTradeColumns(db *gorm.DB) error {
	migrator := db.Migrator()
	
	// List of columns to drop
	columnsToRemove := []string{
		"platform_fee_mint",
		"platform_fee_destination", 
		"route_fee_amount",
		"route_fee_mints",
		"route_fee_details",
	}
	
	// Check if trades table exists
	if !migrator.HasTable(&schema.Trade{}) {
		slog.Debug("Trades table does not exist yet, skipping column cleanup")
		return nil
	}
	
	// Drop each column if it exists
	for _, column := range columnsToRemove {
		if migrator.HasColumn(&schema.Trade{}, column) {
			if err := migrator.DropColumn(&schema.Trade{}, column); err != nil {
				slog.Warn("Failed to drop column from trades table", 
					"column", column, 
					"error", err)
				// Continue with other columns even if one fails
			} else {
				slog.Info("Successfully dropped unused column from trades table", 
					"column", column)
			}
		}
	}
	
	return nil
}
