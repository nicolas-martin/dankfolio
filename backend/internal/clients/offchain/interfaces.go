package offchain

//go:generate mockery --name=ClientAPI --output=mocks --outpkg=mocks --case=snake

// ClientAPI defines the interface for external metadata interactions
type ClientAPI interface {
	// FetchMetadata fetches JSON metadata from a URI with fallback support for IPFS and Arweave
	FetchMetadata(uri string) (map[string]interface{}, error)
}
