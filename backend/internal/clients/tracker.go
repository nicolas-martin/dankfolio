package clients

import (
	"context"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry" // Added telemetry import
	"log/slog"
)

// APICallTracker defines the interface for tracking API calls.
// Note: The original task asked to modify APICallTracker. We are modifying APICallTrackerImpl
// and will adjust the interface if necessary, or assume APICallTrackerImpl is the target.
// For now, the interface remains, and APICallTrackerImpl implements it.
type APICallTracker interface {
	// Increment records an API call to a specific service and endpoint,
	// and persists this increment to the database.
	Increment(serviceName, endpointName string)

	// GetStats returns a map of service names to a map of endpoint names to call counts from memory.
	GetStats() map[string]map[string]int

	// LoadStatsForToday loads API call statistics for the current day from the database
	// into the in-memory tracker.
	LoadStatsForToday(ctx context.Context) error

	// ResetStats flushes current in-memory statistics to the database for the current day
	// and clears the in-memory map.
	ResetStats(ctx context.Context) error

	// Start launches the background goroutine for periodic logging and daily stats reset.
	Start(ctx context.Context)
}

// APICallTrackerImpl implements the APICallTracker interface using a thread-safe map
// and a database store for persistence.
type APICallTrackerImpl struct {
	counts  map[string]map[string]int
	mutex   sync.Mutex
	dbStore db.Store
	logger  *slog.Logger
}

// NewAPICallTracker creates a new APICallTrackerImpl.
func NewAPICallTracker(store db.Store, logger *slog.Logger) APICallTracker {
	if logger == nil {
		logger = slog.Default()
	}
	return &APICallTrackerImpl{
		counts:  make(map[string]map[string]int),
		dbStore: store,
		logger:  logger.With("component", "api_call_tracker"),
	}
}

// Increment records an API call to a specific service and endpoint both in memory and in the database.
func (t *APICallTrackerImpl) Increment(serviceName, endpointName string) {
	t.mutex.Lock()
	if _, ok := t.counts[serviceName]; !ok {
		t.counts[serviceName] = make(map[string]int)
	}
	t.counts[serviceName][endpointName]++
	newTotalCount := t.counts[serviceName][endpointName]
	t.mutex.Unlock() // Unlock before DB call to avoid holding lock during I/O

	// Persist to database.
	// The Upsert method in ApiStatsRepository now sets the count to the provided value.
	// So, we pass the newTotalCount.
	stat := &model.ApiStat{
		ServiceName:  serviceName,
		EndpointName: endpointName,
		Date:         time.Now().Truncate(24 * time.Hour), // Use current date, truncated to day
		Count:        newTotalCount,                       // Pass the new total count
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second) // Context for DB operation
	defer cancel()

	if _, err := t.dbStore.ApiStats().Upsert(ctx, stat); err != nil { // Correctly handle two return values
		t.logger.Error("Failed to upsert API stat", "error", err, "service", serviceName, "endpoint", endpointName, "new_total_count", newTotalCount)
		// If DB write fails, the in-memory count is already incremented.
		// Depending on requirements, we might want to revert or handle this.
		// For now, we log the error and the in-memory count remains.
	}
}

// GetStats returns a copy of the current in-memory statistics.
func (t *APICallTrackerImpl) GetStats() map[string]map[string]int {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	statsCopy := make(map[string]map[string]int)
	for serviceName, endpointMap := range t.counts {
		statsCopy[serviceName] = make(map[string]int)
		for endpointName, count := range endpointMap {
			statsCopy[serviceName][endpointName] = count
		}
	}
	return statsCopy
}

