package memory

import (
	"fmt"
	"testing"
	"time"
)

const (
	defaultTestMaxSize = 10 // Default maxSize for tests not focusing on LFU eviction
	shortTTL           = 50 * time.Millisecond
	longTTL            = 1 * time.Minute
)

// Helper to check presence of a key.
func assertInCache[T any](t *testing.T, cache *TypedCache[T], key string, expectedValue T, msgAndArgs ...interface{}) {
	t.Helper()
	val, ok := cache.Get(key)
	if !ok {
		t.Errorf("Expected key '%s' to be in cache. %s", key, fmt.Sprint(msgAndArgs...))
	}
	// Type assertion to compare values if T is comparable
	if cv, cok := any(val).(T); cok {
		if cv != expectedValue {
			t.Errorf("Expected value '%v' for key '%s', got '%v'. %s", expectedValue, key, val, fmt.Sprint(msgAndArgs...))
		}
	} else if any(val) != any(expectedValue) { // Fallback for non-comparable types, compares underlying if possible
		t.Errorf("Expected value '%v' for key '%s', got '%v'. %s", expectedValue, key, val, fmt.Sprint(msgAndArgs...))
	}
}

// Helper to check absence of a key.
func assertNotInCache[T any](t *testing.T, cache *TypedCache[T], key string, msgAndArgs ...interface{}) {
	t.Helper()
	if _, ok := cache.Get(key); ok {
		t.Errorf("Expected key '%s' NOT to be in cache. %s", key, fmt.Sprint(msgAndArgs...))
	}
}

func TestTypedCache_Set_Get_Delete_BasicLFU(t *testing.T) {
	cache := NewTypedCache[string]("testSetGetDeleteLFU:", defaultTestMaxSize)

	// Test Set and Get
	cache.Set("key1", "value1", longTTL)
	assertInCache(t, cache, "key1", "value1")

	// Test Update (Set on existing key)
	cache.Set("key1", "value1_updated", longTTL)
	assertInCache(t, cache, "key1", "value1_updated")
	if cache.Len() != 1 {
		t.Errorf("Cache length should be 1 after update, got %d", cache.Len())
	}

	// Test Delete
	cache.Delete("key1")
	assertNotInCache(t, cache, "key1")
	if cache.Len() != 0 {
		t.Errorf("Cache length should be 0 after delete, got %d", cache.Len())
	}

	// Test Get non-existent
	assertNotInCache(t, cache, "nonexistentkey")

	// Test Delete non-existent
	cache.Delete("nonexistentkey") // Should not panic or error
}

func TestTypedCache_Clear_LFU(t *testing.T) {
	cache := NewTypedCache[string]("testClearLFU:", defaultTestMaxSize)
	cache.Set("key1", "value1", longTTL)
	cache.Set("key2", "value2", longTTL)
	if cache.Len() != 2 {
		t.Fatalf("Expected length 2, got %d", cache.Len())
	}

	cache.Clear()
	if cache.Len() != 0 {
		t.Errorf("Expected length 0 after Clear, got %d", cache.Len())
	}
	assertNotInCache(t, cache, "key1", "after Clear")
	assertNotInCache(t, cache, "key2", "after Clear")

	// Test adding after clear
	cache.Set("key3", "value3", longTTL)
	assertInCache(t, cache, "key3", "value3")
	if cache.Len() != 1 {
		t.Errorf("Expected length 1 after adding to cleared cache, got %d", cache.Len())
	}
}

func TestTypedCache_Expiration_LFU(t *testing.T) {
	cache := NewTypedCache[string]("testExpiryLFU:", defaultTestMaxSize)
	cache.Set("key1", "value1", shortTTL)
	cache.Set("key2", "value2", longTTL)

	assertInCache(t, cache, "key1", "value1", "immediately after Set")
	time.Sleep(shortTTL + 20*time.Millisecond) // Wait for key1 to expire

	assertNotInCache(t, cache, "key1", "after expiration")
	if cache.Len() != 1 { // Get on expired key1 should have removed it.
		t.Errorf("Cache length should be 1 after key1 expired, got %d", cache.Len())
	}
	assertInCache(t, cache, "key2", "value2", "key2 should still be present")
}

func TestTypedCache_Len_LFU(t *testing.T) {
	cache := NewTypedCache[string]("testLenLFU:", 3)
	if cache.Len() != 0 {
		t.Errorf("Expected Len 0 for new cache, got %d", cache.Len())
	}
	cache.Set("k1", "v1", longTTL)
	if cache.Len() != 1 {
		t.Errorf("Expected Len 1, got %d", cache.Len())
	}
	cache.Set("k2", "v2", longTTL)
	if cache.Len() != 2 {
		t.Errorf("Expected Len 2, got %d", cache.Len())
	}
	cache.Set("k3", "v3", longTTL)
	if cache.Len() != 3 {
		t.Errorf("Expected Len 3 (full), got %d", cache.Len())
	}
	cache.Set("k4", "v4", longTTL) // Eviction should occur
	if cache.Len() != 3 {
		t.Errorf("Expected Len 3 (after eviction), got %d", cache.Len())
	}
	cache.Delete("k4")
	if cache.Len() != 2 {
		t.Errorf("Expected Len 2 after delete, got %d", cache.Len())
	}
	cache.Clear()
	if cache.Len() != 0 {
		t.Errorf("Expected Len 0 after clear, got %d", cache.Len())
	}
}

