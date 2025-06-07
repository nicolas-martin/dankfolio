package telemetry_test

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/telemetry"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockAPICallTracker is a mock implementation of the APICallTracker interface.
type MockAPICallTracker struct {
	mock.Mock
}

func (m *MockAPICallTracker) TrackCall(serviceName, endpointName string) {
	m.Called(serviceName, endpointName)
}

func (m *MockAPICallTracker) GetStats() map[string]map[string]int {
	args := m.Called()
	return args.Get(0).(map[string]map[string]int)
}

// NewMockAPICallTracker creates a new mock APICallTracker
func NewMockAPICallTracker() *MockAPICallTracker {
	return &MockAPICallTracker{}
}

func TestLogAPIStats_NoStats(t *testing.T) {
	mockTracker := NewMockAPICallTracker()
	var logOutput bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logOutput, nil))

	mockTracker.On("GetStats").Return(map[string]map[string]int{})

	telemetry.LogAPIStats(mockTracker, logger)

	assert.Contains(t, logOutput.String(), "No API calls tracked yet.")
	mockTracker.AssertExpectations(t)
}

func TestLogAPIStats_WithStats(t *testing.T) {
	mockTracker := NewMockAPICallTracker()
	var logOutput bytes.Buffer
	// Using a JSON handler to make parsing attributes easier, though TextHandler with string contains would also work
	logger := slog.New(slog.NewJSONHandler(&logOutput, nil))

	stats := map[string]map[string]int{
		"service1": {
			"endpointA": 10,
			"endpointB": 5,
		},
		"service2": {
			"endpointX": 20,
		},
	}
	mockTracker.On("GetStats").Return(stats)

	telemetry.LogAPIStats(mockTracker, logger)

	outputStr := logOutput.String()
	t.Log("Log Output:\n", outputStr) // Print log output for debugging

	// Check for the initial "API Call Statistics:" message
	assert.Contains(t, outputStr, "\"msg\":\"API Call Statistics:\"")

	// Check for each stat entry by verifying the presence of key components.
	// The exact order of JSON fields within a log line isn't guaranteed,
	// and the order of log lines for different stats isn't guaranteed either if maps are iterated.
	assert.Contains(t, outputStr, "\"msg\":\"API Usage\"")
	assert.Contains(t, outputStr, "\"service\":\"service1\"")
	assert.Contains(t, outputStr, "\"endpoint\":\"endpointA\"")
	assert.Contains(t, outputStr, "\"count\":10")

	assert.Contains(t, outputStr, "\"service\":\"service1\"")
	assert.Contains(t, outputStr, "\"endpoint\":\"endpointB\"")
	assert.Contains(t, outputStr, "\"count\":5")

	assert.Contains(t, outputStr, "\"service\":\"service2\"")
	assert.Contains(t, outputStr, "\"endpoint\":\"endpointX\"")
	assert.Contains(t, outputStr, "\"count\":20")

	mockTracker.AssertExpectations(t)
}

// Ensure MockAPICallTracker implements the interface if it's defined in the clients package
var _ clients.APICallTracker = (*MockAPICallTracker)(nil)

// Helper to create a simple text logger for easier string matching if needed
func newTestTextLogger(buf *bytes.Buffer) *slog.Logger {
	return slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Remove time for consistent log output in tests
			if a.Key == slog.TimeKey {
				return slog.Attr{}
			}
			return a
		},
	}))
}

func TestLogAPIStats_WithStats_TextLogger(t *testing.T) {
	mockTracker := NewMockAPICallTracker()
	var logOutput bytes.Buffer
	logger := newTestTextLogger(&logOutput) // Using the helper for simpler text matching

	stats := map[string]map[string]int{
		"serviceA": {
			"ep1": 1,
			"ep2": 2,
		},
	}
	mockTracker.On("GetStats").Return(stats)

	telemetry.LogAPIStats(mockTracker, logger)

	output := logOutput.String()
	assert.True(t, strings.Contains(output, "msg=\"API Call Statistics:\""), "Missing overall title log")
	assert.True(t, strings.Contains(output, "msg=\"API Usage\" service=serviceA endpoint=ep1 count=1"), "Missing log for serviceA/ep1")
	assert.True(t, strings.Contains(output, "msg=\"API Usage\" service=serviceA endpoint=ep2 count=2"), "Missing log for serviceA/ep2")

	mockTracker.AssertExpectations(t)
}
