package middleware

import (
	"context"

	"connectrpc.com/connect"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

// GRPCDebugModeInterceptor sets debug mode in context if x-debug-mode header is present
func GRPCDebugModeInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			if req.Header().Get("x-debug-mode") == "true" {
				ctx = context.WithValue(ctx, model.DebugModeKey, true)
			}
			return next(ctx, req)
		}
	}
}
