package jupiter

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_GetNewCoins_Success(t *testing.T) {
	expectedNewTokens := []NewTokenInfo{
		{Mint: "token1", Name: "Token One", Symbol: "ONE", LogoURI: "http://example.com/one.png", Decimals: 6},
		{Mint: "token2", Name: "Token Two", Symbol: "TWO", LogoURI: "http://example.com/two.png", Decimals: 9},
	}
	// The /v1/new endpoint returns a direct slice []NewTokenInfo
	mockBody, err := json.Marshal(expectedNewTokens)
	require.NoError(t, err, "Failed to marshal expectedNewTokens")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write(mockBody)
		require.NoError(t, err, "Failed to write response body")
	}))
	defer server.Close()

	httpClient := server.Client()                        // Use the test server's client
	client := NewClient(httpClient, server.URL, "", nil) // Use server.URL as baseURL, nil for tracker

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx, nil)

	require.NoError(t, err, "GetNewCoins should not return an error on success")
	require.NotNil(t, resp, "Response should not be nil on success")
	require.Equal(t, len(expectedNewTokens), len(resp), "Number of coins should match")

	for i, expectedNewToken := range expectedNewTokens {
		// Test the converted values
		// resp[i] is of type *NewTokenInfo
		assert.Equal(t, expectedNewToken.Mint, resp[i].Mint, "Coin address should match mint")
		assert.Equal(t, expectedNewToken.Name, resp[i].Name, "Coin name should match")
		assert.Equal(t, expectedNewToken.Symbol, resp[i].Symbol, "Coin symbol should match")
		assert.Equal(t, expectedNewToken.LogoURI, resp[i].LogoURI, "Coin LogoURI should match")
		// NewTokenInfo doesn't have Tags field directly, this was an error in the original test logic
		// if we need to test tags, we'd have to convert NewTokenInfo to CoinListInfo or model.Coin first
		// assert.Equal(t, []string{}, resp[i].Tags, "Coin Tags should be empty for new tokens")
		assert.Equal(t, expectedNewToken.Decimals, resp[i].Decimals, "Coin Decimals should match")
	}
}

func TestClient_GetNewCoins_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusInternalServerError)
		_, err := w.Write([]byte("Internal Server Error"))
		require.NoError(t, err, "Failed to write error response body")
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "", nil) // nil for tracker

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx, nil)

	require.Error(t, err, "GetNewCoins should return an error on HTTP 500")
	require.Nil(t, resp, "Response should be nil on error")
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	assert.Contains(t, err.Error(), "status code: 500", "Error message should contain status code")
	assert.Contains(t, err.Error(), "Internal Server Error", "Error message should contain response body")
}

func TestClient_GetNewCoins_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(`{"coins": [{"address": "token1", "name": "Token One", "symbol": "ONE"},{]`)) // Malformed JSON
		require.NoError(t, err, "Failed to write malformed JSON response body")
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "", nil) // nil for tracker

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx, nil)

	require.Error(t, err, "GetNewCoins should return an error on malformed JSON")
	require.Nil(t, resp, "Response should be nil on error")
	// The actual error comes from c.GetRequest -> json.Unmarshal
	// The GetNewCoins function wraps this error.
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	assert.Contains(t, err.Error(), "failed to unmarshal response", "Error message should indicate JSON unmarshalling issue")
}

func TestClient_GetNewCoins_EmptyList(t *testing.T) {
	// Note: The /v1/new endpoint returns a direct slice []NewTokenInfo
	var expectedNewTokens []NewTokenInfo // Empty slice
	mockBody, err := json.Marshal(expectedNewTokens)
	require.NoError(t, err, "Failed to marshal empty expectedNewTokens")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write(mockBody)
		require.NoError(t, err, "Failed to write empty list response body")
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "", nil) // nil for tracker

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx, nil)

	require.NoError(t, err, "GetNewCoins should not return an error for an empty list")
	require.NotNil(t, resp, "Response should not be nil for an empty list")
	assert.Empty(t, resp, "Coins slice should be empty")
}

// TestClient_GetNewCoins_NetworkError simulates a network error by not starting the server.
// This test is a bit more involved as the http client will fail before even making a request.
func TestClient_GetNewCoins_NetworkError(t *testing.T) {
	// Create a server but close it immediately to simulate a network error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// This handler should not be called
		t.Error("Server handler should not be called for network error test")
	}))
	serverURL := server.URL // Store the URL
	server.Close()          // Close the server

	httpClient := &http.Client{}                        // Use a default http client
	client := NewClient(httpClient, serverURL, "", nil) // Point to the now-closed server URL, nil for tracker

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx, nil)

	require.Error(t, err, "GetNewCoins should return an error on network error")
	require.Nil(t, resp, "Response should be nil on network error")
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	// The underlying error from c.GetRequest -> httpClient.Do will be something like "connection refused"
	assert.Contains(t, err.Error(), "connect: connection refused", "Error message should indicate a connection issue or similar network problem")
}

// TestClient_GetNewCoins_ContextCancelled tests behavior when context is cancelled.
func TestClient_GetNewCoins_ContextCancelled(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond) // Ensure the request takes some time
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(`[]`)) // Empty list is fine
		require.NoError(t, err)
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "", nil) // nil for tracker

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel context immediately

	resp, err := client.GetNewCoins(ctx, nil)

	require.Error(t, err, "GetNewCoins should return an error if context is cancelled")
	require.Nil(t, resp, "Response should be nil on context cancellation")
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	// The underlying error from c.GetRequest -> http.NewRequestWithContext or httpClient.Do
	assert.Contains(t, err.Error(), context.Canceled.Error(), "Error message should indicate context cancellation")
}

// TestClient_GetNewCoins_WithPagination tests the pagination functionality
func TestClient_GetNewCoins_WithPagination(t *testing.T) {
	expectedNewTokens := []NewTokenInfo{
		{Mint: "token1", Name: "Token One", Symbol: "ONE", LogoURI: "http://example.com/one.png", Decimals: 6},
		{Mint: "token2", Name: "Token Two", Symbol: "TWO", LogoURI: "http://example.com/two.png", Decimals: 9},
	}
	mockBody, err := json.Marshal(expectedNewTokens)
	require.NoError(t, err, "Failed to marshal expectedNewTokens")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")

		// Check that query parameters are present
		query := r.URL.Query()
		assert.Equal(t, "10", query.Get("limit"), "Limit parameter should be set")
		assert.Equal(t, "20", query.Get("offset"), "Offset parameter should be set")

		w.WriteHeader(http.StatusOK)
		_, err := w.Write(mockBody)
		require.NoError(t, err, "Failed to write response body")
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "", nil) // nil for tracker

	ctx := context.Background()
	limit := int(10)
	offset := int(20)
	params := &NewCoinsParams{
		Limit:  limit,
		Offset: offset,
	}

	resp, err := client.GetNewCoins(ctx, params)

	require.NoError(t, err, "GetNewCoins should not return an error with pagination params")
	require.NotNil(t, resp, "Response should not be nil")
	require.Equal(t, len(expectedNewTokens), len(resp), "Number of coins should match")
}
