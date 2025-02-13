package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/nicolas-martin/dankfolio/internal/model"
	"github.com/nicolas-martin/dankfolio/internal/service"
)

type contextKey string

const (
	userIDKey contextKey = "user_id"
	userKey   contextKey = "user"
)

func WithUserID(ctx context.Context, user *model.User) context.Context {
	ctx = context.WithValue(ctx, userKey, user)
	return context.WithValue(ctx, userIDKey, user.ID)
}

func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}

func AuthMiddleware(authService *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			token := parts[1]
			user, err := authService.ValidateToken(r.Context(), token)
			if err != nil {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Add user and user ID to request context
			ctx := WithUserID(r.Context(), user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
