package service

import (
	"context"

	"github.com/gagliardetto/solana-go/rpc"
)

// SolanaService defines the interface for Solana blockchain operations
type SolanaService interface {
	GetClient() *rpc.Client
	FundTestnetWallet(ctx context.Context, publicKey string) error
}

type solanaService struct {
	client *rpc.Client
}

// NewSolanaService creates a new SolanaService instance
func NewSolanaService(client *rpc.Client) SolanaService {
	return &solanaService{
		client: client,
	}
}

func (s *solanaService) GetClient() *rpc.Client {
	return s.client
}

func (s *solanaService) FundTestnetWallet(ctx context.Context, publicKey string) error {
	// Implementation for funding testnet wallet
	// This would include airdrop logic for testnet
	return nil
}
