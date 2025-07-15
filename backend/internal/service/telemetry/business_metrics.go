package telemetry

import (
	"context"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// BusinessMetrics provides business-specific metrics for the application
type BusinessMetrics struct {
	// Trading metrics
	tradesCounter        metric.Int64Counter
	tradeVolumeHistogram metric.Float64Histogram
	tradeSuccessRate     metric.Float64Histogram
	activeUsersGauge     metric.Int64ObservableGauge

	// Coin metrics
	coinsTrackedGauge metric.Int64ObservableGauge
	coinPriceGauge    metric.Float64ObservableGauge
	newCoinsCounter   metric.Int64Counter

	// Search metrics
	searchCounter          metric.Int64Counter
	searchLatencyHistogram metric.Float64Histogram

	// API metrics
	externalAPIErrors metric.Int64Counter
	cacheMissCounter  metric.Int64Counter
	cacheHitCounter   metric.Int64Counter
}

// NewBusinessMetrics creates business metrics instruments
func NewBusinessMetrics(meter metric.Meter) (*BusinessMetrics, error) {
	bm := &BusinessMetrics{}
	var err error

	// Trading metrics
	bm.tradesCounter, err = meter.Int64Counter(
		"dankfolio.trades.total",
		metric.WithDescription("Total number of trades executed"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	bm.tradeVolumeHistogram, err = meter.Float64Histogram(
		"dankfolio.trades.volume",
		metric.WithDescription("Trade volume in USD"),
		metric.WithUnit("USD"),
	)
	if err != nil {
		return nil, err
	}

	bm.tradeSuccessRate, err = meter.Float64Histogram(
		"dankfolio.trades.success_rate",
		metric.WithDescription("Trade success rate (0-1)"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	// Coin metrics
	bm.newCoinsCounter, err = meter.Int64Counter(
		"dankfolio.coins.new",
		metric.WithDescription("Number of new coins discovered"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	// Search metrics
	bm.searchCounter, err = meter.Int64Counter(
		"dankfolio.search.total",
		metric.WithDescription("Total number of searches performed"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	bm.searchLatencyHistogram, err = meter.Float64Histogram(
		"dankfolio.search.latency",
		metric.WithDescription("Search operation latency"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return nil, err
	}

	// API metrics
	bm.externalAPIErrors, err = meter.Int64Counter(
		"dankfolio.external_api.errors",
		metric.WithDescription("Number of external API errors"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	bm.cacheMissCounter, err = meter.Int64Counter(
		"dankfolio.cache.misses",
		metric.WithDescription("Number of cache misses"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	bm.cacheHitCounter, err = meter.Int64Counter(
		"dankfolio.cache.hits",
		metric.WithDescription("Number of cache hits"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return nil, err
	}

	return bm, nil
}

// RecordTrade records a trade execution
func (bm *BusinessMetrics) RecordTrade(ctx context.Context, tradeType string, volumeUSD float64, success bool) {
	attributes := []attribute.KeyValue{
		attribute.String("trade.type", tradeType),
		attribute.Bool("trade.success", success),
	}

	bm.tradesCounter.Add(ctx, 1, metric.WithAttributes(attributes...))

	if volumeUSD > 0 {
		bm.tradeVolumeHistogram.Record(ctx, volumeUSD, metric.WithAttributes(attributes...))
	}
}

// RecordSearch records a search operation
func (bm *BusinessMetrics) RecordSearch(ctx context.Context, searchType string, resultCount int, duration time.Duration) {
	attributes := []attribute.KeyValue{
		attribute.String("search.type", searchType),
		attribute.Int("search.result_count", resultCount),
	}

	bm.searchCounter.Add(ctx, 1, metric.WithAttributes(attributes...))
	bm.searchLatencyHistogram.Record(ctx, float64(duration.Milliseconds()), metric.WithAttributes(attributes...))
}

// RecordNewCoins records discovery of new coins
func (bm *BusinessMetrics) RecordNewCoins(ctx context.Context, source string, count int64) {
	bm.newCoinsCounter.Add(ctx, count, metric.WithAttributes(
		attribute.String("source", source),
	))
}

// RecordExternalAPIError records an external API error
func (bm *BusinessMetrics) RecordExternalAPIError(ctx context.Context, apiName string, endpoint string, errorType string) {
	bm.externalAPIErrors.Add(ctx, 1, metric.WithAttributes(
		attribute.String("api.name", apiName),
		attribute.String("api.endpoint", endpoint),
		attribute.String("error.type", errorType),
	))
}

// RecordCacheHit records a cache hit
func (bm *BusinessMetrics) RecordCacheHit(ctx context.Context, cacheType string, key string) {
	bm.cacheHitCounter.Add(ctx, 1, metric.WithAttributes(
		attribute.String("cache.type", cacheType),
		attribute.String("cache.key_pattern", extractKeyPattern(key)),
	))
}

// RecordCacheMiss records a cache miss
func (bm *BusinessMetrics) RecordCacheMiss(ctx context.Context, cacheType string, key string) {
	bm.cacheMissCounter.Add(ctx, 1, metric.WithAttributes(
		attribute.String("cache.type", cacheType),
		attribute.String("cache.key_pattern", extractKeyPattern(key)),
	))
}

// extractKeyPattern extracts a pattern from cache keys for better grouping
func extractKeyPattern(key string) string {
	// Simple pattern extraction - can be enhanced based on key structure
	if len(key) > 50 {
		return key[:20] + "..."
	}
	return key
}

// MetricsMiddleware provides methods to instrument services with business metrics
type MetricsMiddleware struct {
	metrics *BusinessMetrics
}

// NewMetricsMiddleware creates a new metrics middleware
func NewMetricsMiddleware(metrics *BusinessMetrics) *MetricsMiddleware {
	return &MetricsMiddleware{
		metrics: metrics,
	}
}

// RecordTradeExecution records trade execution metrics
func (mm *MetricsMiddleware) RecordTradeExecution(ctx context.Context, fn func() error, tradeType string, volumeUSD float64) error {
	start := time.Now()
	err := fn()
	success := err == nil

	mm.metrics.RecordTrade(ctx, tradeType, volumeUSD, success)

	return err
}

// RecordSearchOperation records search operation metrics
func (mm *MetricsMiddleware) RecordSearchOperation(ctx context.Context, fn func() (int, error), searchType string) (int, error) {
	start := time.Now()
	resultCount, err := fn()
	duration := time.Since(start)

	mm.metrics.RecordSearch(ctx, searchType, resultCount, duration)

	return resultCount, err
}

