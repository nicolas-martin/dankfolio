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

const (
	boxTop    = "┌─── %s "
	boxMiddle = "├─── %s "
	boxBottom = "└─── %s "
	boxLine   = "│ "
	boxFill   = "─"
)

// RequestLogger returns a middleware that logs HTTP requests in a colorful and informative format
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		// Format duration based on scale
		var durationStr string
		if duration.Milliseconds() > 0 {
			durationStr = fmt.Sprintf("%dms", duration.Milliseconds())
		} else {
			durationStr = fmt.Sprintf("%dµs", duration.Microseconds())
		}

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

		// Print box top
		printBoxLine(boxTop, "Request", 80)

		// Print request info
		fmt.Printf("%s%s │ %s │ %s %s %s │ %s\n",
			boxLine,
			time.Now().Format("2006/01/02 15:04:05"),
			methodColor.Sprint(fmt.Sprintf("%-7s", r.Method)),
			r.Host,
			// r.URL.Path,
			r.URL.String(),
			statusColor.Sprintf("%d", ww.Status()),
			durationStr,
		)

		// Log request body if present
		if len(reqBody) > 0 {
			printBoxLine(boxMiddle, "Request Body", 80)
			if isJSON(reqBody) {
				var prettyJSON bytes.Buffer
				if err := json.Indent(&prettyJSON, reqBody, "", "  "); err == nil {
					// Split the JSON by lines and prefix each line
					lines := strings.Split(prettyJSON.String(), "\n")
					for _, line := range lines {
						if line != "" {
							fmt.Printf("%s%s\n", boxLine, line)
						}
					}
				}
			} else {
				fmt.Printf("%s%s\n", boxLine, string(reqBody))
			}
		}

		// Log response body if captured
		if len(ww.body) > 0 {
			printBoxLine(boxMiddle, "Response Body", 80)
			if isJSON(ww.body) {
				var prettyJSON bytes.Buffer
				if err := json.Indent(&prettyJSON, ww.body, "", "  "); err == nil {
					// Split the JSON by lines and prefix each line
					lines := strings.Split(prettyJSON.String(), "\n")
					for _, line := range lines {
						if line != "" {
							fmt.Printf("%s%s\n", boxLine, line)
						}
					}
				}
			} else {
				fmt.Printf("%s%s\n", boxLine, string(ww.body))
			}
		}

		// Print box bottom
		printBoxLine(boxBottom, "End", 80)
	})
}

// printBoxLine prints a box line with the given format and title
func printBoxLine(format, title string, width int) {
	fmt.Printf(format, title)
	remaining := width - len(title) - len(format) + 2 // +2 for %s
	for i := 0; i < remaining; i++ {
		fmt.Print(boxFill)
	}
	fmt.Println()
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
