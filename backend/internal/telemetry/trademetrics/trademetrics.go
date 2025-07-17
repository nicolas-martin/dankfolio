package trademetrics

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// TradeMetrics encapsulates trade-related metrics
type TradeMetrics struct {
	tradesTotal        metric.Int64Counter
	platformFeesTotal  metric.Float64Counter
}

// New creates a new TradeMetrics instance
func New(meter metric.Meter) (*TradeMetrics, error) {
	tradesTotal, err := meter.Int64Counter(
		"dankfolio.trades_total",
		metric.WithDescription("Total number of trades"),
		metric.WithUnit("{trade}"),
	)
	if err != nil {
		return nil, err
	}

	platformFeesTotal, err := meter.Float64Counter(
		"dankfolio.platform_fees_total",
		metric.WithDescription("Total amount of platform fees earned"),
		metric.WithUnit("{token}"),
	)
	if err != nil {
		return nil, err
	}

	return &TradeMetrics{
		tradesTotal:       tradesTotal,
		platformFeesTotal: platformFeesTotal,
	}, nil
}

// RecordTrade increments the tradesTotal counter
func (tm *TradeMetrics) RecordTrade(ctx context.Context) {
	tm.tradesTotal.Add(ctx, 1)
}

// RecordPlatformFee increments the platformFeesTotal counter
func (tm *TradeMetrics) RecordPlatformFee(ctx context.Context, amount float64, tokenSymbol string) {
	attrs := metric.WithAttributes(
		attribute.String("token_symbol", tokenSymbol),
	)
	tm.platformFeesTotal.Add(ctx, amount, attrs)
}
