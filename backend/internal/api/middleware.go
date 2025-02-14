package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
)

type responseWriter struct {
	http.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func DetailedLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a copy of the request body
		var reqBody string
		if r.Body != nil && !strings.Contains(r.URL.Path, "/health") {
			bodyBytes, _ := io.ReadAll(r.Body)
			reqBody = string(bodyBytes)
			// Restore the body for the actual handler
			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Create a custom response writer to capture the response
		buf := &bytes.Buffer{}
		rw := &responseWriter{
			ResponseWriter: w,
			body:           buf,
		}

		// Call the next handler
		next.ServeHTTP(rw, r)

		// Log the full request and response details
		logEntry := map[string]interface{}{
			"method":    r.Method,
			"url":       r.URL.String(),
			"reqBody":   reqBody,
			"respBody":  buf.String(),
			"userAgent": r.UserAgent(),
		}

		if !strings.Contains(r.URL.Path, "/health") {
			logJSON, _ := json.Marshal(logEntry)
			log.Printf("📝 API Call: %s", string(logJSON))
		}
	})
}
