package tracker

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

// APITracker tracks API calls using OpenTelemetry
type APITracker struct {
	telemetry *otel.Telemetry
	metrics   struct {
		apiCallCounter  metric.Int64Counter
		apiCallDuration metric.Float64Histogram
		activeRequests  metric.Int64UpDownCounter
		errorCounter    metric.Int64Counter
	}
}

// NewAPITracker creates a new OpenTelemetry-based API tracker
func NewAPITracker(telemetry *otel.Telemetry) (*APITracker, error) {
	tracker := &APITracker{
		telemetry: telemetry,
	}

	if err := tracker.initMetrics(); err != nil {
		return nil, fmt.Errorf("failed to initialize metrics: %w", err)
	}

	return tracker, nil
}

func (t *APITracker) initMetrics() error {
	// Check if we have a valid meter
	if t.telemetry == nil || t.telemetry.Meter == nil {
		slog.Warn("APITracker: No meter available, metrics will be disabled")
		return nil
	}

	var err error

	t.metrics.apiCallCounter, err = t.telemetry.Meter.Int64Counter(
		"dankfolio.api_calls_total",
		metric.WithDescription("Total number of API calls"),
		metric.WithUnit("{call}"),
	)
	if err != nil {
		slog.Warn("Failed to create api call counter", "error", err)
		// Continue without this metric rather than failing completely
	}

	t.metrics.apiCallDuration, err = t.telemetry.Meter.Float64Histogram(
		"dankfolio.api_call_duration_seconds",
		metric.WithDescription("Duration of API calls in seconds"),
		metric.WithUnit("s"),
		metric.WithExplicitBucketBoundaries(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
	)
	if err != nil {
		slog.Warn("Failed to create api call duration histogram", "error", err)
	}

	t.metrics.activeRequests, err = t.telemetry.Meter.Int64UpDownCounter(
		"dankfolio.active_requests",
		metric.WithDescription("Number of active requests"),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		slog.Warn("Failed to create active requests counter", "error", err)
	}

	t.metrics.errorCounter, err = t.telemetry.Meter.Int64Counter(
		"dankfolio.api_errors_total",
		metric.WithDescription("Total number of API errors"),
		metric.WithUnit("{error}"),
	)
	if err != nil {
		slog.Warn("Failed to create error counter", "error", err)
	}

	return nil
}

// TrackCall tracks an API call (for backward compatibility)
func (t *APITracker) TrackCall(serviceName, endpointName string) {
	if t == nil || t.metrics.apiCallCounter == nil {
		return
	}

	attrs := []attribute.KeyValue{
		attribute.String("service.name", serviceName),
		attribute.String("endpoint.name", endpointName),
	}

	t.metrics.apiCallCounter.Add(context.Background(), 1, metric.WithAttributes(attrs...))
}

// TrackCallWithContext tracks an API call with context
func (t *APITracker) TrackCallWithContext(ctx context.Context, serviceName, endpointName string) {
	if t == nil || t.metrics.apiCallCounter == nil {
		return
	}

	attrs := []attribute.KeyValue{
		attribute.String("service.name", serviceName),
		attribute.String("endpoint.name", endpointName),
	}

	t.metrics.apiCallCounter.Add(ctx, 1, metric.WithAttributes(attrs...))

	if span := trace.SpanFromContext(ctx); span.IsRecording() {
		span.SetAttributes(
			attribute.String("external.service", serviceName),
			attribute.String("external.endpoint", endpointName),
		)
	}
}

// StartSpan starts a new span for an API call
func (t *APITracker) StartSpan(ctx context.Context, serviceName, endpointName string) (context.Context, trace.Span) {
	// Handle nil telemetry or tracer gracefully
	if t == nil || t.telemetry == nil || t.telemetry.Tracer == nil {
		// Return a no-op span
		return ctx, trace.SpanFromContext(ctx)
	}

	spanName := fmt.Sprintf("%s.%s", serviceName, endpointName)
	ctx, span := t.telemetry.Tracer.Start(ctx, spanName,
		trace.WithAttributes(
			attribute.String("service.name", serviceName),
			attribute.String("endpoint.name", endpointName),
		),
		trace.WithSpanKind(trace.SpanKindClient),
	)

	if t.metrics.activeRequests != nil {
		t.metrics.activeRequests.Add(ctx, 1, metric.WithAttributes(
			attribute.String("service.name", serviceName),
		))
	}

	return ctx, span
}

// EndSpan ends a span and records any error
func (t *APITracker) EndSpan(span trace.Span, err error, serviceName string) {
	// Handle nil span gracefully
	if span == nil {
		return
	}

	ctx := context.Background()

	if t != nil && t.metrics.activeRequests != nil {
		t.metrics.activeRequests.Add(ctx, -1, metric.WithAttributes(
			attribute.String("service.name", serviceName),
		))
	}

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		if t != nil && t.metrics.errorCounter != nil {
			t.metrics.errorCounter.Add(ctx, 1, metric.WithAttributes(
				attribute.String("service.name", serviceName),
				attribute.String("error.type", fmt.Sprintf("%T", err)),
			))
		}
	} else {
		span.SetStatus(codes.Ok, "")
	}

	span.End()
}

// RecordDuration records the duration of an API call
func (t *APITracker) RecordDuration(ctx context.Context, serviceName, endpointName string, duration time.Duration) {
	if t == nil || t.metrics.apiCallDuration == nil {
		return
	}

	attrs := []attribute.KeyValue{
		attribute.String("service.name", serviceName),
		attribute.String("endpoint.name", endpointName),
	}

	t.metrics.apiCallDuration.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))
}

// InstrumentCall wraps a function call with OpenTelemetry instrumentation
func (t *APITracker) InstrumentCall(ctx context.Context, serviceName, endpointName string, fn func(context.Context) error) error {
	ctx, span := t.StartSpan(ctx, serviceName, endpointName)
	defer func() {
		t.EndSpan(span, nil, serviceName)
	}()

	t.TrackCallWithContext(ctx, serviceName, endpointName)

	start := time.Now()
	err := fn(ctx)
	duration := time.Since(start)

	t.RecordDuration(ctx, serviceName, endpointName, duration)

	if err != nil {
		t.EndSpan(span, err, serviceName)
		return err
	}

	return nil
}

// Helper functions
func ExtractTraceID(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		return span.SpanContext().TraceID().String()
	}
	return ""
}

func LogWithTraceID(ctx context.Context, logger *slog.Logger, msg string, args ...any) {
	if traceID := ExtractTraceID(ctx); traceID != "" {
		args = append(args, "trace_id", traceID)
	}
	logger.InfoContext(ctx, msg, args...)
}

