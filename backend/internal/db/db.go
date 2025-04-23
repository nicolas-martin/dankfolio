package db

import (
	"context"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Entity represents a storable entity with an ID
type Entity interface {
	GetID() string
}

// Store defines the interface for database operations
type Store interface {
	// Repository operations
	Coins() Repository[model.Coin]
	Trades() Repository[model.Trade]

	// Custom operations
	ListTrendingCoins(ctx context.Context) ([]model.Coin, error)
}

// Repository defines generic CRUD operations
type Repository[T Entity] interface {
	Get(ctx context.Context, id string) (*T, error)
	List(ctx context.Context) ([]T, error)
	Create(ctx context.Context, item *T) error
	Update(ctx context.Context, item *T) error
	Upsert(ctx context.Context, item *T) error
	Delete(ctx context.Context, id string) error
}
