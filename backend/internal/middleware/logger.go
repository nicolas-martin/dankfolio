package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/fatih/color"
)

// RequestLogger returns a middleware that logs HTTP requests in a colorful and informative format
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Add a divider between requests
		fmt.Println("----------------------------------------")
		start := time.Now()

		// Create response wrapper
		ww := NewWrapResponseWriter(w)

		// Read and restore the body for logging
		var reqBody []byte
		if r.Body != nil && !strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
			reqBody, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewBuffer(reqBody))
		}

		// Process request
		next.ServeHTTP(ww, r)

		// Calculate duration
		duration := time.Since(start)
		durationStr := duration.String()

		// Color status code based on range
		statusColor := color.New(color.Bold)
		switch {
		case ww.Status() >= 500:
			statusColor = color.New(color.FgRed, color.Bold)
		case ww.Status() >= 400:
			statusColor = color.New(color.FgYellow, color.Bold)
		case ww.Status() >= 300:
			statusColor = color.New(color.FgCyan, color.Bold)
		case ww.Status() >= 200:
			statusColor = color.New(color.FgGreen, color.Bold)
		}

		// Color method
		methodColor := color.New(color.FgBlue, color.Bold)

		// Print request line
		cacheStatus := w.Header().Get("X-Cache")
		cacheColor := color.New(color.FgGreen)
		cacheStr := ""
		if cacheStatus == "HIT" {
			cacheStr = cacheColor.Sprint("[cache:HIT]")
		}

		fmt.Printf("%s %s %s %s %s\n",
			methodColor.Sprint(fmt.Sprintf("%-7s", r.Method)),
			cacheStr,
			r.URL.String(),
			statusColor.Sprintf("%d", ww.Status()),
			durationStr,
		)

		// Log response body if it's JSON
		if len(ww.body) > 0 && isJSON(ww.body) {
			var prettyJSON bytes.Buffer
			if err := json.Indent(&prettyJSON, ww.body, "", "  "); err == nil {
				fmt.Println(prettyJSON.String())
			}
		}

		// Add a divider between requests
		fmt.Println("----------------------------------------")
	})
}

// isJSON checks if the byte slice is valid JSON
func isJSON(data []byte) bool {
	var js json.RawMessage
	return json.Unmarshal(data, &js) == nil
}

// ResponseWriter wrapper to capture status code and response body
type WrapResponseWriter struct {
	http.ResponseWriter
	status       int
	bytesWritten int
	body         []byte
}

func NewWrapResponseWriter(w http.ResponseWriter) *WrapResponseWriter {
	return &WrapResponseWriter{ResponseWriter: w}
}

func (w *WrapResponseWriter) Status() int {
	if w.status == 0 {
		return http.StatusOK
	}
	return w.status
}

func (w *WrapResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *WrapResponseWriter) Write(b []byte) (int, error) {
	// Capture the response body
	w.body = append(w.body, b...)

	n, err := w.ResponseWriter.Write(b)
	w.bytesWritten += n
	return n, err
}

func (w *WrapResponseWriter) BytesWritten() int {
	return w.bytesWritten
}
