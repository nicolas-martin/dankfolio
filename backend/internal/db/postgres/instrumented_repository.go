package postgres

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// InstrumentedRepository wraps a repository with telemetry instrumentation
type InstrumentedRepository[M any] struct {
	repo       db.Repository[M]
	tracker    tracker.APITracker
	entityType string
}

// NewInstrumentedRepository creates a new instrumented repository
func NewInstrumentedRepository[M any](repo db.Repository[M], tracker tracker.APITracker, entityType string) db.Repository[M] {
	return &InstrumentedRepository[M]{
		repo:       repo,
		tracker:    tracker,
		entityType: entityType,
	}
}

// Get retrieves an entity by its ID with telemetry
func (r *InstrumentedRepository[M]) Get(ctx context.Context, id string) (*M, error) {
	var result *M
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.Get", r.entityType), func(ctx context.Context) error {
		var err error
		result, err = r.repo.Get(ctx, id)
		return err
	})
	return result, err
}

// GetByField retrieves an entity by a specific field value with telemetry
func (r *InstrumentedRepository[M]) GetByField(ctx context.Context, field string, value any) (*M, error) {
	var result *M
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.GetByField", r.entityType), func(ctx context.Context) error {
		var err error
		result, err = r.repo.GetByField(ctx, field, value)
		return err
	})
	return result, err
}

// List retrieves all entities with telemetry
func (r *InstrumentedRepository[M]) List(ctx context.Context, opts db.ListOptions) ([]M, int32, error) {
	var items []M
	var total int32
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.List", r.entityType), func(ctx context.Context) error {
		var err error
		items, total, err = r.repo.List(ctx, opts)
		return err
	})
	return items, total, err
}

// Create inserts a new entity with telemetry
func (r *InstrumentedRepository[M]) Create(ctx context.Context, item *M) error {
	return r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.Create", r.entityType), func(ctx context.Context) error {
		return r.repo.Create(ctx, item)
	})
}

// Update modifies an existing entity with telemetry
func (r *InstrumentedRepository[M]) Update(ctx context.Context, item *M) error {
	return r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.Update", r.entityType), func(ctx context.Context) error {
		return r.repo.Update(ctx, item)
	})
}

// Upsert inserts or updates an entity with telemetry
func (r *InstrumentedRepository[M]) Upsert(ctx context.Context, item *M) (int64, error) {
	var rowsAffected int64
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.Upsert", r.entityType), func(ctx context.Context) error {
		var err error
		rowsAffected, err = r.repo.Upsert(ctx, item)
		return err
	})
	return rowsAffected, err
}

// Delete removes an entity by its ID with telemetry
func (r *InstrumentedRepository[M]) Delete(ctx context.Context, id string) error {
	return r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.Delete", r.entityType), func(ctx context.Context) error {
		return r.repo.Delete(ctx, id)
	})
}

// BulkUpsert inserts or updates multiple entities in batches with telemetry
func (r *InstrumentedRepository[M]) BulkUpsert(ctx context.Context, items *[]M) (int64, error) {
	var rowsAffected int64
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.BulkUpsert", r.entityType), func(ctx context.Context) error {
		var err error
		rowsAffected, err = r.repo.BulkUpsert(ctx, items)
		return err
	})
	return rowsAffected, err
}

// ListWithOpts retrieves a paginated, sorted, and filtered list of entities with telemetry
func (r *InstrumentedRepository[M]) ListWithOpts(ctx context.Context, opts db.ListOptions) ([]M, int32, error) {
	var items []M
	var total int32
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.ListWithOpts", r.entityType), func(ctx context.Context) error {
		var err error
		items, total, err = r.repo.ListWithOpts(ctx, opts)
		return err
	})
	return items, total, err
}

// GetByAddresses retrieves multiple entities by their address field with telemetry
func (r *InstrumentedRepository[M]) GetByAddresses(ctx context.Context, addresses []string) ([]M, error) {
	var items []M
	err := r.tracker.InstrumentCall(ctx, "database", fmt.Sprintf("%s.GetByAddresses", r.entityType), func(ctx context.Context) error {
		var err error
		items, err = r.repo.GetByAddresses(ctx, addresses)
		return err
	})
	return items, err
}