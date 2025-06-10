package util

import "strings"

// IsHTMLResponse checks if the response body appears to be HTML
// This is useful for detecting when APIs return HTML error pages instead of JSON
func IsHTMLResponse(body []byte) bool {
	if len(body) == 0 {
		return false
	}

	bodyStr := strings.ToLower(string(body))
	return strings.Contains(bodyStr, "<!doctype html") ||
		strings.Contains(bodyStr, "<html") ||
		strings.Contains(bodyStr, "<head>") ||
		strings.Contains(bodyStr, "<body>")
}

// TruncateForLogging truncates a string for logging purposes to avoid overwhelming logs
// with large response bodies, especially HTML pages
func TruncateForLogging(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength] + "... (truncated)"
}
