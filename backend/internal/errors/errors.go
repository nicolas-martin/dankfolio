package errors

import (
	"fmt"
	"net/http"
)

type ErrorType string

const (
	ErrorTypeValidation   ErrorType = "VALIDATION_ERROR"
	ErrorTypeAuth         ErrorType = "AUTH_ERROR"
	ErrorTypeNotFound     ErrorType = "NOT_FOUND"
	ErrorTypeInternal     ErrorType = "INTERNAL_ERROR"
	ErrorTypeRateLimit    ErrorType = "RATE_LIMIT_ERROR"
	ErrorTypeUnavailable  ErrorType = "SERVICE_UNAVAILABLE"
	ErrorTypeTransaction  ErrorType = "TRANSACTION_ERROR"
)

type AppError struct {
	Type      ErrorType `json:"type"`
	Message   string    `json:"message"`
	Code      int       `json:"-"`
	Err       error     `json:"-"`
	RequestID string    `json:"request_id,omitempty"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewValidationError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Code:    http.StatusBadRequest,
	}
}

func NewAuthError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeAuth,
		Message: message,
		Code:    http.StatusUnauthorized,
	}
}

func NewNotFoundError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeNotFound,
		Message: message,
		Code:    http.StatusNotFound,
	}
}

func NewInternalError(err error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Message: "An internal error occurred",
		Code:    http.StatusInternalServerError,
		Err:     err,
	}
}

func NewTransactionError(message string, err error) *AppError {
	return &AppError{
		Type:    ErrorTypeTransaction,
		Message: message,
		Code:    http.StatusBadRequest,
		Err:     err,
	}
} 