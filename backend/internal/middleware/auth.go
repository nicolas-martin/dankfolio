package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"connectrpc.com/authn"
	"firebase.google.com/go/v4/appcheck"
)

// AppCheckAuthenticatedUser represents a user authenticated via Firebase App Check
type AppCheckAuthenticatedUser struct {
	AppID   string
	Subject string
}

// AppCheckMiddleware creates authentication middleware using Firebase App Check directly
func AppCheckMiddleware(appCheckClient *appcheck.Client, env string, devAppCheckToken string) *authn.Middleware {
	return authn.NewMiddleware(func(ctx context.Context, req *http.Request) (any, error) {
		// SECURITY: Strict environment validation for dev bypass
		// Only allow specific, well-defined development environments
		isDevEnvironment := env == "development" || env == "local" || env == "production-simulator"

		// Additional safety check: ensure we're not accidentally in production
		if isDevEnvironment && strings.Contains(strings.ToLower(env), "prod") && !strings.Contains(env, "simulator") {
			slog.Error("Suspicious environment configuration detected", "env", env)
			isDevEnvironment = false
		}

		if isDevEnvironment {
			if devAppCheckToken == "" {
				slog.Error("DEV_APP_CHECK_TOKEN is not set for development environment", "env", env)
				return nil, authn.Errorf("missing configuration")
			}

			appCheckToken := req.Header.Get("X-Firebase-AppCheck")
			if appCheckToken == "" {
				slog.Warn("Missing App Check token in request", "remote_addr", req.RemoteAddr, "method", req.Method, "path", req.URL.Path)
				return nil, authn.Errorf("missing auth header")
			}
			if appCheckToken != devAppCheckToken {
				slog.Warn("Invalid App Check token for development environment", "env", env, "remote_addr", req.RemoteAddr)
				return nil, authn.Errorf("invalid auth header")
			}

			slog.Debug("Using development App Check token", "env", env)
			return &AppCheckAuthenticatedUser{
				AppID:   "test-" + env,
				Subject: "test-subject-" + env,
			}, nil
		}

		// Extract the Firebase App Check token from the X-Firebase-AppCheck header
		appCheckToken := req.Header.Get("X-Firebase-AppCheck")
		if appCheckToken == "" {
			slog.Warn("Missing App Check token in request", "remote_addr", req.RemoteAddr, "method", req.Method, "path", req.URL.Path)
			return nil, authn.Errorf("missing auth header")
		}

		// SECURITY: Minimal token validation logging
		// Don't log token contents to avoid information disclosure
		parts := strings.Split(appCheckToken, ".")
		if len(parts) != 3 {
			slog.Warn("Invalid App Check token format", "parts_count", len(parts))
		} else {
			slog.Debug("App Check token format valid")
		}

		// Verify the App Check token directly with Firebase
		slog.Info("Verifying App Check token", "remote_addr", req.RemoteAddr, "path", req.URL.Path)
		appCheckTokenInfo, err := appCheckClient.VerifyToken(appCheckToken)
		if err != nil {
			slog.Error("App Check authentication failed",
				"error", err,
				"error_type", err.Error(),
				"remote_addr", req.RemoteAddr,
				"path", req.URL.Path)
			return nil, authn.Errorf("invalid App Check token: %v", err)
		}

		// Create an authenticated user from the App Check token info
		user := &AppCheckAuthenticatedUser{
			AppID:   appCheckTokenInfo.AppID,
			Subject: appCheckTokenInfo.Subject,
		}

		slog.Debug("Request authenticated via App Check",
			"subject", user.Subject,
			"app_id", user.AppID,
			"remote_addr", req.RemoteAddr,
			"method", req.Method,
			"path", req.URL.Path)

		// Return the authenticated user info (will be available in Connect handlers via authn.GetInfo)
		return user, nil
	})
}
