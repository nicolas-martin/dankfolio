package util

import (
	"fmt"
	"log/slog"
	"strings"

	"connectrpc.com/connect"
)

// SanitizeError logs the full error internally but returns a sanitized version to the client
// This prevents information disclosure while maintaining debugging capability
func SanitizeError(operation string, err error, code connect.Code) error {
	// Log the full error for debugging
	slog.Error(fmt.Sprintf("Operation failed: %s", operation), "error", err)

	// Return sanitized error to client based on error type
	switch code {
	case connect.CodeInvalidArgument:
		// For validation errors, we can be more specific
		return connect.NewError(code, fmt.Errorf("%s: invalid request parameters", operation))
	case connect.CodeNotFound:
		return connect.NewError(code, fmt.Errorf("%s: requested resource not found", operation))
	case connect.CodeAlreadyExists:
		return connect.NewError(code, fmt.Errorf("%s: resource already exists", operation))
	case connect.CodePermissionDenied:
		return connect.NewError(code, fmt.Errorf("%s: permission denied", operation))
	case connect.CodeUnauthenticated:
		return connect.NewError(code, fmt.Errorf("%s: authentication required", operation))
	case connect.CodeResourceExhausted:
		return connect.NewError(code, fmt.Errorf("%s: rate limit exceeded", operation))
	case connect.CodeFailedPrecondition:
		return connect.NewError(code, fmt.Errorf("%s: precondition failed", operation))
	case connect.CodeAborted:
		return connect.NewError(code, fmt.Errorf("%s: operation aborted", operation))
	case connect.CodeOutOfRange:
		return connect.NewError(code, fmt.Errorf("%s: value out of range", operation))
	case connect.CodeUnimplemented:
		return connect.NewError(code, fmt.Errorf("%s: operation not implemented", operation))
	case connect.CodeInternal:
		// For internal errors, be generic
		return connect.NewError(code, fmt.Errorf("%s failed", operation))
	case connect.CodeUnavailable:
		return connect.NewError(code, fmt.Errorf("%s: service temporarily unavailable", operation))
	case connect.CodeDataLoss:
		return connect.NewError(code, fmt.Errorf("%s: data integrity issue", operation))
	default:
		// Default to internal error
		return connect.NewError(connect.CodeInternal, fmt.Errorf("%s failed", operation))
	}
}

// IsUserError checks if an error should be shown to the user as-is
// Some errors like validation errors can be shown directly
func IsUserError(err error) bool {
	if err == nil {
		return false
	}

	errMsg := strings.ToLower(err.Error())

	// These error types are safe to show to users
	userSafePatterns := []string{
		"invalid address",
		"insufficient balance",
		"insufficient funds",
		"amount must be",
		"required",
		"not found",
		"already exists",
		"permission denied",
		"unauthorized",
		"rate limit",
		"too many requests",
		"invalid request",
		"validation failed",
	}

	for _, pattern := range userSafePatterns {
		if strings.Contains(errMsg, pattern) {
			return true
		}
	}

	return false
}

// SanitizeErrorMessage returns a user-friendly error message
// It checks if the error is safe to show directly or needs sanitization
func SanitizeErrorMessage(err error, defaultMessage string) string {
	if err == nil {
		return defaultMessage
	}

	if IsUserError(err) {
		return err.Error()
	}

	// Log the actual error for debugging
	slog.Error("Sanitized error", "original_error", err.Error())

	return defaultMessage
}

