package middleware

import (
	"bytes"
	"log"
	"net/http"
	"sync"
	"time"
)

type cacheEntry struct {
	response   []byte
	header     http.Header
	status     int
	expiration time.Time
}

type Cache struct {
	store map[string]cacheEntry
	mu    sync.RWMutex
	ttl   time.Duration
}

func NewCache(ttl time.Duration) *Cache {
	return &Cache{
		store: make(map[string]cacheEntry),
		ttl:   ttl,
	}
}

// CacheMiddleware returns a middleware that caches responses
func (c *Cache) CacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only cache GET requests
		if r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}

		// Create cache key from request URL
		key := generateCacheKey(r)
		log.Printf("Cache key generated: %s", key)

		// Create a response wrapper to capture the response
		wrapper := &responseWrapper{
			ResponseWriter: w,
			buffer:         &bytes.Buffer{},
		}

		// Check if we have a cached response
		c.mu.RLock()
		entry, exists := c.store[key]
		c.mu.RUnlock()

		if exists {
			log.Printf("Cache entry found for key %s, expires in %v", key, time.Until(entry.expiration))
			if time.Now().Before(entry.expiration) {
				// Add cache hit header
				wrapper.Header().Set("X-Cache", "HIT")
				// Copy cached headers
				for k, v := range entry.header {
					wrapper.Header()[k] = v
				}
				wrapper.WriteHeader(entry.status)
				wrapper.Write(entry.response)
				log.Printf("Serving cached response for %s", key)
				return
			} else {
				log.Printf("Cache entry expired for %s", key)
			}
		} else {
			log.Printf("No cache entry found for %s", key)
		}

		// Add cache miss header
		wrapper.Header().Set("X-Cache", "MISS")

		// Call the next handler
		next.ServeHTTP(wrapper, r)

		// Only cache if status is 200
		if wrapper.status == http.StatusOK || (wrapper.status == 0 && len(wrapper.buffer.Bytes()) > 0) {
			c.mu.Lock()
			c.store[key] = cacheEntry{
				response:   wrapper.buffer.Bytes(),
				header:     wrapper.Header(),
				status:     wrapper.status,
				expiration: time.Now().Add(c.ttl),
			}
			log.Printf("Stored response in cache for %s, expires at %v", key, time.Now().Add(c.ttl))
			c.mu.Unlock()
		} else {
			log.Printf("Not caching response for %s, status: %d, body length: %d", key, wrapper.status, len(wrapper.buffer.Bytes()))
		}
	})
}

// generateCacheKey creates a unique key for the request
func generateCacheKey(r *http.Request) string {
	// Just use the URL path and query as the cache key
	return r.URL.String()
}

// responseWrapper captures the response
type responseWrapper struct {
	http.ResponseWriter
	buffer *bytes.Buffer
	status int
}

func (w *responseWrapper) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *responseWrapper) Write(b []byte) (int, error) {
	w.buffer.Write(b)
	return w.ResponseWriter.Write(b)
}
