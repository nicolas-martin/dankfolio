package offchain

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"backend/internal/util" // For StandardizeIpfsUrl behavior understanding
)

// mockServerResponse represents the response a mock server should give for a specific path.
type mockServerResponse struct {
	path         string
	body         []byte
	contentType  string
	statusCode   int
	skipBody     bool // If true, handler won't write body (e.g. for testing client handling of empty body)
	customHeader map[string]string
}

// newMockServer creates a new httptest.Server that serves predefined responses.
// responses is a map where key is path (e.g., "/ipfs/cid1") and value is mockServerResponse
func newMockServer(t *testing.T, responses map[string]mockServerResponse) *httptest.Server {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// t.Logf("Mock server received request for: %s", r.URL.Path)
		for pathSuffix, resp := range responses {
			if strings.HasSuffix(r.URL.Path, pathSuffix) {
				// t.Logf("Mock server matched path suffix: %s for request: %s", pathSuffix, r.URL.Path)
				if resp.customHeader != nil {
					for k, v := range resp.customHeader {
						w.Header().Set(k,v)
					}
				}
				if resp.contentType != "" {
					w.Header().Set("Content-Type", resp.contentType)
				}
				w.WriteHeader(resp.statusCode)
				if !resp.skipBody && resp.body != nil {
					_, err := w.Write(resp.body)
					if err != nil {
						t.Fatalf("mock server failed to write response body: %v", err)
					}
				}
				return
			}
		}
		// t.Logf("Mock server: No match found for %s, returning 404", r.URL.Path)
		http.NotFound(w, r)
	})
	return httptest.NewServer(handler)
}

