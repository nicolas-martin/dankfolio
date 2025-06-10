package telemetry

import (
	"context"
)

type TelemetryAPI interface {
	GetStats() map[string]map[string]int
	TrackCall(serviceName, endpointName string)
	LoadStatsForToday(ctx context.Context) error
	ResetStats(ctx context.Context) error
	Start(ctx context.Context)
}
