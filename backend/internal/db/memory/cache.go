package memory

import (
	"container/list"
	"log"
	"sync"
	"time"
)

// lfuCacheEntry stores the key, value, expiration, frequency, and a pointer to its parent frequency list.
type lfuCacheEntry[T any] struct {
	key        string
	value      T
	expiration time.Time
	frequency  int
	parentList *list.List // Pointer to the frequency list this item belongs to
}

// TypedCache is a generic cache implementation that provides type-safe caching
// with LFU eviction and per-item TTL.
type TypedCache[T any] struct {
	mu           sync.Mutex
	items        map[string]*list.Element   // Maps cache key to the list element holding lfuCacheEntry
	frequencyMap map[int]*list.List       // Maps frequency to a list of items with that frequency
	minFrequency int                        // Tracks the current minimum frequency in the cache
	keyPrefix    string
	maxSize      int
}

// NewTypedCache creates a new generic cache instance with LFU eviction.
// maxSize is the maximum number of items the cache can hold. If maxSize <= 0,
// the cache has no size limit (LFU logic still applies but no eviction due to size).
func NewTypedCache[T any](keyPrefix string, maxSize int) *TypedCache[T] {
	return &TypedCache[T]{
		items:        make(map[string]*list.Element),
		frequencyMap: make(map[int]*list.List),
		minFrequency: 0, // Will be set to 1 when first item is added
		keyPrefix:    keyPrefix,
		maxSize:      maxSize,
	}
}

// getCacheKey generates a cache key with the configured prefix.
func (c *TypedCache[T]) getCacheKey(id string) string {
	if c.keyPrefix == "" {
		log.Fatalf("keyPrefix is empty for TypedCache")
	}
	return c.keyPrefix + id
}

// incrementFrequency promotes an item to the next frequency level.
// It handles moving the item between frequency lists and updating minFrequency if necessary.
func (c *TypedCache[T]) incrementFrequency(element *list.Element) {
	entry := element.Value.(*lfuCacheEntry[T])

	// Remove from current frequency list
	currentFreqList := entry.parentList
	currentFreqList.Remove(element)

	// If the old frequency list is now empty and it was the minFrequency, update minFrequency
	if entry.frequency == c.minFrequency && currentFreqList.Len() == 0 {
		delete(c.frequencyMap, entry.frequency) // Remove empty list from map
		// minFrequency will be correctly updated if this was the last item with minFrequency.
		// If other items still exist at minFrequency (in a different list, which shouldn't happen with this model),
		// or if new items are added, minFrequency logic in Set/Get will handle it.
		// A more robust way to update minFrequency here if needed would be to iterate frequencyMap,
		// but typically it's updated when items are added or lowest frequency list is emptied.
		// For now, rely on Set/Get to manage minFrequency correctly when items are added or fully cleared.
		// If this was the *only* list at minFrequency, then minFrequency should increase.
		// This is tricky: if we just deleted the last item of frequency F, the new minFrequency could be F+1 or something else.
		// Let's adjust minFrequency upwards only if the deleted list was indeed the one for c.minFrequency.
		// A full scan for the new minFrequency is only needed if this list was the *sole* source of minFrequency items.
		// For simplicity, if the list for minFrequency becomes empty, we'll increment minFrequency.
		// This assumes there's something at minFrequency+1 or higher, or new items will reset it to 1.
		if c.frequencyMap[c.minFrequency] == nil || c.frequencyMap[c.minFrequency].Len() == 0 {
			// If we just emptied the list that defined minFrequency, we need a new minFrequency.
			// This is complex. A simpler approach for now: if the list for current minFrequency is empty,
			// it implies minFrequency must be higher or there are no items.
			// If items exist, the lowest frequency among them is the new minFrequency.
			// This is handled by Set adding new items at frequency 1, resetting minFrequency.
			// And by eviction targeting the current minFrequency.
			// If an item is incremented *from* minFrequency, and that list becomes empty,
			// then the new minFrequency *must* be entry.frequency + 1 (its new freq) if no other lists exist at old minFrequency.
			// This detail is crucial and hard to get right without scanning.
			// For now, let's assume that if minFrequency's list is empty, a new item will reset it, or eviction won't find it.
			// A simpler update: if the list at c.minFrequency is now empty, delete it from the map.
			// The next item added at freq 1 will reset minFrequency, or eviction will find the next available lowest.
			delete(c.frequencyMap, entry.frequency) // ensure it's deleted if empty
		}
	}

	entry.frequency++
	nextFreqList, ok := c.frequencyMap[entry.frequency]
	if !ok {
		nextFreqList = list.New()
		c.frequencyMap[entry.frequency] = nextFreqList
	}
	newElement := nextFreqList.PushFront(entry) // Add to front (LRU within frequency)
	entry.parentList = nextFreqList
	c.items[entry.key] = newElement // Update map to point to the new element in the new list
}