func TestFetchMetadata(t *testing.T) {
	// Common expected metadata
	expectedMeta := map[string]any{"name": "Test NFT", "description": "A test NFT."}
	expectedMetaJSON, _ := json.Marshal(expectedMeta)

	// Common Arweave expected URL prefix
	arweaveGatewayPrefix := "https://arweave.net/"

	testCases := []struct {
		name            string
		uri             string
		mockResponses   map[string]mockServerResponse // Keyed by expected path Suffix
		expectedResult  map[string]any
		expectError     bool
		errorContains   string
		setupClient     func(*Client) // For specific client setup if needed
	}{
		{
			name: "Standard IPFS URI (CIDv0)",
			uri:  "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/",
			// StandardizeIpfsUrl will produce a gateway URL. Let's assume default gateway for CIDv0.
			// Actual URL will be like: "https://<default_CIDv0_gateway>/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/"
			// For testing, we'll rely on StandardizeIpfsUrl's current behavior.
			// If defaultCIDv0Gateways[0] is "https://ipfs.io/ipfs/", then path is /ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/
			mockResponses: map[string]mockServerResponse{
				"/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/": {
					body:       expectedMetaJSON,
					statusCode: http.StatusOK,
				},
			},
			expectedResult: expectedMeta,
		},
		{
			name: "Standard IPFS URI (CIDv1)",
			uri:  "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/",
			// StandardizeIpfsUrl will produce: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/"
			mockResponses: map[string]mockServerResponse{
				// The path on dweb.link for a CIDv1 without a file path is "/"
				"/": { // This will be the path for bafy...dweb.link/
					body:       expectedMetaJSON,
					statusCode: http.StatusOK,
				},
			},
			expectedResult: expectedMeta,
		},
		{
			name: "HTTP IPFS Gateway URI (Old format to be standardized)",
			uri:  "https://somegateway.com/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/data.json",
			// StandardizeIpfsUrl should convert this. Assuming it converts to ipfs.io for CIDv0
			mockResponses: map[string]mockServerResponse{
				"/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/data.json": {
					body:       expectedMetaJSON,
					statusCode: http.StatusOK,
				},
			},
			expectedResult: expectedMeta,
		},
		{
			name: "Plain HTTPS URI (Non-IPFS)",
			uri:  "https://example.com/metadata.json", // StandardizeIpfsUrl returns this unchanged
			mockResponses: map[string]mockServerResponse{
				"/metadata.json": {body: expectedMetaJSON, statusCode: http.StatusOK},
			},
			expectedResult: expectedMeta,
		},
		{
			name: "Arweave URI",
			uri:  "ar://arweave_tx_id_123", // StandardizeIpfsUrl returns this unchanged
			mockResponses: map[string]mockServerResponse{
				arweaveGatewayPrefix + "arweave_tx_id_123": { // path will be /arweave_tx_id_123
					body:       expectedMetaJSON,
					statusCode: http.StatusOK,
				},
			},
			expectedResult: expectedMeta,
		},
		{
			name:          "Empty URI",
			uri:           "",
			expectError:   true,
			errorContains: "cannot fetch metadata from empty URI",
		},
		{
			name:          "Unsupported URI Scheme",
			uri:           "ftp://example.com/file.txt",
			expectError:   true,
			errorContains: "unsupported URI scheme: ftp://example.com/file.txt",
		},
		{
			name: "IPFS URI that fails standardization in fetchIPFSMetadata",
			// This URI is a valid IPFS path, but we want to test the case where
			// fetchIPFSMetadata's internal call to StandardizeIpfsUrl fails (e.g. returns ipfs:// or empty)
			// To simulate this without mocking StandardizeIpfsUrl, we rely on the fact that
			// if the top-level StandardizeIpfsUrl returns the ipfs:// URI as is, fetchIPFSMetadata is called.
			// Then, fetchIPFSMetadata calls StandardizeIpfsUrl again. If *that* fails, it errors.
			// We assume util.StandardizeIpfsUrl might return "ipfs://..." if defaultCIDv0Gateways is empty.
			// This test is a bit conceptual as StandardizeIpfsUrl is quite robust.
			// The error we expect comes from fetchIPFSMetadata if standardization fails there.
			uri:           "ipfs://QmfailToStandardizeInternally",
			expectError:   true,
			errorContains: "failed to standardize IPFS URI to a fetchable gateway URL: ipfs://QmfailToStandardizeInternally",
			// No mock responses needed as it should fail before HTTP call in fetchIPFSMetadata
		},
		{
			name: "HTTP fetch fails (404)",
			uri:  "https://example.com/notfound.json",
			mockResponses: map[string]mockServerResponse{
				"/notfound.json": {body: []byte("Not Found"), statusCode: http.StatusNotFound},
			},
			expectError:   true,
			errorContains: "http status 404",
		},
		{
			name: "HTTP fetch fails (500)",
			uri:  "https://example.com/servererror.json",
			mockResponses: map[string]mockServerResponse{
				"/servererror.json": {body: []byte("Server Error"), statusCode: http.StatusInternalServerError},
			},
			expectError:   true,
			errorContains: "http status 500",
		},
		{
			name: "IPFS URI (CIDv0) - HTTP fetch fails (404)",
			uri:  "ipfs://QmNotFound",
			mockResponses: map[string]mockServerResponse{
				"/ipfs/QmNotFound": {body: []byte("Not Found"), statusCode: http.StatusNotFound},
			},
			expectError:   true,
			errorContains: "http status 404",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var server *httptest.Server
			if len(tc.mockResponses) > 0 {
				// Build full path responses for the mock server based on how StandardizeIpfsUrl and client logic work
				fullPathResponses := make(map[string]mockServerResponse)
				for pathSuffix, resp := range tc.mockResponses {
					if strings.HasPrefix(tc.uri, "ar://") && strings.HasPrefix(pathSuffix, arweaveGatewayPrefix) {
                         // Arweave URIs are directly translated to arweave.net/TX_ID
                         fullPathResponses[strings.TrimPrefix(pathSuffix, arweaveGatewayPrefix)] = resp
                    } else if strings.HasPrefix(tc.uri, "ipfs://") || strings.Contains(tc.uri, "/ipfs/") {
						// For IPFS, StandardizeIpfsUrl generates the full URL. We mock based on the path part.
						// The mock server checks HasSuffix, so this path suffix should be enough.
						fullPathResponses[pathSuffix] = resp
					} else { // Plain HTTPS
						fullPathResponses[pathSuffix] = resp
					}
				}
				server = newMockServer(t, fullPathResponses)
				defer server.Close()

				// We need to update the URI for the client if it's going to be standardized to a different host
				// than our mock server. This is tricky because StandardizeIpfsUrl has its own logic.
				// For testing, we assume util.StandardizeIpfsUrl will point to a host that our server can mimic parts of.
				// The key is that the *path* it standardizes to is what we configure in mockResponses.
				// If StandardizeIpfsUrl itself uses a different host than the mock server for IPFS links,
				// we'd need to inject the mock server's URL into util.StandardizeIpfsUrl's logic,
				// which is too complex for this test.
				// Instead, we rely on paths:
				// e.g. if StandardizeIpfsUrl(ipfs://CID) -> https://dweb.link/ipfs/CID
				// our mock server will respond if r.URL.Path ends with /ipfs/CID.
			}
			
			client := NewClient(http.DefaultClient)
			if tc.setupClient != nil {
				tc.setupClient(client.(*Client))
			}


			// Adjust URI for mock server if StandardizeIpfsUrl is expected to change it
			// to point to a specific gateway that the mock server is pretending to be.
			// This is mainly for IPFS URLs where StandardizeIpfsUrl picks a gateway.
			standardizedTestURI := util.StandardizeIpfsUrl(tc.uri)
			if server != nil && (strings.HasPrefix(tc.uri, "ipfs://") || strings.Contains(tc.uri, "/ipfs/")) {
				// If it's an IPFS URI, StandardizeIpfsUrl will create a full gateway URL.
				// We need our client to use *our* mock server for that gateway.
				// So, we "re-standardize" it to use our mock server's host.
				if strings.HasPrefix(standardizedTestURI, "http") {
					originalURL, _ := util.ParseURL(standardizedTestURI) // Use a robust parser
					pathPart := originalURL.Path
					if originalURL.RawQuery != "" {
						pathPart += "?" + originalURL.RawQuery
					}
					// Override the URI to use the mock server's host but keep the path StandardizeIpfsUrl determined
					standardizedTestURI = server.URL + pathPart
					// For FetchMetadata, the logic is now:
					// 1. client.FetchMetadata(originalURI)
					// 2. standardizedURI_actual = util.StandardizeIpfsUrl(originalURI) -> e.g. https://dweb.link/ipfs/CID
					// 3. if standardizedURI_actual != originalURI && strings.HasPrefix(standardizedURI_actual, "http")
					//    then client.fetchHTTPMetadata(standardizedURI_actual)
					// So the mock server must respond to the path from standardizedURI_actual.
					// The newMockServer already uses HasSuffix, so this should work.
				}
			} else if server != nil && strings.HasPrefix(tc.uri, "ar://") {
                // Arweave uses arweave.net, replace with mock server URL + txID
                txID := strings.TrimPrefix(tc.uri, "ar://")
                standardizedTestURI = server.URL + "/" + txID // Mock server will see /txID
            } else if server != nil && strings.HasPrefix(tc.uri, "http") {
				// For plain HTTP, it might be example.com. We need to route it to mock server.
				originalURL, _ := util.ParseURL(tc.uri)
				pathPart := originalURL.Path
				if originalURL.RawQuery != "" {
					pathPart += "?" + originalURL.RawQuery
				}
				standardizedTestURI = server.URL + pathPart
			}
			
			// The client itself will call util.StandardizeIpfsUrl on tc.uri.
			// If tc.uri is IPFS-like, util.StandardizeIpfsUrl will produce e.g. https://dweb.link/ipfs/CID
			// The client will then call fetchHTTPMetadata with this URL.
			// Our mock server needs to be configured to respond to the *path* of that dweb.link URL.
			// The newMockServer's keying by path Suffix handles this.
			// The `standardizedTestURI` variable is more for understanding what URL the client *should* be hitting.

			var result map[string]any
			var err error

			// If the test URI is one that would be transformed by the initial StandardizeIpfsUrl call in FetchMetadata
			// into an HTTP URL that our mock server is meant to handle, we use the server.URL based version.
			// Otherwise, we use the original tc.uri.
			uriToFetch := tc.uri
			tempStandardized := util.StandardizeIpfsUrl(tc.uri)
			if tempStandardized != tc.uri && strings.HasPrefix(tempStandardized, "http") && server != nil {
				// This means StandardizeIpfsUrl converted it to an HTTP URL.
				// We need to ensure this HTTP URL points to our mock server for the test.
				parts := strings.SplitN(tempStandardized, "/", 4) // http://host/path -> path is parts[3]
				if len(parts) >= 4 {
					uriToFetch = server.URL + "/" + parts[3]
				} else if len(parts) == 3 { // case like http://host/ (path is implicitly /)
					uriToFetch = server.URL + "/"
				} else {
					uriToFetch = server.URL // Should not happen for valid URLs
				}
			} else if server != nil && (strings.HasPrefix(tc.uri, "http") || strings.HasPrefix(tc.uri, "ar://")) {
                 // For direct http or arweave (which becomes http), transform to mock server
                uriToFetch = standardizedTestURI // Which we already set to server.URL + path
            }


			// Special handling for Arweave as it constructs URL internally
			if !strings.HasPrefix(tc.uri, "ar://") && strings.HasPrefix(uriToFetch, "http") {
				// If the uriToFetch is now pointing to our mock server, use it.
				// But only if it wasn't Arweave, Arweave has its own path construction.
				result, err = client.FetchMetadata(uriToFetch)
			} else {
				result, err = client.FetchMetadata(tc.uri)
			}


			if tc.expectError {
				if err == nil {
					t.Errorf("Expected error, got nil for URI: %s", tc.uri)
				} else if tc.errorContains != "" && !strings.Contains(err.Error(), tc.errorContains) {
					t.Errorf("Expected error to contain '%s', got: %v for URI: %s", tc.errorContains, err, tc.uri)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v for URI: %s", err, tc.uri)
				}
				if !reflect.DeepEqual(result, tc.expectedResult) {
					t.Errorf("Expected result %v, got %v for URI: %s", tc.expectedResult, result, tc.uri)
				}
			}
		})
	}
}