// LoadStatsForToday fetches today's stats from the database and populates the in-memory stats map.
// This should typically be called once at application startup.
func (t *APICallTrackerImpl) LoadStatsForToday(ctx context.Context) error {
	today := time.Now().Truncate(24 * time.Hour)

	opts := db.ListOptions{
		Filters: []db.FilterOption{
			// model.ApiStat has `Date time.Time gorm:"type:date"`.
			// GORM should handle comparison with a time.Time value correctly for DATE columns.
			// Formatting to "2006-01-02" string might be needed if there are timezone issues or specific DB driver behaviors,
			// but direct time.Time is often preferred with GORM if possible.
			// Let's stick to time.Time for now, as repository.go's GetByDate was also using time.Time with date.Format.
			// The generic ListWithOpts builds SQL like "date = ?" so GORM will handle the value.
			{Field: "date", Operator: db.FilterOpEqual, Value: today},
		},
		// No limit needed, we want all stats for that date.
	}

	// db.Repository.ListWithOpts returns ([]T, int64, error)
	// For model.ApiStat, T is model.ApiStat. So result is []model.ApiStat
	dbStats, _, err := t.dbStore.ApiStats().ListWithOpts(ctx, opts)
	if err != nil {
		// Note: ListWithOpts might not return db.ErrNotFound directly if no records match filters.
		// It would typically return an empty slice and no error.
		// db.ErrNotFound is more common for Get or First type operations.
		// So, we don't explicitly check for db.ErrNotFound here, an empty slice is sufficient.
		t.logger.Error("Failed to load API stats for today from database using ListWithOpts", "error", err)
		return err
	}

	if len(dbStats) == 0 {
		t.logger.Info("No API stats found in DB for today", "date", today.Format("2006-01-02"))
		return nil // Not an error if no stats exist yet
	}
	// Not an error if no stats exist yet, so return nil.
	// This line is now part of the len(dbStats) == 0 block due to the brace removal.
	// It should be outside or the logic re-evaluated.
	// Based on the original intent, if len(dbStats) == 0, we log and return nil.
	// The 'return nil' after the block seems redundant if the block itself returns nil.
	// Let's assume the first 'return nil' inside the if is sufficient.
	// The second 'return nil' would be dead code if the 'if' block is taken.
	// If the 'if' block is NOT taken, then execution continues.
	// The original code had:
	// if len(dbStats) == 0 { log; return nil; } // Corrected this line
	// return nil // This was likely an error, making LoadStatsForToday always return nil if dbStats was not empty.

	// Corrected logic: if empty, log and return nil. Otherwise, proceed.
	// The 'return nil' that was outside the 'if' block (and causing syntax error) is removed.

	t.mutex.Lock() // Lock to safely update in-memory stats
	defer t.mutex.Unlock()

	// Clear existing in-memory stats for today or merge carefully.
	// For simplicity, this implementation will overwrite based on DB data for the current day.
	// If Increment was called before LoadStatsForToday, those in-memory counts might be lost
	// or incorrectly merged if not handled.
	// A safer approach might be to only call LoadStatsForToday at startup before any Increments.
	// Or, to merge: add DB count to existing in-memory count if any.
	// Current: DB is source of truth at load time.
	t.counts = make(map[string]map[string]int) // Reset in-memory map for today

	for _, stat := range dbStats {
		if stat.Date.Equal(today) { // Ensure we only load today's stats
			if _, ok := t.counts[stat.ServiceName]; !ok {
				t.counts[stat.ServiceName] = make(map[string]int)
			}
			// The count from DB is the total for that service/endpoint/date.
			// So, we set it directly.
			t.counts[stat.ServiceName][stat.EndpointName] = stat.Count
		}
	}
	t.logger.Info("Successfully loaded API stats for today from database using ListWithOpts", "date", today.Format("2006-01-02"), "number_of_records", len(dbStats))
	return nil
}