func TestTypedCache_LFU_Eviction_Basic(t *testing.T) {
	cache := NewTypedCache[string]("testLFUEvictBasic:", 2) // maxSize = 2

	cache.Set("key1", "val1", longTTL) // freq for key1 becomes 1
	cache.Set("key2", "val2", longTTL) // freq for key2 becomes 1
	// key1: freq 1, key2: freq 1. key1 is LRU within freq 1.

	// Access key1 to increase its frequency
	cache.Get("key1") // key1: freq 2
	cache.Get("key1") // key1: freq 3

	// Access key2 once
	cache.Get("key2") // key2: freq 2

	// At this point: key1 (freq 3), key2 (freq 2)
	// minFrequency should be 2 (key2's frequency)

	cache.Set("key3", "val3", longTTL) // Adds key3 (freq 1). Eviction should occur.
	// key2 should be evicted as it's the LFU item (freq 2 vs key1's freq 3).
	// key3 becomes the new minFrequency item (freq 1).

	assertInCache(t, cache, "key1", "val1", "key1 should remain")
	assertNotInCache(t, cache, "key2", "key2 should be evicted")
	assertInCache(t, cache, "key3", "val3", "key3 should be added")
	if cache.Len() != 2 {
		t.Errorf("Cache length should be 2, got %d", cache.Len())
	}
}

func TestTypedCache_LFU_Eviction_TieBreaking_LRU(t *testing.T) {
	cache := NewTypedCache[string]("testLFUTieLRU:", 2) // maxSize = 2

	cache.Set("key1", "val1", longTTL) // key1: freq 1. MRU in freq 1 list.
	time.Sleep(10 * time.Millisecond)   // Ensure key2 is observably later for LRU tie-breaking
	cache.Set("key2", "val2", longTTL) // key2: freq 1. MRU in freq 1 list. key1 is LRU in freq 1.
	// state: items: {key1: (el_k1, freq 1), key2: (el_k2, freq 1)}
	// freqMap: {1: [el_k2, el_k1]} (key2 is front/MRU, key1 is back/LRU)
	// minFrequency: 1

	cache.Set("key3", "val3", longTTL) // Adds key3 (freq 1). Eviction needed.
	// Both key1 and key2 have freq 1. key1 is LRU within this frequency.
	// So, key1 should be evicted.

	assertNotInCache(t, cache, "key1", "key1 (LRU in minFrequency) should be evicted")
	assertInCache(t, cache, "key2", "val2", "key2 should remain")
	assertInCache(t, cache, "key3", "val3", "key3 should be added")
	if cache.Len() != 2 {
		t.Errorf("Cache length should be 2, got %d", cache.Len())
	}
}

func TestTypedCache_LFU_Get_IncrementsFrequency_ImpactsEviction(t *testing.T) {
	cache := NewTypedCache[string]("testLFUGetIncrements:", 2)
	cache.Set("key1", "val1", longTTL) // k1 (f1)
	cache.Set("key2", "val2", longTTL) // k2 (f1), k1 (f1, LRU)

	cache.Get("key1") // k1 (f2), k2 (f1, LRU)
	// minFrequency is 1 (key2)

	cache.Set("key3", "val3", longTTL) // Add k3 (f1). k2 (LFU) should be evicted.
	assertNotInCache(t, cache, "key2", "key2 should be evicted")
	assertInCache(t, cache, "key1", "val1", "key1 should remain (higher frequency)")
	assertInCache(t, cache, "key3", "val3", "key3 should be added")
}

func TestTypedCache_LFU_Update_IncrementsFrequency(t *testing.T) {
	cache := NewTypedCache[string]("testLFUUpdateIncrements:", 2)
	cache.Set("key1", "val1", longTTL) // k1(f1)
	cache.Set("key2", "val2", longTTL) // k2(f1), k1(f1, LRU)

	cache.Set("key1", "newVal1", longTTL) // Update k1. k1(f2), k2(f1, LRU)
	// minFrequency is 1 (key2)

	assertInCache(t, cache, "key1", "newVal1")
	if cache.Len() != 2 {
		t.Fatalf("Length should be 2, got %d", cache.Len())
	}

	cache.Set("key3", "val3", longTTL) // Add k3(f1). k2 (LFU) should be evicted.
	assertNotInCache(t, cache, "key2", "key2 should be evicted")
	assertInCache(t, cache, "key1", "newVal1", "key1 should remain")
	assertInCache(t, cache, "key3", "val3", "key3 should be added")
}

