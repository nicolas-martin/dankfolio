package middleware

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

func NewOtelConnectInterceptor(tracer trace.Tracer, meter metric.Meter) (connect.UnaryInterceptorFunc, error) {
	requestDuration, err := meter.Float64Histogram(
		"dankfolio.grpc_request_duration_seconds",
		metric.WithDescription("Duration of gRPC requests in seconds"),
		metric.WithUnit("s"),
		metric.WithExplicitBucketBoundaries(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
	)
	if err != nil {
		return nil, err
	}

	requestsTotal, err := meter.Int64Counter(
		"dankfolio.grpc_requests_total",
		metric.WithDescription("Total number of gRPC requests"),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		return nil, err
	}

	activeRequests, err := meter.Int64UpDownCounter(
		"dankfolio.grpc_active_requests",
		metric.WithDescription("Number of active gRPC requests"),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		return nil, err
	}

	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			start := time.Now()
			
			procedure := req.Spec().Procedure
			ctx, span := tracer.Start(ctx, procedure,
				trace.WithSpanKind(trace.SpanKindServer),
				trace.WithAttributes(
					attribute.String("rpc.system", "grpc"),
					attribute.String("rpc.service", req.Spec().Procedure),
					attribute.String("rpc.method", procedure),
				),
			)
			defer span.End()

			// Add trace ID to response headers
			if traceID := tracker.ExtractTraceID(ctx); traceID != "" {
				req.Header().Set("x-trace-id", traceID)
			}

			attrs := []attribute.KeyValue{
				attribute.String("rpc.method", procedure),
			}

			activeRequests.Add(ctx, 1, metric.WithAttributes(attrs...))
			defer activeRequests.Add(ctx, -1, metric.WithAttributes(attrs...))

			requestsTotal.Add(ctx, 1, metric.WithAttributes(attrs...))

			resp, err := next(ctx, req)

			duration := time.Since(start)
			statusCode := codes.Ok

			if err != nil {
				statusCode = codes.Error
				span.RecordError(err)
				span.SetStatus(statusCode, err.Error())
			}

			attrs = append(attrs,
				attribute.Bool("error", err != nil),
			)

			requestDuration.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))

			return resp, err
		}
	}, nil
}