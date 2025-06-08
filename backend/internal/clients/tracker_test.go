package clients_test

import (
	"reflect"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients" // Adjust import path if necessary
)

func TestAPICallTrackerImpl_TrackCall_Normalization(t *testing.T) {
	tracker := clients.NewAPICallTracker()

	// Test calls
	tracker.TrackCall("jupiter", "/tokens/v1/token/SPECIFIC_ID_1")
	tracker.TrackCall("jupiter", "/tokens/v1/token/SPECIFIC_ID_2") // Should be aggregated
	tracker.TrackCall("jupiter", "/tokens/v1/new")                 // Should not be aggregated
	tracker.TrackCall("solana", "/tokens/v1/token/SOME_ID")      // Different service, should not be aggregated
	tracker.TrackCall("jupiter", "/tokens/v1/token/SPECIFIC_ID_3") // Should be aggregated

	actualStats := tracker.GetStats()

	expectedStats := map[string]map[string]int{
		"jupiter": {
			"/tokens/v1/token/SPECIFIC_ID_1": 1, // Raw endpoint
			"/tokens/v1/token/SPECIFIC_ID_2": 1, // Raw endpoint
			"/tokens/v1/token/SPECIFIC_ID_3": 1, // Raw endpoint
			"/tokens/v1/new":                   1,
		},
		"solana": {
			"/tokens/v1/token/SOME_ID": 1,
		},
	}

	if !reflect.DeepEqual(expectedStats, actualStats) {
		t.Errorf("GetStats() returned unexpected results.\nExpected: %v\nActual:   %v", expectedStats, actualStats)
	}
}

func TestAPICallTrackerImpl_GetStats_Empty(t *testing.T) {
	tracker := clients.NewAPICallTracker()
	stats := tracker.GetStats()
	if len(stats) != 0 {
		t.Errorf("Expected empty stats for a new tracker, got %v", stats)
	}
}

func TestAPICallTrackerImpl_TrackCall_Basic(t *testing.T) {
	tracker := clients.NewAPICallTracker()
	tracker.TrackCall("service1", "endpoint1")
	tracker.TrackCall("service1", "endpoint1")
	tracker.TrackCall("service1", "endpoint2")
	tracker.TrackCall("service2", "endpointA")

	expected := map[string]map[string]int{
		"service1": {"endpoint1": 2, "endpoint2": 1},
		"service2": {"endpointA": 1},
	}
	actual := tracker.GetStats()
	if !reflect.DeepEqual(expected, actual) {
		t.Errorf("Basic tracking failed. Expected: %v, Got: %v", expected, actual)
	}
}

// A simple concurrency test (optional, as noted above, but good to have)
// For now, this subtask will focus on creating the file with the normalization test.
// If tracker_test.go already exists, this will add/replace the normalization test
// and ensure the other basic tests are also present.
