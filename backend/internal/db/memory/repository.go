package memory

import (
	"context"
	"fmt"
	"sync"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
)

// MemoryRepository implements Repository using in-memory storage
type MemoryRepository[T db.Entity] struct {
	items     map[string]T
	cache     *TypedCache[T]
	listCache *TypedCache[[]T]
	mu        sync.RWMutex
	config    Config
}

// NewRepository creates a new memory repository
func NewRepository[T db.Entity](cachePrefix string, config Config) *MemoryRepository[T] {
	if config.DefaultCacheExpiry <= 0 {
		config.DefaultCacheExpiry = defaultCacheExpiry
	}

	return &MemoryRepository[T]{
		items:     make(map[string]T),
		cache:     NewTypedCache[T](cachePrefix),
		listCache: NewTypedCache[[]T](cachePrefix + "list:"),
		config:    config,
	}
}

// ListWithOpts for memory repository.
// TODO: Implement proper filtering, sorting, and pagination based on opts.
// Currently, it returns all items and ignores options, similar to the old List behavior.
func (r *MemoryRepository[T]) ListWithOpts(ctx context.Context, opts db.ListOptions) ([]T, int32, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Try cache first - for "all" items as options are not applied
	// A more sophisticated caching would consider opts in the cache key.
	cacheKey := "all_list_with_opts" // Simplified cache key
	if items, ok := r.listCache.Get(cacheKey); ok {
		// Assuming total count for "all" is also cached or can be derived.
		// For simplicity, returning len(items) as total when fetched from cache.
		return items, int32(len(items)), nil
	}

	// If not in cache, get from storage
	items := make([]T, 0, len(r.items))
	for _, item := range r.items {
		items = append(items, item)
	}

	// Apply pagination if provided, even if filtering/sorting is not.
	// This is a basic step towards respecting opts.
	totalCount := int32(len(items))
	start := 0
	end := len(items)

	if opts.Offset != nil && *opts.Offset > 0 {
		start = *opts.Offset
		if start > len(items) {
			start = len(items)
		}
	}

	if opts.Limit != nil && *opts.Limit > 0 {
		limit := *opts.Limit
		if start+limit < len(items) {
			end = start + limit
		}
	}

	paginatedItems := items[start:end]

	// Cache the paginated result (or all items if pagination not fully implemented for cache)
	r.listCache.Set(cacheKey, paginatedItems, r.config.DefaultCacheExpiry) // Caching the (potentially) paginated slice
	return paginatedItems, totalCount, nil
}

func (r *MemoryRepository[T]) Get(ctx context.Context, id string) (*T, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Try cache first
	if item, ok := r.cache.Get(id); ok {
		return &item, nil
	}

	// If not in cache, get from storage
	item, exists := r.items[id]
	if !exists {
		return nil, fmt.Errorf("item not found: %s", id)
	}

	// Cache the result
	r.cache.Set(id, item, r.config.DefaultCacheExpiry)
	return &item, nil
}

func (r *MemoryRepository[T]) List(ctx context.Context, opts db.ListOptions) ([]T, int32, error) {
	// Now calls ListWithOpts, passing through the options.
	return r.ListWithOpts(ctx, opts)
}

func (r *MemoryRepository[T]) Create(ctx context.Context, item *T) error {
	if item == nil {
		return fmt.Errorf("cannot create nil item")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := (*item).GetID()
	if _, exists := r.items[id]; exists {
		return fmt.Errorf("item already exists: %s", id)
	}

	r.items[id] = *item

	// Invalidate caches
	r.cache.Delete(id)
	r.listCache.Delete("all")
	return nil
}

func (r *MemoryRepository[T]) Update(ctx context.Context, item *T) error {
	if item == nil {
		return fmt.Errorf("cannot update nil item")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := (*item).GetID()
	if _, exists := r.items[id]; !exists {
		return fmt.Errorf("item not found: %s", id)
	}

	r.items[id] = *item

	// Invalidate caches
	r.cache.Delete(id)
	r.listCache.Delete("all")
	return nil
}

// Upsert inserts or updates an entity in the memory store.
func (r *MemoryRepository[T]) Upsert(ctx context.Context, item *T) (int64, error) {
	if item == nil {
		return 0, fmt.Errorf("cannot upsert nil item")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := (*item).GetID()
	r.items[id] = *item

	// Invalidate caches
	r.cache.Delete(id)
	r.listCache.Delete("all")
	return 1, nil // 1 row affected, no error
}

// BulkUpsert inserts or updates multiple entities in the memory store.
func (r *MemoryRepository[T]) BulkUpsert(ctx context.Context, items *[]T) (int64, error) {
	return 0, fmt.Errorf("BulkUpsert not implemented")
}

func (r *MemoryRepository[T]) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.items, id)

	// Invalidate caches
	r.cache.Delete(id)
	r.listCache.Delete("all")
	return nil
}

// GetCoin retrieves a coin from the cache
func (r *MemoryRepository[T]) GetCoin(ctx context.Context, id string) (*T, error) {
	if item, ok := r.cache.Get(id); ok {
		return &item, nil
	}
	return nil, fmt.Errorf("item not found: %s", id)
}

func (r *MemoryRepository[T]) GetByField(ctx context.Context, field string, value any) (*T, error) {
	return nil, fmt.Errorf("GetByField not implemented")
}

// GetList retrieves a list from the cache
func (r *MemoryRepository[T]) GetList(ctx context.Context, id string) (*[]T, error) {
	if items, ok := r.listCache.Get(id); ok {
		return &items, nil
	}
	return nil, fmt.Errorf("list not found: %s", id)
}