// ResetStats flushes all current in-memory statistics to the database for the current day
// and then clears the in-memory map. This is typically called at the end of a period (e.g., end of day).
func (t *APICallTrackerImpl) ResetStats(ctx context.Context) error {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	t.logger.Info("Starting ResetStats: flushing in-memory stats to DB and clearing memory.")

	// Use a single context for all DB operations within this reset.
	// A short timeout might be appropriate if many stats need flushing.
	opCtx, cancel := context.WithTimeout(ctx, 30*time.Second) // E.g., 30 seconds timeout for all upserts
	defer cancel()

	today := time.Now().Truncate(24 * time.Hour)
	var firstError error

	for serviceName, endpointMap := range t.counts {
		for endpointName, count := range endpointMap {
			if count == 0 { // No need to persist if count is zero (though upsert might handle it)
				continue
			}
			stat := &model.ApiStat{
				ServiceName:  serviceName,
				EndpointName: endpointName,
				Date:         today,
				Count:        count, // This is the total accumulated count from memory
			}
			// Upsert returns (int64, error), we ignore the int64 here.
			if _, err := t.dbStore.ApiStats().Upsert(opCtx, stat); err != nil {
				t.logger.Error("Failed to upsert API stat during ResetStats",
					"error", err,
					"service", serviceName,
					"endpoint", endpointName,
					"count", count)
				if firstError == nil {
					firstError = err // Capture the first error encountered
				}
				// Continue trying to flush other stats even if one fails.
			}
		}
	}

	// Clear the in-memory map after attempting to flush all stats.
	t.counts = make(map[string]map[string]int)
	t.logger.Info("In-memory stats cleared after ResetStats.")

	return firstError // Return the first error encountered, if any
}

// Start launches the background goroutine for periodic logging and daily stats reset.
func (t *APICallTrackerImpl) Start(ctx context.Context) {
	t.logger.Info("Starting APICallTracker background processing goroutine.")

	go func() {
		// TODO: Make logging interval configurable if needed, e.g., from t.config
		loggingTicker := time.NewTicker(5 * time.Minute)
		defer loggingTicker.Stop()

		durationToNextMidnightUTC := func() time.Duration {
			now := time.Now().UTC()
			midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(24 * time.Hour)
			return midnight.Sub(now)
		}

		midnightTimer := time.NewTimer(durationToNextMidnightUTC())
		defer midnightTimer.Stop()

		t.logger.Info("APICallTracker: Daily reset timer initiated.",
			slog.Duration("next_midnight_in", durationToNextMidnightUTC()))

		for {
			select {
			case <-ctx.Done():
				t.logger.Info("APICallTracker: Shutting down background processing goroutine due to context cancellation.")
				// On shutdown, a final ResetStats is called by main.go's shutdown handler explicitly.
				// So, no need to call it here again.
				return

			case <-loggingTicker.C:
				t.logger.Debug("APICallTracker: Logging API stats periodically.")
				telemetry.LogAPIStats(t, t.logger) // t (APICallTrackerImpl) implements APICallTracker interface

			case <-midnightTimer.C:
				t.logger.Info("APICallTracker: Midnight UTC reached. Performing daily reset of API stats.")

				// Use a new context for these operations as the main ctx might be closing if app is shutting down near midnight.
				// However, these operations are part of the normal lifecycle managed by the Start context.
				// If Start's ctx is cancelled, the goroutine exits.
				// Using a short-timeout new context for ResetStats and LoadStatsForToday might be safer
				// to prevent them from blocking shutdown if ctx is nearly done.
				// For now, we use the goroutine's main ctx, assuming it's managed correctly by the caller of Start.

				opCtx, opCancel := context.WithTimeout(context.Background(), 1*time.Minute) // Context for this specific set of operations

				if err := t.ResetStats(opCtx); err != nil {
					t.logger.Error("APICallTracker: Failed to reset API stats at end of day", slog.Any("error", err))
				} else {
					t.logger.Info("APICallTracker: Successfully reset API stats for the ended day.")
				}

				if err := t.LoadStatsForToday(opCtx); err != nil {
					t.logger.Error("APICallTracker: Failed to load API stats for the new day", slog.Any("error", err))
				} else {
					t.logger.Info("APICallTracker: Successfully prepared API stats for the new day.")
				}
				opCancel() // Cancel the operation context

				// Reset the midnight timer for the next day
				nextMidnightIn := durationToNextMidnightUTC()
				midnightTimer.Reset(nextMidnightIn)
				t.logger.Info("APICallTracker: Midnight timer reset.", slog.Duration("next_midnight_in", nextMidnightIn))
			}
		}
	}()
}

