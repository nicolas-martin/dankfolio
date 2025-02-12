package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
)

type CacheMiddleware struct {
	redis  *redis.Client
	ttl    time.Duration
	prefix string
}

func NewCacheMiddleware(redisClient *redis.Client, ttl time.Duration, prefix string) *CacheMiddleware {
	return &CacheMiddleware{
		redis:  redisClient,
		ttl:    ttl,
		prefix: prefix,
	}
}

type responseWriter struct {
	http.ResponseWriter
	body   *bytes.Buffer
	status int
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (cm *CacheMiddleware) Cache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip caching for non-GET requests
		if r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}

		// Generate cache key
		key := cm.generateCacheKey(r)

		// Try to get from cache
		ctx := r.Context()
		cachedResponse, err := cm.redis.Get(ctx, key).Bytes()
		if err == nil {
			// Cache hit
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cachedResponse)
			return
		}

		// Cache miss, capture the response
		rw := &responseWriter{
			ResponseWriter: w,
			body:          &bytes.Buffer{},
		}

		next.ServeHTTP(rw, r)

		// Only cache successful responses
		if rw.status == http.StatusOK {
			err = cm.redis.Set(ctx, key, rw.body.Bytes(), cm.ttl).Err()
			if err != nil {
				// Log cache set error
				fmt.Printf("Failed to set cache: %v\n", err)
			}
		}
	})
}

func (cm *CacheMiddleware) generateCacheKey(r *http.Request) string {
	// Create a unique key based on the full URL and any relevant headers
	h := sha256.New()
	io.WriteString(h, cm.prefix)
	io.WriteString(h, r.URL.String())
	
	// Add relevant headers to the cache key
	relevantHeaders := []string{"Accept", "Accept-Language"}
	for _, header := range relevantHeaders {
		if value := r.Header.Get(header); value != "" {
			io.WriteString(h, header)
			io.WriteString(h, value)
		}
	}

	return hex.EncodeToString(h.Sum(nil))
}

func (cm *CacheMiddleware) InvalidateCache(pattern string) error {
	ctx := context.Background()
	iter := cm.redis.Scan(ctx, 0, cm.prefix+pattern, 0).Iterator()
	for iter.Next(ctx) {
		err := cm.redis.Del(ctx, iter.Val()).Err()
		if err != nil {
			return fmt.Errorf("failed to delete cache key %s: %w", iter.Val(), err)
		}
	}
	return iter.Err()
} 