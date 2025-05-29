package postgres

import (
	"context"
	"fmt"
	"log/slog" // Import slog
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger" // Alias gorm's logger

	"github.com/lib/pq"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Store implements the db.Store interface using PostgreSQL and GORM.
type Store struct {
	db *gorm.DB
	// Specialized repositories using the generic implementation
	coinsRepo    db.Repository[model.Coin]
	tradesRepo   db.Repository[model.Trade]
	rawCoinsRepo db.Repository[model.RawCoin]
	walletRepo   db.Repository[model.Wallet]
}

var _ db.Store = (*Store)(nil) // Compile-time check for interface implementation

// NewStore creates a new PostgreSQL store instance.
// enableSQLLogging parameter is removed, appLogLevel is used instead.
func NewStore(dsn string, enableAutoMigrate bool, appLogLevel slog.Level) (*Store, error) {
	gormConfig := &gorm.Config{}

	var gormLogLevel gormlogger.LogLevel
	if appLogLevel <= slog.LevelDebug {
		gormLogLevel = gormlogger.Info // Show all SQL logs for debug
	} else {
		gormLogLevel = gormlogger.Warn // Show only slow queries and errors for info/warn
	}
	gormConfig.Logger = gormlogger.Default.LogMode(gormLogLevel)

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

	// NOTE: Auto-migrate schema (useful for dev, but we primarily use Goose)
	// Comment out if only Goose migrations are preferred.
	if enableAutoMigrate { // Control auto-migration
		if err := dbConn.AutoMigrate(&schema.Coin{}, &schema.Trade{}, &schema.RawCoin{}, &schema.Wallet{}); err != nil {
			return nil, fmt.Errorf("failed to auto-migrate schema: %w", err)
		}
	}

	store := &Store{
		db: dbConn,
		// Initialize repositories, explicitly casting the types
		coinsRepo:    NewRepository[schema.Coin, model.Coin](dbConn),
		tradesRepo:   NewRepository[schema.Trade, model.Trade](dbConn),
		rawCoinsRepo: NewRepository[schema.RawCoin, model.RawCoin](dbConn),
		walletRepo:   NewRepository[schema.Wallet, model.Wallet](dbConn),
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

func (s *Store) Wallet() db.Repository[model.Wallet] {
	return s.walletRepo
}

// Coins returns the coin repository.
func (s *Store) Coins() db.Repository[model.Coin] {
	return s.coinsRepo
}

// Trades returns the trade repository.
func (s *Store) Trades() db.Repository[model.Trade] {
	return s.tradesRepo
}

// RawCoins returns the raw coins repository.
func (s *Store) RawCoins() db.Repository[model.RawCoin] {
	return s.rawCoinsRepo
}

// --- Custom Operations ---

// ListTrendingCoins returns coins marked as trending.
func (s *Store) ListTrendingCoins(ctx context.Context) ([]model.Coin, error) {
	var schemaCoins []schema.Coin
	if err := s.db.WithContext(ctx).Where("is_trending = ?", true).Order("last_updated DESC").Find(&schemaCoins).Error; err != nil {
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
	if strings.ToLower(sortBy) == "listed_at" {
		slog.Debug("SearchCoins: Sorting by 'listed_at', querying raw_coins directly.")
		var rawCoins []schema.RawCoin
		rawTx := s.db.WithContext(ctx).Model(&schema.RawCoin{})

		if query != "" {
			searchQuery := "%" + strings.ToLower(query) + "%"
			rawTx = rawTx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
		}
		// Tags are not directly on raw_coins schema. Tag filtering is skipped for "listed_at" sort.
		// minVolume24h filter is not applicable to raw_coins.

		dbSortColumn := "jupiter_created_at" // Mapped from "listed_at"
		order := "DESC"
		if !sortDesc {
			order = "ASC"
		}
		rawTx = rawTx.Order(fmt.Sprintf("%s %s", dbSortColumn, order))

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

	// --- Existing logic (default search) ---
	slog.Debug("SearchCoins: Using default search logic (enriched then raw).")
	// 1. Search enriched coins
	var schemaCoins []schema.Coin
	tx := s.db.WithContext(ctx).Model(&schema.Coin{})

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		// For enriched coins, query can also check mint_address
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
	}
	if len(tags) > 0 {
		tx = tx.Where("tags && ?", pq.Array(tags))
	}
	if minVolume24h > 0 {
		tx = tx.Where("volume_24h >= ?", minVolume24h)
	}

	// Use mapSortBy for enriched coins, which won't use "listed_at" here due to the if condition above
	// Default sort order or specific column based on sortBy
	if sortBy != "" {
		dbColumn := mapSortBy(sortBy) // mapSortBy handles other keys
		order := "ASC"
		if sortDesc {
			order = "DESC"
		}
		tx = tx.Order(fmt.Sprintf("%s %s", dbColumn, order))
	} else {
		// Default sort for enriched coins if no sortBy is provided
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

	// 2. Search raw coins (only if not sorting by "listed_at", and typically to fill in gaps)
	// This part of raw coin search might be redundant if limit is hit by enriched, or could be smarter.
	// For now, keeping it simple as per original structure for non-"listed_at" sorts.
	var rawCoins []schema.RawCoin
	rawTx := s.db.WithContext(ctx).Model(&schema.RawCoin{})
	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		rawTx = rawTx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(mint_address) LIKE ?", searchQuery, searchQuery, searchQuery)
	}
	// No specific sort for this secondary raw search; results are merged based on presence.
	// Limit and offset for this secondary search might need reconsideration for optimal pagination.
	// If the goal is to fill up to 'limit' total results, this simple limit here might not be correct.
	// However, sticking to the original logic for this part.
	if limit > 0 { // This limit applies independently to raw coins query
		rawTx = rawTx.Limit(int(limit))
	}
	if offset > 0 { // And this offset
		rawTx = rawTx.Offset(int(offset))
	}

	if err := rawTx.Find(&rawCoins).Error; err != nil {
		// Log error but don't fail the whole search if enriched results were found
		slog.Error("Failed to search raw coins for secondary fill", "error", err)
		// return nil, fmt.Errorf("failed to search raw coins: %w", err)
	}
	rawMapped := mapRawCoinsToModel(rawCoins)

	// 3. Merge results, prioritizing enriched coins if MintAddress is duplicated
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
	// If result is still less than limit, and there were more raw coins that could have been fetched (due to offset/limit on raw query),
	// one might consider another fetch here. But this complicates pagination significantly.

	// Re-sort the merged result if a general sortBy was applied and we merged
	// This is tricky because raw coins don't have all fields.
	// The primary sort should ideally happen on the main query (enriched coins).
	// If the list is primarily raw coins due to few enriched, the sort order from enriched might be lost.
	// For simplicity, the current model relies on the initial sort of enriched coins.

	return result, nil
}

// Helper to map sortBy to DB column
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
	case "created_at": // This refers to enriched coin's (coins table) created_at
		return "created_at"
	case "last_updated":
		return "last_updated"
	case "listed_at": // New sort key for raw_coins by JupiterCreatedAt
		return "jupiter_created_at" // The DB column name in raw_coins table
	default:
		// Consider if default should change or if an error/specific handling is needed for unknown sort keys
		// For now, keeping existing default.
		return "created_at"
	}
}

// Helper to map []schema.Coin to []model.Coin
func mapSchemaCoinsToModel(schemaCoins []schema.Coin) []model.Coin {
	coins := make([]model.Coin, len(schemaCoins))
	for i, sc := range schemaCoins {
		coins[i] = model.Coin{
			MintAddress: sc.MintAddress,
			Name:        sc.Name,
			Symbol:      sc.Symbol,
			Decimals:    sc.Decimals,
			Description: sc.Description,
			IconUrl:     sc.IconUrl,
			Tags:        sc.Tags,
			Price:       sc.Price,
			Change24h:   sc.Change24h,
			MarketCap:   sc.MarketCap,
			Volume24h:   sc.Volume24h,
			Website:     sc.Website,
			Twitter:     sc.Twitter,
			Telegram:    sc.Telegram,
			Discord:     sc.Discord,
			IsTrending:  sc.IsTrending,
			CreatedAt:   sc.CreatedAt.Format(time.RFC3339),
			LastUpdated: sc.LastUpdated.Format(time.RFC3339),
		}
	}
	return coins
}

// Helper to map []schema.RawCoin to []model.Coin
func mapRawCoinsToModel(rawCoins []schema.RawCoin) []model.Coin {
	coins := make([]model.Coin, len(rawCoins))
	for i, rc := range rawCoins {
		coins[i] = model.Coin{
			MintAddress:     rc.MintAddress,
			Name:            rc.Name,
			Symbol:          rc.Symbol,
			Decimals:        rc.Decimals,
			IconUrl:         rc.LogoUrl,
			JupiterListedAt: rc.JupiterCreatedAt, // Populate from schema.RawCoin.JupiterCreatedAt
		}
	}
	return coins
}
