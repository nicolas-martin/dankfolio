package telemetry

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// InstrumentedServiceExample shows how to instrument a service with telemetry
type InstrumentedServiceExample struct {
	tracker tracker.APITracker
	metrics *BusinessMetrics
}

// Example of instrumenting a coin search operation
func (s *InstrumentedServiceExample) SearchCoins(ctx context.Context, query string) ([]interface{}, error) {
	// Start a span for the entire operation
	ctx, span := s.tracker.StartSpan(ctx, "CoinService", "SearchCoins")
	defer func() {
		s.tracker.EndSpan(span, nil, "CoinService")
	}()

	// Add span attributes
	span.SetAttributes(
		attribute.String("search.query", query),
		attribute.String("operation.type", "search"),
	)

	var results []interface{}
	var searchErr error

	// Record search metrics
	resultCount, err := s.metrics.RecordSearchOperation(ctx, func() (int, error) {
		// Simulate search operation
		results, searchErr = s.performSearch(ctx, query)
		return len(results), searchErr
	}, "coin_search")

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	// Add result count to span
	span.SetAttributes(attribute.Int("search.result_count", resultCount))
	
	return results, nil
}

// Example of instrumenting a trade operation
func (s *InstrumentedServiceExample) ExecuteTrade(ctx context.Context, tradeParams map[string]interface{}) error {
	// Extract trade details
	tradeType := tradeParams["type"].(string)
	volumeUSD := tradeParams["volume_usd"].(float64)

	// Start a span
	ctx, span := s.tracker.StartSpan(ctx, "TradeService", "ExecuteTrade")
	defer func() {
		s.tracker.EndSpan(span, nil, "TradeService")
	}()

	// Add span attributes
	span.SetAttributes(
		attribute.String("trade.type", tradeType),
		attribute.Float64("trade.volume_usd", volumeUSD),
	)

	// Execute trade with metrics
	err := s.metrics.RecordTradeExecution(ctx, func() error {
		// Check cache first
		cacheKey := fmt.Sprintf("quote:%s:%f", tradeType, volumeUSD)
		if cached := s.checkCache(ctx, cacheKey); cached != nil {
			s.metrics.RecordCacheHit(ctx, "quote", cacheKey)
			return nil
		}
		s.metrics.RecordCacheMiss(ctx, "quote", cacheKey)

		// Simulate external API call
		err := s.callExternalAPI(ctx)
		if err != nil {
			s.metrics.RecordExternalAPIError(ctx, "jupiter", "/swap", "network_error")
			return err
		}

		// Simulate trade execution
		return s.performTrade(ctx, tradeParams)
	}, tradeType, volumeUSD)

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}

	span.SetStatus(codes.Ok, "Trade executed successfully")
	return nil
}

// Example of instrumenting a batch operation with child spans
func (s *InstrumentedServiceExample) UpdateCoinPrices(ctx context.Context, coinAddresses []string) error {
	// Start parent span
	ctx, parentSpan := s.tracker.StartSpan(ctx, "PriceService", "UpdateCoinPrices")
	defer func() {
		s.tracker.EndSpan(parentSpan, nil, "PriceService")
	}()

	parentSpan.SetAttributes(
		attribute.Int("batch.size", len(coinAddresses)),
		attribute.String("operation.type", "batch_update"),
	)

	successCount := 0
	errorCount := 0

	// Process each coin with its own span
	for i, address := range coinAddresses {
		// Create child span
		childCtx, childSpan := s.tracker.StartSpan(ctx, "PriceService", fmt.Sprintf("UpdateCoinPrice[%d]", i))
		childSpan.SetAttributes(
			attribute.String("coin.address", address),
			attribute.Int("batch.index", i),
		)

		err := s.updateSingleCoinPrice(childCtx, address)
		if err != nil {
			errorCount++
			childSpan.RecordError(err)
			childSpan.SetStatus(codes.Error, err.Error())
		} else {
			successCount++
			childSpan.SetStatus(codes.Ok, "Price updated")
		}

		s.tracker.EndSpan(childSpan, err, "PriceService")
	}

	// Update parent span with results
	parentSpan.SetAttributes(
		attribute.Int("batch.success_count", successCount),
		attribute.Int("batch.error_count", errorCount),
	)

	if errorCount > 0 {
		parentSpan.SetStatus(codes.Error, fmt.Sprintf("Failed to update %d prices", errorCount))
	} else {
		parentSpan.SetStatus(codes.Ok, "All prices updated successfully")
	}

	return nil
}

// Helper methods for simulation
func (s *InstrumentedServiceExample) performSearch(ctx context.Context, query string) ([]interface{}, error) {
	// Simulate search
	time.Sleep(10 * time.Millisecond)
	return []interface{}{"coin1", "coin2", "coin3"}, nil
}

func (s *InstrumentedServiceExample) checkCache(ctx context.Context, key string) interface{} {
	// Simulate cache check
	return nil // cache miss
}

func (s *InstrumentedServiceExample) callExternalAPI(ctx context.Context) error {
	// Simulate API call
	time.Sleep(50 * time.Millisecond)
	return nil
}

func (s *InstrumentedServiceExample) performTrade(ctx context.Context, params map[string]interface{}) error {
	// Simulate trade execution
	time.Sleep(100 * time.Millisecond)
	return nil
}

func (s *InstrumentedServiceExample) updateSingleCoinPrice(ctx context.Context, address string) error {
	// Simulate price update
	time.Sleep(5 * time.Millisecond)
	return nil
}

// Example of using trace context for distributed tracing
func (s *InstrumentedServiceExample) PropagateTraceContext(ctx context.Context) {
	// Get the current span from context
	span := trace.SpanFromContext(ctx)
	
	// Extract trace information
	spanContext := span.SpanContext()
	traceID := spanContext.TraceID().String()
	spanID := spanContext.SpanID().String()
	
	// These can be passed to external services via headers
	// Example: Add to HTTP headers
	// req.Header.Set("X-Trace-ID", traceID)
	// req.Header.Set("X-Parent-Span-ID", spanID)
	
	_ = traceID
	_ = spanID
}