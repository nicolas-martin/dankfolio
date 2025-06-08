package telemetry

import (
	"fmt"
	"log/slog"
	"sort" // Added for consistent output
	"strings"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
)

// LogAPIStats retrieves API call statistics from the tracker and logs them.
func LogAPIStats(tracker clients.APICallTracker, logger *slog.Logger) {
	rawStats := tracker.GetStats()

	if len(rawStats) == 0 {
		logger.Info("No API calls tracked yet.")
		return
	}

	processedStats := make(map[string]map[string]int)
	jupiterTokenStats := make(map[string]int) // For Jupiter token counts

	for serviceName, endpointMap := range rawStats {
		if _, ok := processedStats[serviceName]; !ok {
			processedStats[serviceName] = make(map[string]int)
		}
		for rawEndpointName, count := range endpointMap {
			processedKey := rawEndpointName
			if serviceName == "jupiter" && strings.HasPrefix(rawEndpointName, "/tokens/v1/token/") {
				processedKey = "/tokens/v1/token"
				// Extract token and update jupiterTokenStats
				token := strings.TrimPrefix(rawEndpointName, "/tokens/v1/token/")
				if token != "" { // Ensure there is a token
					jupiterTokenStats[token] += count
				}
			}
			processedStats[serviceName][processedKey] += count
		}
	}

	// Log Jupiter token statistics at Debug level
	if len(jupiterTokenStats) > 0 {
		for token, count := range jupiterTokenStats {
			logger.Debug("Jupiter Token Usage",
				slog.String("service", "jupiter"),
				slog.String("endpoint", "/tokens/v1/token"),
				slog.String("token", token),
				slog.Int("count", count),
			)
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

	// Initialize a new map to store total counts for each service
	serviceTotals := make(map[string]int)

	// Iterate through processedStats to sum counts for each service
	for serviceName, endpointMap := range processedStats {
		for _, count := range endpointMap {
			serviceTotals[serviceName] += count
		}
	}

	// Log the serviceTotals
	var serviceTotalItems []string
	for serviceName, totalCount := range serviceTotals {
		item := fmt.Sprintf("service=%s, total_count=%d", serviceName, totalCount)
		serviceTotalItems = append(serviceTotalItems, item)
	}
	sort.Strings(serviceTotalItems) // Sort for consistent log output

	logger.Info("API Service Totals", slog.String("service_totals", strings.Join(serviceTotalItems, ", ")))
}
