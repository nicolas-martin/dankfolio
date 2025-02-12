package middleware

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"github.com/nicolas-martin/dankfolio/internal/logger"
	"github.com/nicolas-martin/dankfolio/internal/errors"
)

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := uuid.New().String()
		ctx := logger.WithRequestID(r.Context(), requestID)

		// Add request ID to response headers
		w.Header().Set("X-Request-ID", requestID)

		// Create a response wrapper to capture the status code
		rw := &responseWriter{ResponseWriter: w}

		logger.Info(ctx, "Request started",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("user_agent", r.UserAgent()),
		)

		next.ServeHTTP(rw, r.WithContext(ctx))

		duration := time.Since(start)
		logger.Info(ctx, "Request completed",
			zap.Int("status", rw.status),
			zap.Duration("duration", duration),
			zap.Int64("response_size", rw.size),
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
	size   int64
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	size, err := rw.ResponseWriter.Write(b)
	rw.size += int64(size)
	return size, err
}

func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				ctx := r.Context()
				logger.Error(ctx, "Panic recovered", err.(error),
					zap.Stack("stack"),
				)

				appErr := errors.NewInternalError(err.(error))
				respondError(w, appErr)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

func respondError(w http.ResponseWriter, err *errors.AppError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.Code)
	json.NewEncoder(w).Encode(err)
} 