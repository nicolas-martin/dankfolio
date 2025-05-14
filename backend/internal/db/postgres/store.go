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
	coinsRepo    db.Repository[model.Coin]
	tradesRepo   db.Repository[model.Trade]
	rawCoinsRepo db.Repository[model.RawCoin]
	walletRepo   db.Repository[model.Wallet]
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

	// NOTE: Auto-migrate schema (useful for dev, but we primarily use Goose)
	// Comment out if only Goose migrations are preferred.
	if err := dbConn.AutoMigrate(&schema.Coin{}, &schema.Trade{}, &schema.RawCoin{}, &schema.Wallet{}); err != nil {
		return nil, fmt.Errorf("failed to auto-migrate schema: %w", err)
	}

	store := &Store{
		db: dbConn,
		// Initialize repositories, explicitly casting the types
		coinsRepo:    NewRepository[schema.Coin, model.Coin](dbConn),
		tradesRepo:   NewRepository[schema.Trade, model.Trade](dbConn),
		rawCoinsRepo: NewRepository[schema.RawCoin, model.RawCoin](dbConn),
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
	// 1. Search enriched coins
	var schemaCoins []schema.Coin
	tx := s.db.WithContext(ctx).Model(&schema.Coin{})

	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		tx = tx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ?", searchQuery, searchQuery)
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
		tx = tx.Order("created_at DESC")
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

	enriched := mapSchemaCoinsToModel(schemaCoins)

	// 2. Search raw coins
	var rawCoins []schema.RawCoin
	rawTx := s.db.WithContext(ctx).Model(&schema.RawCoin{})
	if query != "" {
		searchQuery := "%" + strings.ToLower(query) + "%"
		rawTx = rawTx.Where("LOWER(name) LIKE ? OR LOWER(symbol) LIKE ?", searchQuery, searchQuery)
	}
	if limit > 0 {
		rawTx = rawTx.Limit(int(limit))
	}
	if offset > 0 {
		rawTx = rawTx.Offset(int(offset))
	}
	if err := rawTx.Find(&rawCoins).Error; err != nil {
		return nil, fmt.Errorf("failed to search raw coins: %w", err)
	}

	raw := mapRawCoinsToModel(rawCoins)

	// 3. Merge results, prioritizing enriched coins if MintAddress is duplicated
	coinMap := make(map[string]model.Coin)
	result := make([]model.Coin, 0, len(enriched)+len(raw))

	// Add enriched coins first
	for _, coin := range enriched {
		coinMap[coin.MintAddress] = coin
		result = append(result, coin)
	}
	// Add raw coins only if not already present
	for _, coin := range raw {
		if _, exists := coinMap[coin.MintAddress]; !exists {
			result = append(result, coin)
		}
	}

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
	case "created_at":
		return "created_at"
	case "last_updated":
		return "last_updated"
	default:
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
			MintAddress: rc.MintAddress,
			Name:        rc.Name,
			Symbol:      rc.Symbol,
			Decimals:    rc.Decimals,
			IconUrl:     rc.LogoUrl,
		}
	}
	return coins
}

// GetByTransactionHash retrieves a trade by its transaction hash
func (s *Store) GetByTransactionHash(ctx context.Context, txHash string) (*model.Trade, error) {
	var schemaTrade schema.Trade
	if err := s.db.WithContext(ctx).Where("transaction_hash = ?", txHash).First(&schemaTrade).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: trade with transaction hash %s not found", db.ErrNotFound, txHash)
		}
		return nil, fmt.Errorf("failed to get trade by transaction hash: %w", err)
	}

	// Convert schema to model using the existing repository's toModel function
	tradeMapper := s.tradesRepo.(*Repository[schema.Trade, model.Trade])
	modelTrade := tradeMapper.toModel(schemaTrade)
	return modelTrade.(*model.Trade), nil
}