func TestTypedCache_LFU_Expiration_RemovesItem_AdjustsMinFrequency(t *testing.T) {
	cache := NewTypedCache[string]("testLFUExpireAdjust:", 2)

	cache.Set("key1", "val1", shortTTL) // k1(f1)
	cache.Set("key2", "val2", longTTL)  // k2(f1), k1(f1, LRU)
	cache.Get("key2")                  // k2(f2), k1(f1, LRU). minFrequency = 1 (key1)

	time.Sleep(shortTTL + 20*time.Millisecond) // key1 expires

	assertNotInCache(t, cache, "key1", "key1 should be expired") // Get triggers removal of k1
	// Cache: k2(f2). minFrequency should now be 2.
	if cache.Len() != 1 {
		t.Fatalf("Cache length should be 1, got %d", cache.Len())
	}
	// Verify minFrequency implicitly:
	// Add key3 (freq 1). No eviction yet because k1's slot is free.
	cache.Set("key3", "val3", longTTL) // k3(f1), k2(f2)
	if cache.Len() != 2 {
		t.Fatalf("Cache length should be 2, got %d", cache.Len())
	}
	assertInCache(t, cache, "key2", "val2")
	assertInCache(t, cache, "key3", "val3")
	// minFrequency is 1 (key3)

	// Add key4. key3 (LFU, freq 1) should be evicted, not key2 (freq 2).
	cache.Set("key4", "val4", longTTL) // k4(f1), k2(f2)
	assertNotInCache(t, cache, "key3", "key3 should be evicted")
	assertInCache(t, cache, "key2", "val2", "key2 should remain (higher freq)")
	assertInCache(t, cache, "key4", "val4", "key4 should be added")
}

func TestTypedCache_LFU_ZeroNegativeMaxSize_Unlimited(t *testing.T) {
	for _, tc := range []struct {
		name    string
		maxSize int
	}{
		{"ZeroMaxSize", 0},
		{"NegativeMaxSize", -5},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cache := NewTypedCache[string](fmt.Sprintf("testLFUUnlimited_%s:", tc.name), tc.maxSize)
			numItems := 100
			for i := 0; i < numItems; i++ {
				cache.Set(fmt.Sprintf("key%d", i), fmt.Sprintf("val%d", i), longTTL)
			}
			if cache.Len() != numItems {
				t.Errorf("Expected cache length %d for maxSize %d, got %d", numItems, tc.maxSize, cache.Len())
			}
			// Check a few items by Get to ensure they are there and this also affects their frequency
			assertInCache(t, cache, "key0", "val0")
			assertInCache(t, cache, fmt.Sprintf("key%d", numItems-1), fmt.Sprintf("val%d", numItems-1))
		})
	}
}

func TestTypedCache_LFU_Delete_AdjustsMinFrequency(t *testing.T) {
	cache := NewTypedCache[string]("testLFUDeleteAdjust:", 3)
	cache.Set("key1", "val1", longTTL) // k1(f1)
	cache.Set("key2", "val2", longTTL) // k2(f1), k1(f1, LRU)
	cache.Set("key3", "val3", longTTL) // k3(f1), k2(f1, LRU), k1(f1, LRUer)
	// minFrequency = 1. All have freq 1.

	cache.Get("key2") // k2(f2)
	cache.Get("key3") // k3(f2)
	cache.Get("key3") // k3(f3)
	// State: k1(f1), k2(f2), k3(f3). minFrequency = 1 (key1)

	cache.Delete("key1") // Delete k1 (the only item at minFrequency 1)
	// minFrequency should now be 2 (key2)
	if cache.Len() != 2 {
		t.Fatalf("Cache length should be 2, got %d", cache.Len())
	}
	// Verify by adding a new item, it should evict k2 (new LFU) if cache full
	cache.Set("key4", "val4", longTTL) // k4(f1). maxSize is 3. No eviction.
	// State: k2(f2), k3(f3), k4(f1). minFrequency = 1 (key4)
	assertInCache(t, cache, "key4", "val4")

	cache.Set("key5", "val5", longTTL) // k5(f1). Eviction. k4 should be evicted.
	// State: k2(f2), k3(f3), k5(f1). minFrequency = 1 (key5)
	assertNotInCache(t, cache, "key4", "key4 should be evicted")
	assertInCache(t, cache, "key2", "val2")
	assertInCache(t, cache, "key3", "val3")
	assertInCache(t, cache, "key5", "val5")
}

// Test for when keyPrefix is empty (should ideally not happen in prod if enforced)
func TestTypedCache_EmptyKeyPrefix_LFU(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic with empty keyPrefix due to log.Fatalf")
		}
	}()
	cache := NewTypedCache[string]("", 5) // Panic expected on first use of getCacheKey
	cache.Set("id1", "value1", time.Minute)
}
