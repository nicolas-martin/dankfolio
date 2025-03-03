package solana

import (
	"net/http"

	"github.com/gagliardetto/solana-go/rpc"
)

// SolanaTradeService handles the execution of trades on the Solana blockchain
type SolanaTradeService struct {
	client     *rpc.Client
	httpClient *http.Client // HTTP client for Raydium API calls
}

func NewSolanaTradeService(rpcEndpoint string) (*SolanaTradeService, error) {
	// Use default endpoint if not provided
	if rpcEndpoint == "" {
		rpcEndpoint = defaultDevnetRPC
	}

	service := &SolanaTradeService{
		client:     rpc.New(rpcEndpoint),
		httpClient: &http.Client{},
	}

	return service, nil
}
