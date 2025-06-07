package telemetry

import (
	"log/slog"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
)

// LogAPIStats retrieves API call statistics from the tracker and logs them.
func LogAPIStats(tracker clients.APICallTracker, logger *slog.Logger) {
	stats := tracker.GetStats()

	if len(stats) == 0 {
		logger.Info("No API calls tracked yet.")
		return
	}

	logger.Info("API Call Statistics:")
	for serviceName, endpointMap := range stats {
		for endpointName, count := range endpointMap {
			logger.Info("API Usage",
				slog.String("service", serviceName),
				slog.String("endpoint", endpointName),
				slog.Int("count", count),
			)
		}
	}
}
