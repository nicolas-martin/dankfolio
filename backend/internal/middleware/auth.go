package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"connectrpc.com/authn"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/auth"
)

// AuthMiddleware creates authentication middleware using connectrpc/authn
func AuthMiddleware(authService *auth.Service) *authn.Middleware {
	return authn.NewMiddleware(func(ctx context.Context, req *http.Request) (any, error) {
		// Extract the Authorization header
		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			return nil, authn.Errorf("missing authorization header")
		}

		// Check for Bearer token format
		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			return nil, authn.Errorf("invalid authorization header format")
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, bearerPrefix)
		if tokenString == "" {
			return nil, authn.Errorf("empty bearer token")
		}

		// Validate the token using our auth service
		user, err := authService.ValidateToken(tokenString)
		if err != nil {
			slog.Warn("Authentication failed", "error", err, "remote_addr", req.RemoteAddr)
			return nil, authn.Errorf("invalid token: %v", err)
		}

		slog.Debug("Request authenticated",
			"device_id", user.DeviceID,
			"platform", user.Platform,
			"remote_addr", req.RemoteAddr,
			"method", req.Method,
			"path", req.URL.Path)

		// Return the authenticated user info (will be available in Connect handlers via authn.GetInfo)
		return user, nil
	})
}
