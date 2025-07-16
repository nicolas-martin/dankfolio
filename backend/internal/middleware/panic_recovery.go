package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"runtime/debug"

	"connectrpc.com/connect"
)

// PanicRecoveryInterceptor creates an interceptor that recovers from panics and logs them as errors
func PanicRecoveryInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (resp connect.AnyResponse, err error) {
			// Defer a recovery function to catch panics
			defer func() {
				if r := recover(); r != nil {
					// Get stack trace
					stack := debug.Stack()
					
					// Log the panic as an ERROR with full details
					slog.Error("🔥 PANIC in gRPC handler",
						slog.String("procedure", req.Spec().Procedure),
						slog.String("peer", req.Peer().Addr),
						slog.Any("panic", r),
						slog.String("stack", string(stack)),
					)
					
					// Convert panic to a proper error response
					err = connect.NewError(
						connect.CodeInternal,
						fmt.Errorf("internal server error: %v", r),
					)
					resp = nil
				}
			}()
			
			// Call the next handler
			return next(ctx, req)
		}
	}
	return interceptor
}