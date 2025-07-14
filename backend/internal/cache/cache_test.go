package cache

import (
	"testing"
	"time"
	
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

func TestCacheDelete(t *testing.T) {
	// Create a new cache instance
	cache, err := NewCoinCache()
	if err != nil {
		t.Fatalf("Failed to create cache: %v", err)
	}

	// Test data
	key := "test-key"
	data := []model.Coin{
		{
			ID:      1,
			Name:    "Test Coin",
			Symbol:  "TEST",
			Address: "test-address",
		},
	}

	// Set data in cache
	cache.Set(key, data, 5*time.Minute)

	// Verify data exists
	retrieved, found := cache.Get(key)
	if !found {
		t.Error("Expected to find data in cache after Set")
	}
	if len(retrieved) != 1 || retrieved[0].Name != "Test Coin" {
		t.Error("Retrieved data doesn't match what was set")
	}

	// Delete the data
	cache.Delete(key)

	// Verify data is gone
	_, found = cache.Get(key)
	if found {
		t.Error("Expected data to be deleted from cache after Delete")
	}
}