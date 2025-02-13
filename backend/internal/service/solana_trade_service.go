package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

var (
	// Default compute unit limits for transactions
	defaultComputeUnitLimit uint32 = 70000
	// Error definitions
	ErrInvalidCoin  = errors.New("invalid coin")
	ErrInvalidTrade = errors.New("invalid trade parameters")
)

// SolanaTradeService handles the execution of trades on the Solana blockchain
type SolanaTradeService struct {
	client           *rpc.Client
	wsClient         *ws.Client
	programID        solana.PublicKey
	poolWallet       solana.PublicKey
	computeUnitLimit uint32
	privateKey       solana.PrivateKey // Private key for signing transactions
}

func NewSolanaTradeService(rpcEndpoint, wsEndpoint string, programID, poolWallet, privateKey string) (*SolanaTradeService, error) {
	programPubKey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %w", err)
	}

	poolPubKey, err := solana.PublicKeyFromBase58(poolWallet)
	if err != nil {
		return nil, fmt.Errorf("invalid pool wallet: %w", err)
	}

	privKey, err := solana.PrivateKeyFromBase58(privateKey)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	wsClient, err := ws.Connect(context.Background(), wsEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to websocket: %w", err)
	}

	return &SolanaTradeService{
		client:           rpc.New(rpcEndpoint),
		wsClient:         wsClient,
		programID:        programPubKey,
		poolWallet:       poolPubKey,
		computeUnitLimit: defaultComputeUnitLimit,
		privateKey:       privKey,
	}, nil
}

func (s *SolanaTradeService) ExecuteTrade(ctx context.Context, trade *model.Trade) error {
	if trade == nil {
		return ErrInvalidTrade
	}

	// Convert trade amount to lamports (1 SOL = 1e9 lamports)
	amountLamports := uint64(trade.Amount * 1e9)

	// Get the recent blockhash
	recentBlockhash, err := s.client.GetRecentBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		return fmt.Errorf("failed to get recent blockhash: %w", err)
	}

	// Create token account for the meme coin if it doesn't exist
	tokenPubKey, err := solana.PublicKeyFromBase58(trade.CoinID)
	if err != nil {
		return fmt.Errorf("invalid coin address: %w", err)
	}

	// Create transaction instructions based on trade type
	var instructions []solana.Instruction
	if trade.Type == "buy" {
		instructions = append(instructions,
			system.NewTransferInstruction(
				amountLamports,
				s.privateKey.PublicKey(),
				s.poolWallet,
			).Build(),
		)
	} else if trade.Type == "sell" {
		instructions = append(instructions,
			token.NewTransferInstruction(
				amountLamports,
				tokenPubKey,
				s.poolWallet,
				s.privateKey.PublicKey(),
				[]solana.PublicKey{},
			).Build(),
		)
	} else {
		return fmt.Errorf("invalid trade type: %s", trade.Type)
	}

	// Create transaction
	tx, err := solana.NewTransaction(
		instructions,
		recentBlockhash.Value.Blockhash,
		solana.TransactionPayer(s.privateKey.PublicKey()),
	)
	if err != nil {
		trade.Status = "failed"
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(s.privateKey.PublicKey()) {
			return &s.privateKey
		}
		return nil
	})
	if err != nil {
		trade.Status = "failed"
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	sig, err := s.client.SendTransaction(ctx, tx)
	if err != nil {
		trade.Status = "failed"
		return fmt.Errorf("failed to send transaction: %w", err)
	}

	// Wait for confirmation with retries
	confirmed := false
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		result, err := s.client.GetSignatureStatuses(ctx, true, sig)
		if err != nil {
			continue
		}

		if len(result.Value) > 0 && result.Value[0] != nil && result.Value[0].Confirmations != nil && *result.Value[0].Confirmations > 0 {
			confirmed = true
			break
		}

		time.Sleep(500 * time.Millisecond)
	}

	if confirmed {
		trade.Status = "completed"
		trade.CompletedAt = time.Now()
	} else {
		trade.Status = "pending"
	}

	return nil
}
