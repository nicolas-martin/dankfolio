package image

import (
	"context"
	"fmt"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
)

// Ensure OffchainFetcher implements RawDataFetcher.
var _ RawDataFetcher = (*OffchainFetcher)(nil)

// OffchainFetcher implements the RawDataFetcher interface using the offchain.ClientAPI.
type OffchainFetcher struct {
	offchainClient offchain.ClientAPI
}

// NewOffchainFetcher creates a new fetcher adapter.
func NewOffchainFetcher(client offchain.ClientAPI) *OffchainFetcher {
	if client == nil {
		// Or handle this more gracefully depending on your application setup
		panic("offchainClient cannot be nil")
	}
	return &OffchainFetcher{
		offchainClient: client,
	}
}

// FetchRawData uses the injected offchain client to fetch raw data.
func (f *OffchainFetcher) FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error) {
	// Note: We assume the offchainClient.FetchRawData method now exists
	// and correctly handles context, URI schemes, and returns the required values.
	data, contentType, err = f.offchainClient.FetchRawData(ctx, uri)
	if err != nil {
		return nil, "", fmt.Errorf("offchain client failed to fetch raw data for %s: %w", uri, err)
	}
	return data, contentType, nil
}
