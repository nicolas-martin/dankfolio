package image

import (
	"context"
)

// RawDataFetcher defines the interface for fetching raw byte data and its content type from a given URI.
// This allows for different implementations (e.g., direct fetch, external proxy) to be swapped easily.
type RawDataFetcher interface {
	// FetchRawData attempts to retrieve the raw content from the provided URI.
	// It returns the byte slice of the data, the detected Content-Type string, and any error encountered.
	FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error)
}
