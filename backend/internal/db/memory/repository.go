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

func (r *MemoryRepository[T]) List(ctx context.Context) ([]T, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Try cache first
	if items, ok := r.listCache.Get("all"); ok {
		return items, nil
	}

	// If not in cache, get from storage
	items := make([]T, 0, len(r.items))
	for _, item := range r.items {
		items = append(items, item)
	}

	// Cache the result
	r.listCache.Set("all", items, r.config.DefaultCacheExpiry)
	return items, nil
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

func (r *MemoryRepository[T]) Upsert(ctx context.Context, item *T) error {
	if item == nil {
		return fmt.Errorf("cannot upsert nil item")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := (*item).GetID()
	r.items[id] = *item

	// Invalidate caches
	r.cache.Delete(id)
	r.listCache.Delete("all")
	return nil
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

func (r *MemoryRepository[T]) GetByField(ctx context.Context, field string, value interface{}) (*T, error) {
	return nil, fmt.Errorf("GetByField not implemented")
}

// GetList retrieves a list from the cache
func (r *MemoryRepository[T]) GetList(ctx context.Context, id string) (*[]T, error) {
	if items, ok := r.listCache.Get(id); ok {
		return &items, nil
	}
	return nil, fmt.Errorf("list not found: %s", id)
}
