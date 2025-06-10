package telemetry

import (
	"fmt"
	"log/slog"
	"sort"
	"strings"
)

// LogAPIStats retrieves API call statistics from the tracker and logs them.
func LogAPIStats(tracker TelemetryAPI, logger *slog.Logger) { // Changed parameter type
	rawStats := tracker.GetStats()

	if len(rawStats) == 0 {
		logger.Info("No API calls tracked yet.")
		return
	}

	processedStats := make(map[string]map[string]int)

	for serviceName, endpointMap := range rawStats {
		if _, ok := processedStats[serviceName]; !ok {
			processedStats[serviceName] = make(map[string]int)
		}
		for rawEndpointName, count := range endpointMap {
			processedKey := rawEndpointName
			if serviceName == "jupiter" && strings.HasPrefix(rawEndpointName, "/tokens/v1/token/") {
				processedKey = "/tokens/v1/token"
			}
			processedStats[serviceName][processedKey] += count
		}
	}

	var statItems []string
	for serviceName, endpointMap := range processedStats { // Iterate processedStats now
		for endpointName, count := range endpointMap {
			item := fmt.Sprintf("service=%s, endpoint=%s, count=%d", serviceName, endpointName, count)
			statItems = append(statItems, item)
		}
	}
	sort.Strings(statItems) // Sort for consistent log output, good for testing

	logger.Info("API Call Statistics", slog.String("stats", strings.Join(statItems, ", ")))
}
