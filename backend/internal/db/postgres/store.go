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
	db               *gorm.DB
	coinsRepo        db.Repository[model.Coin]
	tradesRepo       db.Repository[model.Trade]
	rawCoinsRepo     db.Repository[model.RawCoin]
	walletRepo       db.Repository[model.Wallet]
	apiStatsRepo     db.Repository[model.ApiStat]
	naughtyWordsRepo db.Repository[model.NaughtyWord] // <<< ADD THIS LINE
}

var _ db.Store = (*Store)(nil) // Compile-time check for interface implementation

// NewStoreWithDB creates a new store with a specific GORM DB instance (can be a transaction).
// This is used internally for creating transactional stores.
func NewStoreWithDB(database *gorm.DB) *Store {
	return &Store{
		db:               database,
		coinsRepo:        NewRepository[schema.Coin, model.Coin](database),
		tradesRepo:       NewRepository[schema.Trade, model.Trade](database),
		rawCoinsRepo:     NewRepository[schema.RawCoin, model.RawCoin](database),
		walletRepo:       NewRepository[schema.Wallet, model.Wallet](database),
		apiStatsRepo:     NewRepository[model.ApiStat, model.ApiStat](database),          // Use generic repo; S=model.ApiStat, M=model.ApiStat
		naughtyWordsRepo: NewRepository[schema.NaughtyWord, model.NaughtyWord](database), // <<< ADD THIS LINE
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
		if err := db.AutoMigrate(&schema.Coin{}, &schema.Trade{}, &schema.RawCoin{}, &schema.Wallet{}, &model.ApiStat{}, &schema.NaughtyWord{}); err != nil {
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

// NaughtyWords returns the repository for NaughtyWord entities.
func (s *Store) NaughtyWords() db.Repository[model.NaughtyWord] { // <<< ADD THIS METHOD
	return s.naughtyWordsRepo
}

// --- Custom Operations ---

func (s *Store) ListTrendingCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	slog.DebugContext(ctx, "PostgresStore: ListTrendingCoins called", "limit", opts.Limit, "offset", opts.Offset)

	// Default limit and offset if not provided
	if opts.Limit == nil {
		defaultLimit := 10
		opts.Limit = &defaultLimit
	}
	if opts.Offset == nil {
		defaultOffset := 0
		opts.Offset = &defaultOffset
	}

	// Add filter for "trending" tag
	opts.Filters = append(opts.Filters, db.FilterOption{
		Field:    "tags",
		Operator: db.FilterArrayOpContains,
		Value:    pq.Array([]string{"trending"}),
	})

	// Define default sorting if not provided in opts
	if opts.SortBy == nil || *opts.SortBy == "" {
		defaultSortBy := "volume_24h_usd" // Mapped from "volume_24h"
		opts.SortBy = &defaultSortBy
		// Set SortDesc only if SortBy was also defaulted, to maintain original behavior
		if opts.SortDesc == nil {
			defaultSortDesc := true
			opts.SortDesc = &defaultSortDesc
		}
	}

	// Ensure ResolvedIconUrl is populated for all coins. This logic might be better in the service layer.
	// For now, keeping the direct call to ListWithOpts as the primary goal.
	// Image resolution should ideally happen after fetching.

	coins, totalCount, err := s.coinsRepo.ListWithOpts(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list trending coins using ListWithOpts: %w", err)
	}

	return coins, totalCount, nil
}

// mapSortBy was here, it's being removed.

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
			ResolvedIconUrl:        sc.ResolvedIconUrl,
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
	slog.DebugContext(ctx, "PostgresStore: ListNewestCoins called", "limit", opts.Limit, "offset", opts.Offset)

	// Default limit and offset if not provided
	if opts.Limit == nil {
		defaultLimit := 10
		opts.Limit = &defaultLimit
	}
	if opts.Offset == nil {
		defaultOffset := 0
		opts.Offset = &defaultOffset
	}

	// Add filter for "new-coin" tag
	opts.Filters = append(opts.Filters, db.FilterOption{
		Field:    "tags",
		Operator: db.FilterArrayOpContains,
		Value:    pq.Array([]string{"new-coin"}),
	})

	// Define default sorting if not provided in opts
	if opts.SortBy == nil || *opts.SortBy == "" {
		defaultSortBy := "created_at"
		opts.SortBy = &defaultSortBy
		if opts.SortDesc == nil {
			defaultSortDesc := true
			opts.SortDesc = &defaultSortDesc
		}
	}

	coins, totalCount, err := s.coinsRepo.ListWithOpts(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list newest coins using ListWithOpts: %w", err)
	}

	return coins, totalCount, nil
}

// ListTopGainersCoins fetches coins with the highest positive price change in 24h.
func (s *Store) ListTopGainersCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	slog.DebugContext(ctx, "PostgresStore: ListTopGainersCoins called", "limit", opts.Limit, "offset", opts.Offset)

	// Default limit and offset if not provided
	if opts.Limit == nil {
		defaultLimit := 10
		opts.Limit = &defaultLimit
	}
	if opts.Offset == nil {
		defaultOffset := 0
		opts.Offset = &defaultOffset
	}

	// Add filter for "top-gainer" tag
	opts.Filters = append(opts.Filters, db.FilterOption{
		Field:    "tags",
		Operator: db.FilterArrayOpContains,
		Value:    pq.Array([]string{"top-gainer"}),
	})

	// Define default sorting if not provided in opts (original was hardcoded)
	if opts.SortBy == nil || *opts.SortBy == "" {
		defaultSortBy := "price_24h_change_percent"
		opts.SortBy = &defaultSortBy
		if opts.SortDesc == nil {
			defaultSortDesc := true
			opts.SortDesc = &defaultSortDesc
		}
	}

	coins, totalCount, err := s.coinsRepo.ListWithOpts(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list top gainer coins using ListWithOpts: %w", err)
	}

	return coins, totalCount, nil
}

func mapRawCoinsToModel(rawCoins []schema.RawCoin) []model.Coin {
	coins := make([]model.Coin, len(rawCoins))
	for i, rc := range rawCoins {
		coins[i] = model.Coin{
			ID:              rc.ID, // Ensure ID is mapped
			Address:         rc.Address,
			Name:            rc.Name,
			Symbol:          rc.Symbol,
			Decimals:        rc.Decimals,
			LogoURI:         rc.LogoUrl,
			JupiterListedAt: &rc.JupiterCreatedAt,
		}
	}
	return coins
}
