package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"

	"github.com/nicolas-martin/dankfolio/internal/common"
)

type responseWriter struct {
	http.ResponseWriter
	body        *bytes.Buffer
	statusCode  int
	wroteHeader bool
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(statusCode)
}

// LogRequest creates a structured log entry for the request
func LogRequest(r *http.Request, requestBody []byte) *logrus.Fields {
	headers := make(map[string]string)
	for name, values := range r.Header {
		// Skip sensitive headers
		if !strings.EqualFold(name, "Authorization") && !strings.EqualFold(name, "Cookie") {
			headers[name] = strings.Join(values, ", ")
		}
	}

	query := r.URL.Query()
	queryParams := make(map[string]string)
	for key, values := range query {
		queryParams[key] = strings.Join(values, ", ")
	}

	requestLog := &logrus.Fields{
		"request": map[string]interface{}{
			"method":      r.Method,
			"path":        r.URL.Path,
			"query":       queryParams,
			"headers":     headers,
			"host":        r.Host,
			"remote_addr": r.RemoteAddr,
			"protocol":    r.Proto,
		},
	}

	// Log request body if present and appears to be JSON
	if len(requestBody) > 0 && strings.Contains(r.Header.Get("Content-Type"), "application/json") {
		var prettyJSON bytes.Buffer
		if err := json.Indent(&prettyJSON, requestBody, "", "  "); err == nil {
			(*requestLog)["request"].(map[string]interface{})["body"] = prettyJSON.String()
		} else {
			// If not JSON, log as string
			(*requestLog)["request"].(map[string]interface{})["body"] = string(requestBody)
		}
	}

	return requestLog
}

// LogResponse creates a structured log entry for the response
func LogResponse(rw *responseWriter, duration time.Duration) *logrus.Fields {
	headers := make(map[string]string)
	for name, values := range rw.Header() {
		headers[name] = strings.Join(values, ", ")
	}

	responseData := map[string]interface{}{
		"status_code":    rw.statusCode,
		"status_text":    http.StatusText(rw.statusCode),
		"headers":        headers,
		"duration_ms":    duration.Milliseconds(),
		"duration_human": duration.String(),
	}

	// Log response body if present and appears to be JSON
	if rw.body.Len() > 0 {
		contentType := rw.Header().Get("Content-Type")
		if strings.Contains(contentType, "application/json") {
			var prettyJSON bytes.Buffer
			if err := json.Indent(&prettyJSON, rw.body.Bytes(), "", "  "); err == nil {
				responseData["body"] = prettyJSON.String()
			} else {
				// If not JSON, log as string
				responseData["body"] = rw.body.String()
			}
		}
	}

	return &logrus.Fields{
		"response": responseData,
	}
}

// DetailedRequestLogger returns a middleware that provides comprehensive logging of requests and responses
func DetailedRequestLogger() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Generate request ID
			requestID := uuid.New().String()
			ctx := context.WithValue(r.Context(), common.RequestIDKey, requestID)
			r = r.WithContext(ctx)

			// Create a copy of the request body
			var requestBody []byte
			if r.Body != nil {
				requestBody, _ = io.ReadAll(r.Body)
				r.Body = io.NopCloser(bytes.NewBuffer(requestBody))
			}

			// Create custom response writer to capture response
			buf := &bytes.Buffer{}
			rw := &responseWriter{
				ResponseWriter: w,
				body:           buf,
				statusCode:     http.StatusOK,
			}

			// Process request
			next.ServeHTTP(rw, r)

			// Calculate duration
			duration := time.Since(start)

			// Create detailed log entries
			requestLog := LogRequest(r, requestBody)
			responseLog := LogResponse(rw, duration)

			// Merge all fields
			entry := logrus.WithFields(logrus.Fields{
				"request_id": requestID,
				"timestamp":  start.Format(time.RFC3339),
			})
			entry = entry.WithFields(*requestLog)
			entry = entry.WithFields(*responseLog)

			// Log based on status code
			if rw.statusCode >= 500 {
				entry.Error("Server error")
			} else if rw.statusCode >= 400 {
				entry.Warn("Client error")
			} else {
				entry.Info("Request completed")
			}
		})
	}
}