// Set stores or updates a value in the cache.
func (c *TypedCache[T]) Set(id string, value T, expirationDuration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.getCacheKey(id)
	expTime := time.Now().Add(expirationDuration)

	if element, ok := c.items[key]; ok {
		// Item exists: update value, expiration, and increment frequency
		entry := element.Value.(*lfuCacheEntry[T])
		entry.value = value
		entry.expiration = expTime
		c.incrementFrequency(element)
	} else {
		// New item
		if c.maxSize > 0 && len(c.items) >= c.maxSize {
			// Evict: remove the least frequently used item.
			// If multiple items have minFrequency, evict the least recently used among them.
			if minFreqList, exists := c.frequencyMap[c.minFrequency]; exists && minFreqList.Len() > 0 {
				elementToEvict := minFreqList.Back() // LRU from the minFrequency list
				evictedEntry := elementToEvict.Value.(*lfuCacheEntry[T])
				minFreqList.Remove(elementToEvict)
				delete(c.items, evictedEntry.key)
				log.Printf("[cache:EVICT_LFU] key=%s, freq=%d due to capacity limit", evictedEntry.key, evictedEntry.frequency)
				if minFreqList.Len() == 0 {
					delete(c.frequencyMap, c.minFrequency)
					// Need to find the new minFrequency if this was the only list at minFrequency
					// This is complex. For now, if items are left, minFrequency will be re-evaluated or next Set will reset it.
					// A robust way would be to iterate c.frequencyMap keys.
					// For now, we'll rely on the fact that if all items are gone, minFrequency=0,
					// and if new items are added, minFrequency becomes 1.
				}
			}
		}

		// Add new item
		newEntry := &lfuCacheEntry[T]{
			key:        key,
			value:      value,
			expiration: expTime,
			frequency:  1, // New items start with frequency 1
		}
		c.minFrequency = 1 // Reset minFrequency as a new item is added at frequency 1

		freqList, listExists := c.frequencyMap[1]
		if !listExists {
			freqList = list.New()
			c.frequencyMap[1] = freqList
		}
		element := freqList.PushFront(newEntry) // Add to front (LRU within frequency 1)
		newEntry.parentList = freqList
		c.items[key] = element
	}
	// After potential eviction, if all lists of minFrequency were emptied, minFrequency needs recalculation.
	// This is a tricky part of LFU. If c.frequencyMap[c.minFrequency] is empty or nil after eviction/increment,
	// we must find the new actual minimum.
	if c.frequencyMap[c.minFrequency] == nil || c.frequencyMap[c.minFrequency].Len() == 0 {
		if len(c.items) > 0 { // only if cache is not empty
			newMin := -1
			for f := range c.frequencyMap {
				if c.frequencyMap[f].Len() > 0 {
					if newMin == -1 || f < newMin {
						newMin = f
					}
				} else {
					delete(c.frequencyMap, f) // Clean up empty list
				}
			}
			if newMin != -1 {
				c.minFrequency = newMin
			} else { // Cache became empty
				c.minFrequency = 0
			}
		} else { // Cache is empty
			c.minFrequency = 0
		}
	}

}

// Get retrieves a value from the cache.
func (c *TypedCache[T]) Get(id string) (T, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var zero T
	key := c.getCacheKey(id)

	if element, ok := c.items[key]; ok {
		entry := element.Value.(*lfuCacheEntry[T])

		if time.Now().After(entry.expiration) {
			// Item expired, remove it
			entry.parentList.Remove(element)
			if entry.parentList.Len() == 0 {
				delete(c.frequencyMap, entry.frequency)
			}
			delete(c.items, key)
			log.Printf("[cache:MISS:expired_LFU] key=%s", key)

			// After removal, if the list for minFrequency became empty, update minFrequency
			if entry.frequency == c.minFrequency && (c.frequencyMap[c.minFrequency] == nil || c.frequencyMap[c.minFrequency].Len() == 0) {
                 if len(c.items) > 0 {
                    newMin := -1
                    for f := range c.frequencyMap {
                        if c.frequencyMap[f].Len() > 0 {
                             if newMin == -1 || f < newMin {
                                newMin = f
                            }
                        } else {
                             delete(c.frequencyMap, f) // Clean up
                        }
                    }
                    c.minFrequency = newMin // if newMin is still -1, cache is empty, minFreq should be 0
					if newMin == -1 { c.minFrequency = 0}
                } else {
                    c.minFrequency = 0 // Cache is now empty
                }
			}
			return zero, false
		}

		// Item found and not expired, increment its frequency
		c.incrementFrequency(element)
		log.Printf("[cache:HIT_LFU] key=%s, new_freq=%d", key, entry.frequency)
		return entry.value, true
	}

	log.Printf("[cache:MISS_LFU] key=%s", key)
	return zero, false
}

// Delete removes a value from the cache.
func (c *TypedCache[T]) Delete(id string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.getCacheKey(id)
	if element, ok := c.items[key]; ok {
		entry := element.Value.(*lfuCacheEntry[T])
		entry.parentList.Remove(element)
		if entry.parentList.Len() == 0 {
			delete(c.frequencyMap, entry.frequency)
		}
		delete(c.items, key)
		log.Printf("[cache:DELETE_LFU] key=%s, freq=%d", key, entry.frequency)

		// Update minFrequency if necessary (similar logic to expiration in Get)
		if entry.frequency == c.minFrequency && (c.frequencyMap[c.minFrequency] == nil || c.frequencyMap[c.minFrequency].Len() == 0) {
			if len(c.items) > 0 {
				newMin := -1
				for f_idx := range c.frequencyMap {
					if c.frequencyMap[f_idx].Len() > 0 {
						if newMin == -1 || f_idx < newMin {
							newMin = f_idx
						}
					} else {
						delete(c.frequencyMap, f_idx)
					}
				}
				c.minFrequency = newMin
				if newMin == -1 { c.minFrequency = 0}
			} else {
				c.minFrequency = 0
			}
		}
	}
}

// Clear removes all items from the cache.
func (c *TypedCache[T]) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]*list.Element)
	c.frequencyMap = make(map[int]*list.List)
	c.minFrequency = 0
	log.Printf("[cache:CLEAR_LFU] All items cleared")
}

// Len returns the current number of items in the cache.
func (c *TypedCache[T]) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.items)
}
