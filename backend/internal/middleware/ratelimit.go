package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/time/rate"
)

// RateLimiter provides rate limiting middleware for HTTP requests
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
	cleanup  time.Duration
}

// visitor tracks the rate limiter for each client
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter middleware
// requestsPerSecond: number of requests allowed per second
// burstSize: maximum burst size
func NewRateLimiter(requestsPerSecond float64, burstSize int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(requestsPerSecond),
		burst:    burstSize,
		cleanup:  5 * time.Minute,
	}

	// Start cleanup goroutine
	go rl.cleanupVisitors()

	return rl
}

// getVisitor retrieves or creates a rate limiter for the given IP
func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.visitors[ip] = &visitor{
			limiter:  limiter,
			lastSeen: time.Now(),
		}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupVisitors removes old entries from the visitors map
func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(rl.cleanup)

		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.cleanup {
				delete(rl.visitors, ip)
				slog.Debug("Cleaned up rate limiter for IP", "ip", ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Middleware returns an HTTP middleware that enforces rate limiting
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract client IP
		ip := r.RemoteAddr
		if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
			ip = forwardedFor
		} else if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
			ip = realIP
		}

		// Get rate limiter for this IP
		limiter := rl.getVisitor(ip)

		// Check if request is allowed
		if !limiter.Allow() {
			slog.Warn("Rate limit exceeded", 
				"ip", ip, 
				"path", r.URL.Path,
				"method", r.Method,
			)
			
			// Return 429 Too Many Requests
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", int(rl.rate)))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"Too many requests. Please try again later."}`))
			return
		}

		// Process request
		next.ServeHTTP(w, r)
	})
}

// ConnectInterceptor returns a Connect interceptor for rate limiting
func (rl *RateLimiter) ConnectInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			// Extract client IP from context or request
			// This would need to be set by an earlier middleware
			ip := "unknown"
			if peer, ok := ctx.Value("client_ip").(string); ok {
				ip = peer
			}

			// Get rate limiter for this IP
			limiter := rl.getVisitor(ip)

			// Check if request is allowed
			if !limiter.Allow() {
				slog.Warn("gRPC rate limit exceeded",
					"ip", ip,
					"procedure", req.Spec().Procedure,
				)
				return nil, connect.NewError(
					connect.CodeResourceExhausted,
					fmt.Errorf("too many requests, please try again later"),
				)
			}

			// Process request
			return next(ctx, req)
		}
	}
}

// IPRateLimiterConfig provides configuration options for rate limiting
type IPRateLimiterConfig struct {
	RequestsPerSecond float64
	BurstSize         int
	CleanupInterval   time.Duration
	
	// Different limits for different endpoints
	EndpointLimits map[string]EndpointLimit
}

// EndpointLimit defines rate limits for specific endpoints
type EndpointLimit struct {
	RequestsPerSecond float64
	BurstSize         int
}

// NewAdvancedRateLimiter creates a rate limiter with per-endpoint configuration
func NewAdvancedRateLimiter(config IPRateLimiterConfig) *RateLimiter {
	if config.RequestsPerSecond <= 0 {
		config.RequestsPerSecond = 10 // Default: 10 requests per second
	}
	if config.BurstSize <= 0 {
		config.BurstSize = 20 // Default burst size
	}
	if config.CleanupInterval <= 0 {
		config.CleanupInterval = 5 * time.Minute
	}

	return &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(config.RequestsPerSecond),
		burst:    config.BurstSize,
		cleanup:  config.CleanupInterval,
	}
}