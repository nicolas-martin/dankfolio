package clients

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
)

// HTTPDoer interface for http.Client compatibility
type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// InstrumentedHTTPClient wraps an HTTP client with OpenTelemetry instrumentation
type InstrumentedHTTPClient struct {
	client      HTTPDoer
	serviceName string
	tracker     *tracker.APITracker
}

// NewInstrumentedHTTPClient creates a new instrumented HTTP client
func NewInstrumentedHTTPClient(client HTTPDoer, serviceName string, tracker *tracker.APITracker) *InstrumentedHTTPClient {
	return &InstrumentedHTTPClient{
		client:      client,
		serviceName: serviceName,
		tracker:     tracker,
	}
}

// Do executes an HTTP request with OpenTelemetry instrumentation
func (c *InstrumentedHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if c.tracker == nil {
		// Fallback to regular HTTP call if no tracker
		return c.client.Do(req)
	}

	ctx := req.Context()
	endpointName := req.URL.Path
	if endpointName == "" {
		endpointName = "/"
	}

	// Start span
	spanName := fmt.Sprintf("%s %s", req.Method, endpointName)
	ctx, span := c.tracker.StartSpan(ctx, c.serviceName, spanName)
	defer func() {
		c.tracker.EndSpan(span, nil, c.serviceName)
	}()

	// Set span attributes
	span.SetAttributes(
		attribute.String("http.method", req.Method),
		attribute.String("http.url", req.URL.String()),
		attribute.String("http.host", req.URL.Host),
		attribute.String("http.scheme", req.URL.Scheme),
		attribute.String("http.target", req.URL.Path),
		attribute.String("service.name", c.serviceName),
	)

	// Track the call
	c.tracker.TrackCallWithContext(ctx, c.serviceName, endpointName)

	// Update request context
	req = req.WithContext(ctx)
	
	// Inject trace context into HTTP headers for distributed tracing
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))

	// Record timing
	start := time.Now()

	// Execute request
	resp, err := c.client.Do(req)

	// Record duration
	duration := time.Since(start)
	c.tracker.RecordDuration(ctx, c.serviceName, endpointName, duration)

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.tracker.EndSpan(span, err, c.serviceName)
		return nil, err
	}

	// Set response attributes
	span.SetAttributes(
		attribute.Int("http.status_code", resp.StatusCode),
		attribute.Int64("http.response_content_length", resp.ContentLength),
	)

	// Set span status based on HTTP status code
	if resp.StatusCode >= 400 {
		span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", resp.StatusCode))
	} else {
		span.SetStatus(codes.Ok, "")
	}

	return resp, nil
}

// InstrumentHTTPRequest is a generic function to instrument any HTTP request
func InstrumentHTTPRequest[T any](
	ctx context.Context,
	tracker *tracker.APITracker,
	serviceName string,
	endpointName string,
	executeRequest func(context.Context) (*T, error),
) (*T, error) {
	if tracker == nil {
		// Fallback to regular execution if no tracker
		return executeRequest(ctx)
	}

	var result *T
	err := tracker.InstrumentCall(ctx, serviceName, endpointName, func(ctx context.Context) error {
		var err error
		result, err = executeRequest(ctx)
		return err
	})

	return result, err
}

// InstrumentHTTPRequestWithResponse is similar but returns response body as well
func InstrumentHTTPRequestWithResponse[T any](
	ctx context.Context,
	tracker *tracker.APITracker,
	serviceName string,
	endpointName string,
	executeRequest func(context.Context) (T, []byte, error),
) (T, []byte, error) {
	if tracker == nil {
		// Fallback to regular execution if no tracker
		return executeRequest(ctx)
	}

	var result T
	var respBody []byte

	err := tracker.InstrumentCall(ctx, serviceName, endpointName, func(ctx context.Context) error {
		var err error
		result, respBody, err = executeRequest(ctx)
		return err
	})

	return result, respBody, err
}

// ExtractEndpointName extracts a clean endpoint name from a URL
func ExtractEndpointName(urlStr string) string {
	// This can be customized per service
	// For example, Jupiter might want to collapse /tokens/v1/token/* to /tokens/v1/token
	return urlStr
}

// WrapHTTPClient wraps a standard http.Client with instrumentation
func WrapHTTPClient(client *http.Client, serviceName string, tracker *tracker.APITracker) HTTPDoer {
	if tracker == nil {
		return client
	}
	return NewInstrumentedHTTPClient(client, serviceName, tracker)
}

// ResponseWrapper helps capture response body while still allowing it to be read
type ResponseWrapper struct {
	*http.Response
	Body io.ReadCloser
}

func (rw *ResponseWrapper) Read(p []byte) (n int, err error) {
	return rw.Body.Read(p)
}

func (rw *ResponseWrapper) Close() error {
	return rw.Body.Close()
}

