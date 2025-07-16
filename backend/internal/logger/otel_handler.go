package logger

import (
	"context"
	"log/slog"

	"go.opentelemetry.io/otel/trace"
)

// OtelHandler wraps another slog.Handler and adds OpenTelemetry trace context
type OtelHandler struct {
	handler slog.Handler
}

// NewOtelHandler creates a new handler that adds trace and span IDs to all log records
func NewOtelHandler(handler slog.Handler) *OtelHandler {
	return &OtelHandler{
		handler: handler,
	}
}

// Enabled returns whether the handler is enabled for the given level
func (h *OtelHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.handler.Enabled(ctx, level)
}

// Handle adds trace and span IDs to the record before passing it to the wrapped handler
func (h *OtelHandler) Handle(ctx context.Context, record slog.Record) error {
	// Extract trace information from context
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		// Add trace and span IDs as attributes
		record.AddAttrs(
			slog.String("trace_id", span.SpanContext().TraceID().String()),
			slog.String("span_id", span.SpanContext().SpanID().String()),
		)
		
		// Add trace flags if sampled
		if span.SpanContext().IsSampled() {
			record.AddAttrs(slog.Bool("trace_sampled", true))
		}
	}
	
	return h.handler.Handle(ctx, record)
}

// WithAttrs returns a new handler with the given attributes
func (h *OtelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &OtelHandler{
		handler: h.handler.WithAttrs(attrs),
	}
}

// WithGroup returns a new handler with the given group
func (h *OtelHandler) WithGroup(name string) slog.Handler {
	return &OtelHandler{
		handler: h.handler.WithGroup(name),
	}
}