func TestFetchRawData(t *testing.T) {
	expectedData := []byte("raw data content")
	expectedContentType := "image/png"
	arweaveGatewayPrefix := "https://arweave.net/"


	testCases := []struct {
		name              string
		uri               string
		mockResponses     map[string]mockServerResponse // Keyed by expected path Suffix
		expectedData      []byte
		expectedContenType string
		expectError       bool
		errorContains     string
	}{
		{
			name: "Standard IPFS URI (CIDv0)",
			uri:  "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/image.png",
			mockResponses: map[string]mockServerResponse{
				"/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/image.png": {
					body:       expectedData,
					contentType: expectedContentType,
					statusCode: http.StatusOK,
				},
			},
			expectedData:      expectedData,
			expectedContenType: expectedContentType,
		},
		{
			name: "Standard IPFS URI (CIDv1)",
			uri:  "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/image.jpeg",
			mockResponses: map[string]mockServerResponse{
				// Path will be /image.jpeg for bafy...dweb.link/image.jpeg
				"/image.jpeg": { 
					body:       expectedData,
					contentType: expectedContentType,
					statusCode: http.StatusOK,
				},
			},
			expectedData:      expectedData,
			expectedContenType: expectedContentType,
		},
		{
			name: "HTTP IPFS Gateway URI (Old format to be standardized)",
			uri:  "https://somegateway.com/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/rawfile",
			mockResponses: map[string]mockServerResponse{
				"/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/rawfile": {
					body:       expectedData,
					contentType: expectedContentType,
					statusCode: http.StatusOK,
				},
			},
			expectedData:      expectedData,
			expectedContenType: expectedContentType,
		},
		{
			name: "Plain HTTPS URI (Non-IPFS)",
			uri:  "https://example.com/data.bin",
			mockResponses: map[string]mockServerResponse{
				"/data.bin": {body: expectedData, contentType: expectedContentType, statusCode: http.StatusOK},
			},
			expectedData:      expectedData,
			expectedContenType: expectedContentType,
		},
		{
			name: "Arweave URI",
			uri:  "ar://arweave_tx_id_data_456",
			mockResponses: map[string]mockServerResponse{
				arweaveGatewayPrefix + "arweave_tx_id_data_456": { // path will be /arweave_tx_id_data_456
					body:       expectedData,
					contentType: expectedContentType,
					statusCode: http.StatusOK,
				},
			},
			expectedData:      expectedData,
			expectedContenType: expectedContentType,
		},
		{
			name:          "Empty URI",
			uri:           "",
			expectError:   true,
			errorContains: "cannot fetch raw data from empty URI",
		},
		{
			name:          "Unsupported URI Scheme",
			uri:           "gopher://example.com/data",
			expectError:   true,
			errorContains: "unsupported URI scheme: gopher://example.com/data",
		},
		{
			name: "IPFS URI that fails standardization in fetchIPFSRaw",
			uri:           "ipfs://QmfailRawStandardizeInternally",
			expectError:   true,
			errorContains: "failed to standardize IPFS URI to a fetchable gateway URL: ipfs://QmfailRawStandardizeInternally",
		},
		{
			name: "HTTP fetch fails (404)",
			uri:  "https://example.com/notfound.bin",
			mockResponses: map[string]mockServerResponse{
				"/notfound.bin": {statusCode: http.StatusNotFound},
			},
			expectError:   true,
			errorContains: "http status 404",
		},
		{
            name: "HTTP fetch empty response body",
            uri:  "https://example.com/empty.dat",
            mockResponses: map[string]mockServerResponse{
                "/empty.dat": {contentType: "application/octet-stream", statusCode: http.StatusOK, skipBody: true},
            },
            expectError:   true,
            errorContains: "empty response body received",
        },
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var server *httptest.Server
			if len(tc.mockResponses) > 0 {
				fullPathResponses := make(map[string]mockServerResponse)
				for pathSuffix, resp := range tc.mockResponses {
                     if strings.HasPrefix(tc.uri, "ar://") && strings.HasPrefix(pathSuffix, arweaveGatewayPrefix) {
                         fullPathResponses[strings.TrimPrefix(pathSuffix, arweaveGatewayPrefix)] = resp
                    } else if strings.HasPrefix(tc.uri, "ipfs://") || strings.Contains(tc.uri, "/ipfs/") {
						fullPathResponses[pathSuffix] = resp
					} else {
						fullPathResponses[pathSuffix] = resp
					}
				}
				server = newMockServer(t, fullPathResponses)
				defer server.Close()
			}

			client := NewClient(http.DefaultClient)
			
			uriToFetch := tc.uri
			tempStandardized := util.StandardizeIpfsUrl(tc.uri)

			if tempStandardized != tc.uri && strings.HasPrefix(tempStandardized, "http") && server != nil {
				urlParts := strings.SplitN(tempStandardized, "/", 4)
				actualPath := ""
				if len(urlParts) >=4 {
					actualPath = "/" + urlParts[3]
				} else if len(urlParts) == 3 { // http://host -> path is /
					actualPath = "/"
				}
				uriToFetch = server.URL + actualPath
			} else if server != nil && (strings.HasPrefix(tc.uri, "http") || strings.HasPrefix(tc.uri, "ar://")) {
                 originalURL, _ := util.ParseURL(tc.uri) // Simplified for test
                 pathPart := originalURL.Path
                 if strings.HasPrefix(tc.uri, "ar://"){
                     pathPart = "/" + strings.TrimPrefix(tc.uri, "ar://")
                 }
                 uriToFetch = server.URL + pathPart
            }


			var data []byte
			var contentType string
			var err error
			
			ctx := context.Background()

			if !strings.HasPrefix(tc.uri, "ar://") && strings.HasPrefix(uriToFetch, "http") {
				data, contentType, err = client.FetchRawData(ctx, uriToFetch)
			} else {
				data, contentType, err = client.FetchRawData(ctx, tc.uri)
			}


			if tc.expectError {
				if err == nil {
					t.Errorf("Expected error, got nil for URI: %s", tc.uri)
				} else if tc.errorContains != "" && !strings.Contains(err.Error(), tc.errorContains) {
					t.Errorf("Expected error to contain '%s', got: %v for URI: %s", tc.errorContains, err, tc.uri)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v for URI: %s", err, tc.uri)
				}
				if !reflect.DeepEqual(data, tc.expectedData) {
					t.Errorf("Expected data %s, got %s for URI: %s", string(tc.expectedData), string(data), tc.uri)
				}
				if contentType != tc.expectedContenType {
					t.Errorf("Expected contentType %s, got %s for URI: %s", tc.expectedContenType, contentType, tc.uri)
				}
			}
		})
	}
}

// Helper to parse URL, good for tests, not prod grade
func (u *Util) ParseURL(urlStr string) (*url.URL, error) {
    return url.Parse(urlStr)
}

type Util struct{} // Dummy struct to hang ParseURL method for testing setup

var testUtil = &Util{} 
// This makes ParseURL available as testUtil.ParseURL in test code
// Example usage: originalURL, _ := testUtil.ParseURL(standardizedTestURI)
// Note: This is a bit of a hack for the test file. In real code, util.ParseURL would be a proper package function.
// For the purpose of this test file, we assume util.StandardizeIpfsUrl works and gives us a string.
// If we needed to parse that string within the test for complex manipulations, we might use this.
// However, the current test logic for adjusting URIs to mock server mostly uses string ops.
// The `util.ParseURL` isn't actually used in the final test logic after refinement,
// but leaving the helper structure here as an example of how one might add local test helpers.

// A more direct way if parsing needed:
// import "net/url"
// u, err := url.Parse("http://example.com/path")
// path := u.Path
// This is standard Go.
