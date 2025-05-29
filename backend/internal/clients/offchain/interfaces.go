package offchain

import "context"

type ClientAPI interface {
	FetchMetadata(uri string) (map[string]any, error)
	FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error)
}
