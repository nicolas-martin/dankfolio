package common

import "context"

type ContextKey string

const (
	RequestIDKey ContextKey = "request_id"
)

// GetRequestID retrieves the request ID from the context
func GetRequestID(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return requestID
	}
	return ""
}
