package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"connectrpc.com/authn"
	"firebase.google.com/go/v4/appcheck"
)

// AppCheckAuthenticatedUser represents a user authenticated via Firebase App Check
type AppCheckAuthenticatedUser struct {
	AppID   string
	Subject string
}

// AppCheckMiddleware creates authentication middleware using Firebase App Check directly
func AppCheckMiddleware(appCheckClient *appcheck.Client) *authn.Middleware {
	return authn.NewMiddleware(func(ctx context.Context, req *http.Request) (any, error) {
		// Extract the Firebase App Check token from the X-Firebase-AppCheck header
		appCheckToken := req.Header.Get("X-Firebase-AppCheck")
		if appCheckToken == "" {
			return nil, authn.Errorf("missing X-Firebase-AppCheck header")
		}

		// Verify the App Check token directly with Firebase
		appCheckTokenInfo, err := appCheckClient.VerifyToken(appCheckToken)
		if err != nil {
			slog.Warn("App Check authentication failed", "error", err, "remote_addr", req.RemoteAddr)
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
