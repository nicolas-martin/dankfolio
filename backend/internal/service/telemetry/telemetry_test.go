package telemetry_test

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
)

// mockAPICallTracker is a mock implementation of APICallTracker for testing.
type mockAPICallTracker struct {
	stats map[string]map[string]int
}

func (m *mockAPICallTracker) TrackCall(serviceName, endpointName string) {
	if m.stats == nil {
		m.stats = make(map[string]map[string]int)
	}
	if _, ok := m.stats[serviceName]; !ok {
		m.stats[serviceName] = make(map[string]int)
	}
	m.stats[serviceName][endpointName]++
}

func (m *mockAPICallTracker) GetStats() map[string]map[string]int {
	if m.stats == nil {
		return make(map[string]map[string]int)
	}
	clone := make(map[string]map[string]int)
	for k, v := range m.stats {
		clone[k] = v
	}
	return clone
}

var _ clients.APICallTracker = (*mockAPICallTracker)(nil)

func TestLogAPIStats(t *testing.T) {
	tests := []struct {
		name                          string
		mockStats                     map[string]map[string]int
		expectedLogMsg                string
		expectedStatSubstrings        []string
		expectStatsAttribute          bool
		expectedServiceTotalMsg       string
		expectedServiceTotalSubstrings []string
		expectServiceTotalsAttribute  bool
		expectedJupiterTokenDebugLogs []map[string]string // Each map contains expected key-value pairs for a debug log
	}{
		{
			name:                        "No API calls",
			mockStats:                   map[string]map[string]int{},
			expectedLogMsg:              "No API calls tracked yet.",
			expectStatsAttribute:        false,
			expectedServiceTotalMsg:     "", // No service totals log expected
			expectServiceTotalsAttribute: false,
			expectedJupiterTokenDebugLogs: nil, // No Jupiter token logs
		},
		{
			name: "With API calls, including Jupiter tokens",
			mockStats: map[string]map[string]int{
				"solana":   {"GetTokenAccountsByOwner": 4, "AnotherSolEndpoint": 1},
				"jupiter":  {
					"/tokens/v1/new":          1,    // Not a token call for detailed logging
					"/tokens/v1/token/SOL":    3,    // Jupiter token SOL
					"/tokens/v1/token/USDC":   2,    // Jupiter token USDC
					"/tokens/v1/token/":       1,    // Invalid token, should be ignored by token specific logging
					"/other/jupiter/path":     1,
				},
				"internal": {"checkStatus": 100, "updateCache": 50},
			},
			expectedLogMsg: "API Call Statistics",
			expectedStatSubstrings: []string{
				"service=internal, endpoint=checkStatus, count=100",
				"service=internal, endpoint=updateCache, count=50",
				"service=jupiter, endpoint=/other/jupiter/path, count=1",
				"service=jupiter, endpoint=/tokens/v1/new, count=1",
				// Aggregated count for /tokens/v1/token should be 3 (SOL) + 2 (USDC) + 1 (empty token) = 6
				"service=jupiter, endpoint=/tokens/v1/token, count=6",
				"service=solana, endpoint=AnotherSolEndpoint, count=1",
				"service=solana, endpoint=GetTokenAccountsByOwner, count=4",
			},
			expectStatsAttribute: true,
			expectedServiceTotalMsg: "API Service Totals",
			expectedServiceTotalSubstrings: []string{
				"service=internal, total_count=150",
				"service=jupiter, total_count=7", // 1 (new) + 3 (SOL) + 2 (USDC) + 1 (empty) + 1 (other) = 7
				"service=solana, total_count=5",
			},
			expectServiceTotalsAttribute: true,
			expectedJupiterTokenDebugLogs: []map[string]string{
				{"level": "DEBUG", "msg": "Jupiter Token Usage", "service": "jupiter", "endpoint": "/tokens/v1/token", "token": "SOL", "count": "3"},
				{"level": "DEBUG", "msg": "Jupiter Token Usage", "service": "jupiter", "endpoint": "/tokens/v1/token", "token": "USDC", "count": "2"},
				// The entry for "/tokens/v1/token/" (empty token) is not logged by the debug logger due to `if token != ""` check
			},
		},
		{
			name:      "Only Jupiter calls, no specific tokens",
			mockStats: map[string]map[string]int{
				"jupiter": {"/tokens/v1/new": 1, "/other/path": 2},
			},
			expectedLogMsg: "API Call Statistics",
			expectedStatSubstrings: []string{
				"service=jupiter, endpoint=/tokens/v1/new, count=1",
				"service=jupiter, endpoint=/other/path, count=2",
			},
			expectStatsAttribute: true,
			expectedServiceTotalMsg: "API Service Totals",
			expectedServiceTotalSubstrings: []string{
				"service=jupiter, total_count=3",
			},
			expectServiceTotalsAttribute: true,
			expectedJupiterTokenDebugLogs: nil, // No specific token calls
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			// Set log level to Debug to capture all logs
			handler := slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
			logger := slog.New(handler)

			tracker := &mockAPICallTracker{stats: tt.mockStats}
			telemetry.LogAPIStats(tracker, logger)
			fullLogOutput := buf.String()
			logLines := strings.Split(strings.TrimSpace(fullLogOutput), "\n")

			// --- Assertions for "API Call Statistics" ---
			if tt.expectedLogMsg != "" { // Only check if a message is expected
				foundMainStatsLog := false
				for _, line := range logLines {
					if strings.Contains(line, "msg=\""+tt.expectedLogMsg+"\"") {
						foundMainStatsLog = true
						if tt.expectStatsAttribute {
							if !strings.Contains(line, "stats=\"") {
								t.Errorf("Main stats log line does not contain 'stats=\"' attribute key. Got: %s", line)
								break
							}
							parts := strings.SplitN(line, "stats=\"", 2)
							statsValuePart := parts[1]
							endQuoteIndex := strings.Index(statsValuePart, "\"")
							statsValue := statsValuePart[:endQuoteIndex]
							for _, sub := range tt.expectedStatSubstrings {
								if !strings.Contains(statsValue, sub) {
									t.Errorf("Main stats value does not contain expected substring. Value: %s, Substring: %s, FullLog: %s", statsValue, sub, fullLogOutput)
								}
							}
						} else {
							if strings.Contains(line, "stats=\"") {
								t.Errorf("Expected no 'stats' attribute in main stats log, but it was found. Got: %s", line)
							}
						}
						break // Found and processed the main stats log
					}
				}
				if !foundMainStatsLog && tt.expectedLogMsg != "" {
					t.Errorf("Log output does not contain expected message part 'msg=\"%s\"'. Got: %s", tt.expectedLogMsg, fullLogOutput)
				}
			}


			// --- Assertions for "API Service Totals" ---
			if tt.expectedServiceTotalMsg != "" {
				foundServiceTotalsLog := false
				for _, line := range logLines {
					if strings.Contains(line, "msg=\""+tt.expectedServiceTotalMsg+"\"") {
						foundServiceTotalsLog = true
						if tt.expectServiceTotalsAttribute {
							if !strings.Contains(line, "service_totals=\"") {
								t.Errorf("Service totals log line does not contain 'service_totals=\"' attribute key. Got: %s", line)
								break
							}
							parts := strings.SplitN(line, "service_totals=\"", 2)
							totalsValuePart := parts[1]
							endQuoteIndex := strings.Index(totalsValuePart, "\"")
							totalsValue := totalsValuePart[:endQuoteIndex]
							for _, sub := range tt.expectedServiceTotalSubstrings {
								if !strings.Contains(totalsValue, sub) {
									t.Errorf("Service totals value does not contain expected substring. Value: %s, Substring: %s, FullLog: %s", totalsValue, sub, fullLogOutput)
								}
							}
						} else {
							if strings.Contains(line, "service_totals=\"") {
								t.Errorf("Expected no 'service_totals' attribute in service_totals log, but it was found. Got: %s", line)
							}
						}
						break // Found and processed the service totals log
					}
				}
				if !foundServiceTotalsLog {
					t.Errorf("Log output does not contain expected service totals message 'msg=\"%s\"'. Got: %s", tt.expectedServiceTotalMsg, fullLogOutput)
				}
			} else if tt.expectServiceTotalsAttribute { // Should not expect attribute if message is empty
					t.Errorf("Test configuration error: expectServiceTotalsAttribute is true but expectedServiceTotalMsg is empty")
			}


			// --- Assertions for Jupiter Token Debug Logs ---
			if len(tt.expectedJupiterTokenDebugLogs) > 0 {
				matchedDebugLogs := 0
				for _, expectedLog := range tt.expectedJupiterTokenDebugLogs {
					foundThisExpectedLog := false
					for _, line := range logLines {
						isMatch := true
						for key, val := range expectedLog {
							// Construct the expected key-value pair string, e.g., "token=SOL" or "msg=\"Jupiter Token Usage\""
							var searchStr string
							if key == "msg" || key == "token" || key == "endpoint" || key == "service" { // Known string values that get quoted
								searchStr = key + "=\"" + val + "\""
							} else { // numeric values or level (which is not quoted by default text handler)
								searchStr = key + "=" + val
							}
							if !strings.Contains(line, searchStr) {
								isMatch = false
								break
							}
						}
						if isMatch {
							foundThisExpectedLog = true
							matchedDebugLogs++
							break // Move to the next expected log
						}
					}
					if !foundThisExpectedLog {
						t.Errorf("Expected Jupiter token debug log not found. Expected: %v, FullLog: %s", expectedLog, fullLogOutput)
					}
				}
				// Check if we found all expected debug logs
				// This also implicitly checks if there are more debug logs than expected if counts are precise.
				// For more robust check on *extra* logs, one might count actual debug logs vs expected.
				actualDebugLogCount := 0
				for _, line := range logLines {
					if strings.Contains(line, "level=DEBUG") && strings.Contains(line, "msg=\"Jupiter Token Usage\"") {
						actualDebugLogCount++
					}
				}
				if actualDebugLogCount != len(tt.expectedJupiterTokenDebugLogs) {
					t.Errorf("Mismatch in number of Jupiter token debug logs. Expected: %d, Found: %d. FullLog: %s", len(tt.expectedJupiterTokenDebugLogs), actualDebugLogCount, fullLogOutput)
				}

			} else { // No Jupiter token debug logs expected
				for _, line := range logLines {
					if strings.Contains(line, "level=DEBUG") && strings.Contains(line, "msg=\"Jupiter Token Usage\"") {
						t.Errorf("Unexpected Jupiter token debug log found: %s. FullLog: %s", line, fullLogOutput)
						break
					}
				}
			}
		})
	}
}
