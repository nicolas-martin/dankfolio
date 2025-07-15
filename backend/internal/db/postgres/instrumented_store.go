package postgres

import (
	"context"
	"log/slog"

	"gorm.io/gorm"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// InstrumentedStore wraps a Store with telemetry instrumentation
type InstrumentedStore struct {
	*Store
	tracker          tracker.APITracker
	coinsRepo        db.Repository[model.Coin]
	tradesRepo       db.Repository[model.Trade]
	walletRepo       db.Repository[model.Wallet]
	naughtyWordsRepo db.Repository[model.NaughtyWord]
}

// NewInstrumentedStore creates a new store with telemetry instrumentation
func NewInstrumentedStore(dsn string, enableAutoMigrate bool, appLogLevel slog.Level, env string, tracker tracker.APITracker) (*InstrumentedStore, error) {
	// Create the base store
	baseStore, err := NewStore(dsn, enableAutoMigrate, appLogLevel, env)
	if err != nil {
		return nil, err
	}

	// Wrap repositories with instrumentation
	return &InstrumentedStore{
		Store:            baseStore,
		tracker:          tracker,
		coinsRepo:        NewInstrumentedRepository(baseStore.coinsRepo, tracker, "Coin"),
		tradesRepo:       NewInstrumentedRepository(baseStore.tradesRepo, tracker, "Trade"),
		walletRepo:       NewInstrumentedRepository(baseStore.walletRepo, tracker, "Wallet"),
		naughtyWordsRepo: NewInstrumentedRepository(baseStore.naughtyWordsRepo, tracker, "NaughtyWord"),
	}, nil
}

// NewInstrumentedStoreWithDB creates a new instrumented store with a specific GORM DB instance
func NewInstrumentedStoreWithDB(database *gorm.DB, tracker tracker.APITracker) *InstrumentedStore {
	baseStore := NewStoreWithDB(database)
	
	return &InstrumentedStore{
		Store:            baseStore,
		tracker:          tracker,
		coinsRepo:        NewInstrumentedRepository(baseStore.coinsRepo, tracker, "Coin"),
		tradesRepo:       NewInstrumentedRepository(baseStore.tradesRepo, tracker, "Trade"),
		walletRepo:       NewInstrumentedRepository(baseStore.walletRepo, tracker, "Wallet"),
		naughtyWordsRepo: NewInstrumentedRepository(baseStore.naughtyWordsRepo, tracker, "NaughtyWord"),
	}
}

// Coins returns the instrumented coins repository
func (s *InstrumentedStore) Coins() db.Repository[model.Coin] {
	return s.coinsRepo
}

// Trades returns the instrumented trades repository
func (s *InstrumentedStore) Trades() db.Repository[model.Trade] {
	return s.tradesRepo
}

// Wallet returns the instrumented wallet repository
func (s *InstrumentedStore) Wallet() db.Repository[model.Wallet] {
	return s.walletRepo
}

// NaughtyWords returns the instrumented naughty words repository
func (s *InstrumentedStore) NaughtyWords() db.Repository[model.NaughtyWord] {
	return s.naughtyWordsRepo
}

// WithTransaction executes the given function within a database transaction with telemetry
func (s *InstrumentedStore) WithTransaction(ctx context.Context, fn func(txStore db.Store) error) error {
	return s.tracker.InstrumentCall(ctx, "database", "Transaction", func(ctx context.Context) error {
		return s.Store.WithTransaction(ctx, func(txStore db.Store) error {
			// Wrap the transaction store with instrumentation
			instrumentedTxStore := NewInstrumentedStoreWithDB(txStore.(*Store).db, s.tracker)
			return fn(instrumentedTxStore)
		})
	})
}

// ListTrendingCoins fetches trending coins with telemetry
func (s *InstrumentedStore) ListTrendingCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	var coins []model.Coin
	var total int32
	err := s.tracker.InstrumentCall(ctx, "database", "ListTrendingCoins", func(ctx context.Context) error {
		var err error
		coins, total, err = s.Store.ListTrendingCoins(ctx, opts)
		return err
	})
	return coins, total, err
}

// SearchCoins searches for coins with telemetry
func (s *InstrumentedStore) SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error) {
	var coins []model.Coin
	err := s.tracker.InstrumentCall(ctx, "database", "SearchCoins", func(ctx context.Context) error {
		var err error
		coins, err = s.Store.SearchCoins(ctx, query, tags, minVolume24h, limit, offset, sortBy, sortDesc)
		return err
	})
	return coins, err
}

// ListNewestCoins fetches the most recently created coins with telemetry
func (s *InstrumentedStore) ListNewestCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	var coins []model.Coin
	var total int32
	err := s.tracker.InstrumentCall(ctx, "database", "ListNewestCoins", func(ctx context.Context) error {
		var err error
		coins, total, err = s.Store.ListNewestCoins(ctx, opts)
		return err
	})
	return coins, total, err
}

// ListTopGainersCoins fetches coins with the highest positive price change with telemetry
func (s *InstrumentedStore) ListTopGainersCoins(ctx context.Context, opts db.ListOptions) ([]model.Coin, int32, error) {
	var coins []model.Coin
	var total int32
	err := s.tracker.InstrumentCall(ctx, "database", "ListTopGainersCoins", func(ctx context.Context) error {
		var err error
		coins, total, err = s.Store.ListTopGainersCoins(ctx, opts)
		return err
	})
	return coins, total, err
}