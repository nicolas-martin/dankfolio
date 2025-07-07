package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"

	// "os" // No longer needed here directly
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
		if env == "development" || env == "local" || env == "production-simulator" {
			if devAppCheckToken == "" {
				slog.Error("DEV_APP_CHECK_TOKEN is not set for development/local/production-simulator environment", "env", env)
				return nil, authn.Errorf("missing DEV_APP_CHECK_TOKEN configuration for environment: %s", env)
			}

			appCheckToken := req.Header.Get("X-Firebase-AppCheck")
			if appCheckToken == "" {
				slog.Warn("Missing App Check token in request", "remote_addr", req.RemoteAddr, "method", req.Method, "path", req.URL.Path)
				return nil, authn.Errorf("missing auth header")
			}
			if appCheckToken != devAppCheckToken {
				slog.Warn("Invalid App Check token for development/local/production-simulator environment", "env", env, "remote_addr", req.RemoteAddr, "method", req.Method, "path", req.URL.Path)
				return nil, authn.Errorf("invalid auth header for environment")
			}

			slog.Debug("Bypassing App Check verification due to environment setting (using DEV_APP_CHECK_TOKEN)", "env", env)
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

		// Log token details before verification (only headers and audience for security)
		parts := strings.Split(appCheckToken, ".")
		if len(parts) == 3 {
			// Log header for debugging
			headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
			if err == nil {
				slog.Debug("App Check token header", "header", string(headerBytes))
			} else {
				slog.Warn("Failed to decode App Check token header", "error", err)
			}

			// Get audience and issuer from payload for debugging
			if payloadBytes, payloadErr := base64.RawURLEncoding.DecodeString(parts[1]); payloadErr == nil {
				var payloadMap map[string]any
				if jsonErr := json.Unmarshal(payloadBytes, &payloadMap); jsonErr == nil {
					// Collect available token fields for logging
					fields := []any{"App Check token fields"}
					if aud, ok := payloadMap["aud"]; ok {
						fields = append(fields, "aud", aud)
					}
					if iss, ok := payloadMap["iss"]; ok {
						fields = append(fields, "iss", iss)
					}
					if sub, ok := payloadMap["sub"]; ok {
						fields = append(fields, "sub", sub)
					}

					// Log non-empty fields
					if len(fields) > 1 {
						slog.Info(fields[0].(string), fields[1:]...)
					}
				} else {
					slog.Warn("Failed to parse App Check token payload", "error", jsonErr)
				}
			} else {
				slog.Warn("Failed to decode App Check token payload", "error", payloadErr)
			}
		} else {
			slog.Warn("Invalid App Check token format, expected 3 parts", "parts_count", len(parts))
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
