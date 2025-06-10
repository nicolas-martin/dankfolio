package telemetry_test

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	telemetryMocks "github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry/mocks" // Added for NewTokenInfo type
)

func TestLogAPIStats(t *testing.T) {
	mockAPICallTracker := telemetryMocks.NewMockTelemetryAPI(t)
	tests := []struct {
		name                   string
		mockStats              map[string]map[string]int
		expectedLogMsg         string
		expectedStatSubstrings []string
		expectStatsAttribute   bool
	}{
		{
			name:                 "No API calls",
			mockStats:            map[string]map[string]int{},
			expectedLogMsg:       "No API calls tracked yet.",
			expectStatsAttribute: false,
		},
		{
			name: "With API calls",
			mockStats: map[string]map[string]int{
				"solana": {"GetTokenAccountsByOwner": 4, "AnotherSolEndpoint": 1},
				"jupiter": {
					"/tokens/v1/new":          1,
					"/tokens/v1/token/ID_ABC": 3, // Raw
					"/tokens/v1/token/ID_XYZ": 2, // Raw
					"/other/jupiter/path":     1,
				},
				"internal": {"checkStatus": 100, "updateCache": 50},
			},
			expectedLogMsg: "API Call Statistics",
			expectedStatSubstrings: []string{
				// Sorted alphabetically
				"service=internal, endpoint=checkStatus, count=100",
				"service=internal, endpoint=updateCache, count=50",
				"service=jupiter, endpoint=/other/jupiter/path, count=1",
				"service=jupiter, endpoint=/tokens/v1/new, count=1",
				"service=jupiter, endpoint=/tokens/v1/token, count=5", // Aggregated
				"service=solana, endpoint=AnotherSolEndpoint, count=1",
				"service=solana, endpoint=GetTokenAccountsByOwner, count=4",
			},
			expectStatsAttribute: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			handler := slog.NewTextHandler(&buf, nil)
			logger := slog.New(handler)

			mockAPICallTracker.On("GetStats").Return(tt.mockStats)
			tracker := mockAPICallTracker

			telemetry.LogAPIStats(tracker, logger)

			logOutput := strings.TrimSpace(buf.String())

			if !strings.Contains(logOutput, "msg=\""+tt.expectedLogMsg+"\"") {
				t.Errorf("Log output does not contain expected message part 'msg=\"%s\"'. Got: %s", tt.expectedLogMsg, logOutput)
			}

			if tt.expectStatsAttribute {
				if !strings.Contains(logOutput, "stats=\"") {
					t.Errorf("Log output does not contain 'stats=\"' attribute key. Got: %s", logOutput)
					return
				}
				parts := strings.SplitN(logOutput, "stats=\"", 2)
				if len(parts) < 2 {
					t.Errorf("Could not split log output by 'stats=\"'. Got: %s", logOutput)
					return
				}
				statsValuePart := parts[1]
				endQuoteIndex := strings.Index(statsValuePart, "\"")
				if endQuoteIndex == -1 {
					t.Errorf("Could not find closing quote for 'stats' attribute value. Got: %s", statsValuePart)
					return
				}
				statsValue := statsValuePart[:endQuoteIndex]

				for _, sub := range tt.expectedStatSubstrings {
					if !strings.Contains(statsValue, sub) {
						// Modified Errorf call
						t.Errorf("Stats value does not contain expected substring. Value: %s, Substring: %s, FullLog: %s", statsValue, sub, logOutput)
					}
				}

			} else {
				if strings.Contains(logOutput, "stats=\"") {
					t.Errorf("Expected no 'stats' attribute, but it was found. Got: %s", logOutput)
				}
			}
		})
	}
}
