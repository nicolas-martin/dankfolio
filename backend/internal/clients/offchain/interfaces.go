package offchain

// ClientAPI defines the interface for external metadata interactions
type ClientAPI interface {
	// FetchMetadata fetches JSON metadata from a URI with fallback support for IPFS and Arweave
	FetchMetadata(uri string) (map[string]interface{}, error)
}
