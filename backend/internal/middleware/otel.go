package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
)

type OtelInterceptor struct {
	tracer  trace.Tracer
	meter   metric.Meter
	metrics struct {
		requestDuration metric.Float64Histogram
		requestsTotal   metric.Int64Counter
		activeRequests  metric.Int64UpDownCounter
	}
}

func NewOtelInterceptor(tracer trace.Tracer, meter metric.Meter) (*OtelInterceptor, error) {
	interceptor := &OtelInterceptor{
		tracer: tracer,
		meter:  meter,
	}

	if err := interceptor.initMetrics(); err != nil {
		return nil, fmt.Errorf("failed to initialize metrics: %w", err)
	}

	return interceptor, nil
}

func (i *OtelInterceptor) initMetrics() error {
	var err error

	i.metrics.requestDuration, err = i.meter.Float64Histogram(
		"dankfolio.grpc_request_duration_seconds",
		metric.WithDescription("Duration of gRPC requests in seconds"),
		metric.WithUnit("s"),
		metric.WithExplicitBucketBoundaries(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
	)
	if err != nil {
		return fmt.Errorf("failed to create request duration histogram: %w", err)
	}

	i.metrics.requestsTotal, err = i.meter.Int64Counter(
		"dankfolio.grpc_requests_total",
		metric.WithDescription("Total number of gRPC requests"),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create requests total counter: %w", err)
	}

	i.metrics.activeRequests, err = i.meter.Int64UpDownCounter(
		"dankfolio.grpc_active_requests",
		metric.WithDescription("Number of active gRPC requests"),
		metric.WithUnit("{request}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create active requests counter: %w", err)
	}

	return nil
}

func (i *OtelInterceptor) UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()

		method := info.FullMethod
		ctx, span := i.tracer.Start(ctx, method,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				attribute.String("rpc.system", "grpc"),
				attribute.String("rpc.service", info.FullMethod),
				attribute.String("rpc.method", method),
			),
		)
		defer span.End()

		if _, ok := metadata.FromIncomingContext(ctx); ok {
			if traceID := tracker.ExtractTraceID(ctx); traceID != "" {
				md := metadata.Pairs("x-trace-id", traceID)
				ctx = metadata.NewOutgoingContext(ctx, md)
			}
		}

		if p, ok := peer.FromContext(ctx); ok {
			span.SetAttributes(attribute.String("peer.address", p.Addr.String()))
		}

		attrs := []attribute.KeyValue{
			attribute.String("rpc.method", method),
		}

		i.metrics.activeRequests.Add(ctx, 1, metric.WithAttributes(attrs...))
		defer i.metrics.activeRequests.Add(ctx, -1, metric.WithAttributes(attrs...))

		i.metrics.requestsTotal.Add(ctx, 1, metric.WithAttributes(attrs...))

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		statusCode := codes.Ok
		grpcStatus := status.Code(err)

		if err != nil {
			statusCode = codes.Error
			span.RecordError(err)
			span.SetStatus(statusCode, err.Error())
		}

		attrs = append(attrs,
			attribute.String("rpc.grpc.status_code", grpcStatus.String()),
			attribute.Bool("error", err != nil),
		)

		i.metrics.requestDuration.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))

		return resp, err
	}
}

func (i *OtelInterceptor) StreamServerInterceptor() grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		start := time.Now()
		ctx := ss.Context()

		method := info.FullMethod
		ctx, span := i.tracer.Start(ctx, method,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				attribute.String("rpc.system", "grpc"),
				attribute.String("rpc.service", info.FullMethod),
				attribute.String("rpc.method", method),
				attribute.Bool("streaming", true),
			),
		)
		defer span.End()

		wrappedStream := &wrappedServerStream{
			ServerStream: ss,
			ctx:          ctx,
		}

		attrs := []attribute.KeyValue{
			attribute.String("rpc.method", method),
			attribute.Bool("streaming", true),
		}

		i.metrics.activeRequests.Add(ctx, 1, metric.WithAttributes(attrs...))
		defer i.metrics.activeRequests.Add(ctx, -1, metric.WithAttributes(attrs...))

		i.metrics.requestsTotal.Add(ctx, 1, metric.WithAttributes(attrs...))

		err := handler(srv, wrappedStream)

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

		i.metrics.requestDuration.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs...))

		return err
	}
}

type wrappedServerStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedServerStream) Context() context.Context {
	return w.ctx
}

