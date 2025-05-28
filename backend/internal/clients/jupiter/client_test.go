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
	expectedCoins := []CoinListInfo{
		{Address: "token1", Name: "Token One", Symbol: "ONE", LogoURI: "http://example.com/one.png", Tags: []string{"tag1", "tag2"}, Decimals: 6},
		{Address: "token2", Name: "Token Two", Symbol: "TWO", LogoURI: "http://example.com/two.png", Tags: []string{"tag3"}, Decimals: 9},
	}
	// Note: The /v1/new endpoint returns a direct slice []CoinListInfo, not CoinListResponse
	mockBody, err := json.Marshal(expectedCoins)
	require.NoError(t, err, "Failed to marshal expectedCoins")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write(mockBody)
		require.NoError(t, err, "Failed to write response body")
	}))
	defer server.Close()

	httpClient := server.Client()                   // Use the test server's client
	client := NewClient(httpClient, server.URL, "") // Use server.URL as baseURL

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx)

	require.NoError(t, err, "GetNewCoins should not return an error on success")
	require.NotNil(t, resp, "Response should not be nil on success")
	require.Equal(t, len(expectedCoins), len(resp.Coins), "Number of coins should match")

	for i, expected := range expectedCoins {
		assert.Equal(t, expected.Address, resp.Coins[i].Address, "Coin address should match")
		assert.Equal(t, expected.Name, resp.Coins[i].Name, "Coin name should match")
		assert.Equal(t, expected.Symbol, resp.Coins[i].Symbol, "Coin symbol should match")
		assert.Equal(t, expected.LogoURI, resp.Coins[i].LogoURI, "Coin LogoURI should match")
		assert.Equal(t, expected.Tags, resp.Coins[i].Tags, "Coin Tags should match")
		assert.Equal(t, expected.Decimals, resp.Coins[i].Decimals, "Coin Decimals should match")
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
	client := NewClient(httpClient, server.URL, "")

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx)

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
	client := NewClient(httpClient, server.URL, "")

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx)

	require.Error(t, err, "GetNewCoins should return an error on malformed JSON")
	require.Nil(t, resp, "Response should be nil on error")
	// The actual error comes from c.GetRequest -> json.Unmarshal
	// The GetNewCoins function wraps this error.
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	assert.Contains(t, err.Error(), "failed to unmarshal response", "Error message should indicate JSON unmarshalling issue")
}

func TestClient_GetNewCoins_EmptyList(t *testing.T) {
	// Note: The /v1/new endpoint returns a direct slice []CoinListInfo, not CoinListResponse
	var expectedCoins []CoinListInfo // Empty slice
	mockBody, err := json.Marshal(expectedCoins)
	require.NoError(t, err, "Failed to marshal empty expectedCoins")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, newTokensEndpoint, r.URL.Path, "Request path should match newTokensEndpoint")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write(mockBody)
		require.NoError(t, err, "Failed to write empty list response body")
	}))
	defer server.Close()

	httpClient := server.Client()
	client := NewClient(httpClient, server.URL, "")

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx)

	require.NoError(t, err, "GetNewCoins should not return an error for an empty list")
	require.NotNil(t, resp, "Response should not be nil for an empty list")
	assert.Empty(t, resp.Coins, "Coins slice should be empty")
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

	httpClient := &http.Client{}                   // Use a default http client
	client := NewClient(httpClient, serverURL, "") // Point to the now-closed server URL

	ctx := context.Background()
	resp, err := client.GetNewCoins(ctx)

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
	client := NewClient(httpClient, server.URL, "")

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel context immediately

	resp, err := client.GetNewCoins(ctx)

	require.Error(t, err, "GetNewCoins should return an error if context is cancelled")
	require.Nil(t, resp, "Response should be nil on context cancellation")
	assert.Contains(t, err.Error(), "failed to fetch new token list", "Error message should indicate fetch failure")
	// The underlying error from c.GetRequest -> http.NewRequestWithContext or httpClient.Do
	assert.Contains(t, err.Error(), context.Canceled.Error(), "Error message should indicate context cancellation")
}
