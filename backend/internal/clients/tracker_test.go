package clients_test

import (
	"sync"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewAPICallTracker(t *testing.T) {
	tracker := clients.NewAPICallTracker()
	require.NotNil(t, tracker, "NewAPICallTracker() should return a non-nil tracker")

	stats := tracker.GetStats()
	assert.Empty(t, stats, "Stats for a new tracker should be empty")
}

func TestTrackCallAndGetStats(t *testing.T) {
	tracker := clients.NewAPICallTracker()

	// Single calls
	tracker.TrackCall("service1", "endpointA")
	stats := tracker.GetStats()
	require.Contains(t, stats, "service1", "Stats should contain service1")
	require.Contains(t, stats["service1"], "endpointA", "service1 stats should contain endpointA")
	assert.Equal(t, 1, stats["service1"]["endpointA"], "Count for service1/endpointA should be 1")

	// Multiple calls to the same endpoint
	tracker.TrackCall("service1", "endpointA")
	stats = tracker.GetStats()
	assert.Equal(t, 2, stats["service1"]["endpointA"], "Count for service1/endpointA should be 2 after second call")

	// Different endpoint for the same service
	tracker.TrackCall("service1", "endpointB")
	stats = tracker.GetStats()
	require.Contains(t, stats["service1"], "endpointB", "service1 stats should contain endpointB")
	assert.Equal(t, 1, stats["service1"]["endpointB"], "Count for service1/endpointB should be 1")
	assert.Equal(t, 2, stats["service1"]["endpointA"], "Count for service1/endpointA should remain 2") // Ensure other counts are not affected

	// Different service
	tracker.TrackCall("service2", "endpointX")
	stats = tracker.GetStats()
	require.Contains(t, stats, "service2", "Stats should contain service2")
	require.Contains(t, stats["service2"], "endpointX", "service2 stats should contain endpointX")
	assert.Equal(t, 1, stats["service2"]["endpointX"], "Count for service2/endpointX should be 1")
	require.Contains(t, stats, "service1", "Stats should still contain service1") // Ensure other services are not affected
}

func TestTrackCall_Concurrency(t *testing.T) {
	tracker := clients.NewAPICallTracker()
	numGoroutines := 100
	callsPerGoroutine := 50

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(i int) {
			defer wg.Done()
			for j := 0; j < callsPerGoroutine; j++ {
				serviceName := "concurrentService"
				endpointName := "concurrentEndpoint"
				if j%2 == 0 { // Alternate calls for variety
					serviceName = "anotherConcurrentService"
				}
				tracker.TrackCall(serviceName, endpointName)
			}
		}(i)
	}

	wg.Wait()

	stats := tracker.GetStats()
	assert.Equal(t, callsPerGoroutine*numGoroutines/2, stats["concurrentService"]["concurrentEndpoint"], "Incorrect count for concurrentService/concurrentEndpoint")
	assert.Equal(t, callsPerGoroutine*numGoroutines/2, stats["anotherConcurrentService"]["concurrentEndpoint"], "Incorrect count for anotherConcurrentService/concurrentEndpoint")
}

func TestGetStats_ReturnsCopy(t *testing.T) {
	tracker := clients.NewAPICallTracker()

	tracker.TrackCall("service1", "endpointA")
	stats1 := tracker.GetStats()

	require.Contains(t, stats1, "service1")
	require.Contains(t, stats1["service1"], "endpointA")
	stats1["service1"]["endpointA"] = 100 // Modify the returned map

	// Add a new entry to the returned map
	if _, ok := stats1["service_new"]; !ok {
		stats1["service_new"] = make(map[string]int)
	}
	stats1["service_new"]["endpoint_new"] = 50

	stats2 := tracker.GetStats() // Get stats again

	// Verify original tracker data is unchanged
	assert.Equal(t, 1, stats2["service1"]["endpointA"], "Modifying the returned map should not affect internal tracker state for existing entry")
	assert.NotContains(t, stats2, "service_new", "Adding to the returned map should not affect internal tracker state")

	// Also verify that modifying a sub-map of the returned stats doesn't affect the original
	tracker.TrackCall("service3", "endpointZ")
	originalStats := tracker.GetStats()
	require.Contains(t, originalStats, "service3")
	require.Contains(t, originalStats["service3"], "endpointZ")

	subMap := originalStats["service3"]
	subMap["endpointZ"] = 999

	currentStats := tracker.GetStats()
	assert.Equal(t, 1, currentStats["service3"]["endpointZ"], "Modifying a sub-map of the returned stats should not affect the tracker's internal state")
}
