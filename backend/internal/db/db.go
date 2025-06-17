package db

import (
	"context"
	"errors"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// Predefined errors
var (
	ErrNotFound = errors.New("record not found")
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
	RawCoins() Repository[model.RawCoin]
	Wallet() Repository[model.Wallet]
	// ApiStats() ApiStatsRepository // Changed to use generic repository
	ApiStats() Repository[model.ApiStat] // model.ApiStat will be used as T in Repository[T Entity]

	// Custom operations
	ListTrendingCoins(ctx context.Context, opts ListOptions) ([]model.Coin, int32, error)
	SearchCoins(ctx context.Context, query string, tags []string, minVolume24h float64, limit, offset int32, sortBy string, sortDesc bool) ([]model.Coin, error)
	ListNewestCoins(ctx context.Context, opts ListOptions) ([]model.Coin, int32, error)
	ListTopGainersCoins(ctx context.Context, opts ListOptions) ([]model.Coin, int32, error)

	// Transaction management
	WithTransaction(ctx context.Context, fn func(s Store) error) error
}

// Repository defines generic CRUD operations
type Repository[T Entity] interface {
	Get(ctx context.Context, id string) (*T, error)
	List(ctx context.Context, opts ListOptions) ([]T, int32, error) // Changed to accept ListOptions and return total count
	Create(ctx context.Context, item *T) error
	Update(ctx context.Context, item *T) error
	Upsert(ctx context.Context, item *T) (int64, error)
	BulkUpsert(ctx context.Context, items *[]T) (int64, error)
	Delete(ctx context.Context, id string) error
	GetByField(ctx context.Context, field string, value any) (*T, error)
	ListWithOpts(ctx context.Context, opts ListOptions) ([]T, int32, error) // Returns entities and total count
}

// FilterOperator defines the type for filter operations.
type FilterOperator string

// Defines constants for various filter operators.
const (
	FilterOpEqual        FilterOperator = "="
	FilterOpNotEqual     FilterOperator = "!="
	FilterOpGreaterThan  FilterOperator = ">"
	FilterOpLessThan     FilterOperator = "<"
	FilterOpGreaterEqual FilterOperator = ">="
	FilterOpLessEqual    FilterOperator = "<="
	FilterOpIn           FilterOperator = "IN"
	FilterOpNotIn        FilterOperator = "NOT IN"
	FilterOpLike         FilterOperator = "LIKE"
)

// FilterOption represents a single filter condition.
type FilterOption struct {
	Field    string         // Database column name (e.g., "name", "volume_24h")
	Operator FilterOperator // Operator (e.g., FilterOpEqual, FilterOpGreaterThan)
	Value    any            // Value to compare against
}

// ListOptions provides options for listing entities with pagination, sorting, and filtering.
type ListOptions struct {
	Limit    *int           // Limit the number of results (pagination)
	Offset   *int           // Offset for results (pagination)
	SortBy   *string        // Field name to sort by (e.g., "volume_24h", "created_at")
	SortDesc *bool          // True for descending sort, false for ascending
	Filters  []FilterOption // Slice of filter conditions to apply
}
