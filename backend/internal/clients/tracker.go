package clients

import "sync"

// APICallTracker defines the interface for tracking API calls.
type APICallTracker interface {
	// TrackCall records an API call to a specific service and endpoint.
	TrackCall(serviceName, endpointName string)

	// GetStats returns a map of service names to a map of endpoint names to call counts.
	GetStats() map[string]map[string]int
}

// APICallTrackerImpl implements the APICallTracker interface using a thread-safe map.
type APICallTrackerImpl struct {
	counts map[string]map[string]int
	mutex  sync.Mutex
}

// NewAPICallTracker creates a new APICallTrackerImpl.
func NewAPICallTracker() *APICallTrackerImpl {
	return &APICallTrackerImpl{
		counts: make(map[string]map[string]int),
	}
}

// TrackCall records an API call to a specific service and endpoint.
func (t *APICallTrackerImpl) TrackCall(serviceName, endpointName string) {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	if _, ok := t.counts[serviceName]; !ok {
		t.counts[serviceName] = make(map[string]int)
	}
	t.counts[serviceName][endpointName]++
}

// GetStats returns a copy of the current statistics.
func (t *APICallTrackerImpl) GetStats() map[string]map[string]int {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	// Create a deep copy of the map to avoid concurrent modification issues.
	statsCopy := make(map[string]map[string]int)
	for serviceName, endpointMap := range t.counts {
		statsCopy[serviceName] = make(map[string]int)
		for endpointName, count := range endpointMap {
			statsCopy[serviceName][endpointName] = count
		}
	}
	return statsCopy
}
