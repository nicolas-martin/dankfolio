package offchain

import (
	"context"
	// "fmt" // Removed as it's unused
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestVerifyDirectImageAccess(t *testing.T) {
	defaultClient := NewClient(&http.Client{Timeout: 5 * time.Second})

	tests := []struct {
		name                string
		handler             http.HandlerFunc
		serverSetup         func(*httptest.Server) string // returns URL to use
		client              ClientAPI
		ctx                 context.Context
		expectedIsValid     bool
		expectedReasonOrURL string // For success, this is the input URL. For failures, a reason string.
		expectError         bool
		errorContains       string // Substring to check in error message
	}{
		{
			name: "Success Case - Valid Image",
			handler: func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodHead {
					http.Error(w, "Expected HEAD request", http.StatusMethodNotAllowed)
					return
				}
				w.Header().Set("Content-Type", "image/png")
				w.WriteHeader(http.StatusOK)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     true,
			// expectedReasonOrURL is dynamic (the server URL), will check against inputURL in test
			expectError:         false,
		},
		{
			name: "Non-Image Content-Type",
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "non_image_content_type",
			expectError:         true,
			errorContains:       "non-image content type",
		},
		{
			name: "Redirect Attempted - 301",
			handler: func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "/other-page", http.StatusMovedPermanently)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "redirect_attempted",
			expectError:         true,
			errorContains:       "redirect status code 301",
		},
		{
			name: "Redirect Attempted - 302",
			handler: func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "/other-page", http.StatusFound)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "redirect_attempted",
			expectError:         true,
			errorContains:       "redirect status code 302",
		},
		{
			name: "Non-200 Status - 404 Not Found",
			handler: func(w http.ResponseWriter, r *http.Request) {
				http.NotFound(w, r)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "non_200_status",
			expectError:         true,
			errorContains:       "non-200 status for",
		},
		{
			name: "Non-200 Status - 500 Internal Server Error",
			handler: func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "non_200_status",
			expectError:         true,
			errorContains:       "non-200 status for",
		},
		{
			name: "Network Error - Unroutable URL",
			serverSetup: func(s *httptest.Server) string { return "http://invalid.domain-that-does-not-exist-ever-foo-bar" },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "network_error",
			expectError:         true,
			errorContains:       "http request failed",
		},
		{
			name: "Malformed URL - Scheme Missing", // http.NewRequestWithContext will catch this
			serverSetup: func(s *httptest.Server) string { return "://no.scheme" },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "request_creation_failed",
			expectError:         true,
			errorContains:       "failed to create request",
		},
		{
			name: "Malformed URL - Invalid Character", // http.NewRequestWithContext will catch this
			serverSetup: func(s *httptest.Server) string { return "http://host with space.com" },
			client:      defaultClient,
			ctx:         context.Background(),
			expectedIsValid:     false,
			expectedReasonOrURL: "request_creation_failed",
			expectError:         true,
			errorContains:       "failed to create request",
		},
		{
			name: "Context Timeout",
			handler: func(w http.ResponseWriter, r *http.Request) {
				time.Sleep(100 * time.Millisecond) // Sleep longer than context timeout
				w.WriteHeader(http.StatusOK)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx: func() context.Context {
				c, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
				// No defer cancel() here as the test runner handles context, but in real code, always cancel.
				// For this test, the timeout is the primary mechanism.
				_ = cancel // avoid unused error
				return c
			}(),
			expectedIsValid:     false,
			expectedReasonOrURL: "network_error", // Context deadline exceeded is a type of network error for this func
			expectError:         true,
			errorContains:       "context deadline exceeded",
		},
		{
			name: "Context Cancelled",
			handler: func(w http.ResponseWriter, r *http.Request) {
				time.Sleep(100 * time.Millisecond)
				w.WriteHeader(http.StatusOK)
			},
			serverSetup: func(s *httptest.Server) string { return s.URL },
			client:      defaultClient,
			ctx: func() context.Context {
				c, cancel := context.WithCancel(context.Background())
				cancel() // Cancel immediately
				return c
			}(),
			expectedIsValid:     false,
			expectedReasonOrURL: "network_error", // Context canceled is a type of network error
			expectError:         true,
			errorContains:       "context canceled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var server *httptest.Server
			if tt.handler != nil {
				server = httptest.NewServer(tt.handler)
				defer server.Close()
			}
			
			urlToTest := tt.serverSetup(server)

			isValid, reasonOrURL, err := tt.client.VerifyDirectImageAccess(tt.ctx, urlToTest)

			if isValid != tt.expectedIsValid {
				t.Errorf("Expected isValid to be %v, but got %v", tt.expectedIsValid, isValid)
			}

			if tt.expectedIsValid { // Success case specific check for reasonOrURL
				if reasonOrURL != urlToTest {
					t.Errorf("Expected reasonOrURL to be '%s' on success, but got '%s'", urlToTest, reasonOrURL)
				}
			} else { // Failure case specific check for reasonOrURL
				if reasonOrURL != tt.expectedReasonOrURL {
					t.Errorf("Expected reasonOrURL to be '%s', but got '%s'", tt.expectedReasonOrURL, reasonOrURL)
				}
			}

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected an error, but got nil")
				} else if tt.errorContains != "" && !strings.Contains(err.Error(), tt.errorContains) {
					t.Errorf("Error message '%s' does not contain expected substring '%s'", err.Error(), tt.errorContains)
				}
			} else {
				if err != nil {
					t.Errorf("Did not expect an error, but got: %v", err)
				}
			}
		})
	}
}
