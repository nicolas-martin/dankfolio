package service

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
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
	// Default RPC endpoints
	defaultDevnetRPC = "https://api.devnet.solana.com"
	defaultDevnetWS  = "wss://api.devnet.solana.com"
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
	// Use default endpoints if not provided
	if rpcEndpoint == "" {
		rpcEndpoint = defaultDevnetRPC
	}
	if wsEndpoint == "" {
		wsEndpoint = defaultDevnetWS
	}

	// Create a new keypair if private key is not provided
	var privKey solana.PrivateKey
	var err error
	if privateKey == "" {
		// Try to load the default Solana CLI wallet
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}
		keyPath := filepath.Join(homeDir, ".config", "solana", "id.json")
		keyData, err := os.ReadFile(keyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read Solana CLI wallet: %w", err)
		}
		var keyBytes []byte
		if err := json.Unmarshal(keyData, &keyBytes); err != nil {
			return nil, fmt.Errorf("failed to parse Solana CLI wallet JSON: %w", err)
		}
		privKey = solana.PrivateKey(keyBytes)
		log.Printf("🔑 Loaded Solana CLI wallet: %s", privKey.PublicKey().String())
	} else {
		privKey, err = solana.PrivateKeyFromBase58(privateKey)
		if err != nil {
			return nil, fmt.Errorf("invalid private key: %w", err)
		}
	}

	// Create pool wallet if not provided
	var poolPubKey solana.PublicKey
	if poolWallet == "" {
		// Generate a new Ed25519 keypair for the pool
		pub, _, err := ed25519.GenerateKey(nil)
		if err != nil {
			return nil, fmt.Errorf("failed to generate pool keypair: %w", err)
		}
		poolPubKey = solana.PublicKey(pub)
		log.Printf("🏦 Generated new pool wallet: %s", poolPubKey.String())
	} else {
		poolPubKey, err = solana.PublicKeyFromBase58(poolWallet)
		if err != nil {
			return nil, fmt.Errorf("invalid pool wallet: %w", err)
		}
	}

	// Parse program ID
	programPubKey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("invalid program ID: %w", err)
	}

	// Connect to WebSocket
	wsClient, err := ws.Connect(context.Background(), wsEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to websocket: %w", err)
	}

	service := &SolanaTradeService{
		client:           rpc.New(rpcEndpoint),
		wsClient:         wsClient,
		programID:        programPubKey,
		poolWallet:       poolPubKey,
		computeUnitLimit: defaultComputeUnitLimit,
		privateKey:       privKey,
	}

	// Request airdrop for testing
	if err := service.requestAirdrop(context.Background()); err != nil {
		log.Printf("⚠️ Failed to request airdrop: %v", err)
	}

	return service, nil
}

func (s *SolanaTradeService) requestAirdrop(ctx context.Context) error {
	amount := uint64(1 * solana.LAMPORTS_PER_SOL) // 1 SOL
	sig, err := s.client.RequestAirdrop(ctx, s.privateKey.PublicKey(), amount, rpc.CommitmentConfirmed)
	if err != nil {
		return fmt.Errorf("failed to request airdrop: %w", err)
	}
	log.Printf("🪂 Requested airdrop of 1 SOL to %s. Transaction: %s", s.privateKey.PublicKey().String(), sig.String())

	// Wait for confirmation
	startTime := time.Now()
	timeout := 30 * time.Second
	for {
		if time.Since(startTime) > timeout {
			return fmt.Errorf("airdrop confirmation timeout")
		}

		status, err := s.client.GetSignatureStatuses(ctx, true, sig)
		if err != nil {
			return fmt.Errorf("failed to get airdrop status: %w", err)
		}

		if status.Value[0] != nil {
			if status.Value[0].Err != nil {
				return fmt.Errorf("airdrop failed: %v", status.Value[0].Err)
			}
			if status.Value[0].Confirmations != nil && *status.Value[0].Confirmations > 0 {
				log.Printf("✅ Airdrop confirmed with %d confirmations", *status.Value[0].Confirmations)
				break
			}
		}

		log.Printf("⏳ Waiting for airdrop confirmation...")
		time.Sleep(time.Second)
	}

	return nil
}

func (s *SolanaTradeService) ExecuteTrade(ctx context.Context, trade *model.Trade) error {
	// Validate trade parameters
	if trade == nil {
		return fmt.Errorf("trade cannot be nil")
	}

	if trade.CoinID == "" {
		return fmt.Errorf("invalid coin ID: empty")
	}

	if trade.Type != "buy" && trade.Type != "sell" {
		return fmt.Errorf("invalid trade type: %s", trade.Type)
	}

	if trade.Amount <= 0 {
		return fmt.Errorf("invalid amount: amount must be greater than 0")
	}

	// Get the private key for signing transactions
	privateKey, err := s.getPrivateKey(ctx)
	if err != nil {
		return fmt.Errorf("failed to get private key: %w", err)
	}

	// Create and send the transaction
	txHash, err := s.executeTransaction(ctx, trade, privateKey)
	if err != nil {
		if strings.Contains(err.Error(), "0x1") {
			return fmt.Errorf("insufficient funds: %w", err)
		}
		return fmt.Errorf("failed to execute transaction: %w", err)
	}

	// Update trade status
	trade.Status = "completed"
	trade.TransactionHash = txHash
	trade.CompletedAt = time.Now()

	return nil
}

func (s *SolanaTradeService) getPrivateKey(ctx context.Context) (solana.PrivateKey, error) {
	return s.privateKey, nil
}

func (s *SolanaTradeService) executeTransaction(ctx context.Context, trade *model.Trade, privateKey solana.PrivateKey) (string, error) {
	log.Printf("🔄 Starting transaction execution for %s %f %s", trade.Type, trade.Amount, trade.CoinID)

	// Get recent blockhash using getLatestBlockhash
	recent, err := s.client.GetRecentBlockhash(ctx, rpc.CommitmentConfirmed)
	if err != nil {
		log.Printf("❌ Failed to get recent blockhash: %v", err)
		return "", fmt.Errorf("failed to get recent blockhash: %w", err)
	}
	log.Printf("✅ Got recent blockhash: %s", recent.Value.Blockhash)

	// Parse token mint address
	tokenMint, err := solana.PublicKeyFromBase58(trade.CoinID)
	if err != nil {
		log.Printf("❌ Invalid token mint address: %v", err)
		return "", fmt.Errorf("invalid token mint address: %w", err)
	}
	log.Printf("✅ Parsed token mint: %s", tokenMint)

	// Get associated token account for the user's wallet
	userATA, _, err := solana.FindAssociatedTokenAddress(
		privateKey.PublicKey(),
		tokenMint,
	)
	if err != nil {
		log.Printf("❌ Failed to find user's associated token account: %v", err)
		return "", fmt.Errorf("failed to find associated token account: %w", err)
	}
	log.Printf("✅ Found user's ATA: %s", userATA)

	// Get associated token account for the pool wallet
	poolATA, _, err := solana.FindAssociatedTokenAddress(
		s.poolWallet,
		tokenMint,
	)
	if err != nil {
		log.Printf("❌ Failed to find pool's associated token account: %v", err)
		return "", fmt.Errorf("failed to find pool associated token account: %w", err)
	}
	log.Printf("✅ Found pool's ATA: %s", poolATA)

	// Convert amount to lamports (smallest unit)
	amount := uint64(trade.Amount * 1e9) // Assuming 9 decimals for SPL tokens
	log.Printf("💰 Converting amount to lamports: %d", amount)

	// Create the token transfer instruction
	var transferInstruction solana.Instruction
	if trade.Type == "buy" {
		transferInstruction = token.NewTransferInstruction(
			amount,
			poolATA,      // from
			userATA,      // to
			s.poolWallet, // authority
			[]solana.PublicKey{},
		).Build()
		log.Printf("📝 Created buy transfer instruction: %s -> %s", poolATA, userATA)
	} else {
		transferInstruction = token.NewTransferInstruction(
			amount,
			userATA,                // from
			poolATA,                // to
			privateKey.PublicKey(), // authority
			[]solana.PublicKey{},
		).Build()
		log.Printf("📝 Created sell transfer instruction: %s -> %s", userATA, poolATA)
	}

	// Create a new transaction with the transfer instruction
	tx, err := solana.NewTransaction(
		[]solana.Instruction{transferInstruction},
		recent.Value.Blockhash,
		solana.TransactionPayer(privateKey.PublicKey()),
	)
	if err != nil {
		log.Printf("❌ Failed to create transaction: %v", err)
		return "", fmt.Errorf("failed to create transaction: %w", err)
	}
	log.Printf("✅ Created transaction with blockhash: %s", recent.Value.Blockhash)

	// Sign the transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(privateKey.PublicKey()) {
			return &privateKey
		}
		return nil
	})
	if err != nil {
		log.Printf("❌ Failed to sign transaction: %v", err)
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}
	log.Printf("✅ Signed transaction with public key: %s", privateKey.PublicKey())

	// Send the transaction
	sig, err := s.client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentConfirmed,
	})
	if err != nil {
		log.Printf("❌ Failed to send transaction: %v", err)
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}
	log.Printf("🚀 Transaction sent with signature: %s", sig)

	// Wait for confirmation with timeout
	startTime := time.Now()
	timeout := 30 * time.Second
	for {
		if time.Since(startTime) > timeout {
			log.Printf("❌ Transaction confirmation timeout after %s", timeout)
			return "", fmt.Errorf("transaction confirmation timeout")
		}

		status, err := s.client.GetSignatureStatuses(ctx, true, sig)
		if err != nil {
			log.Printf("❌ Failed to get transaction status: %v", err)
			return "", fmt.Errorf("failed to get transaction status: %w", err)
		}

		if status.Value[0] != nil {
			if status.Value[0].Err != nil {
				log.Printf("❌ Transaction failed: %v", status.Value[0].Err)
				return "", fmt.Errorf("transaction failed: %v", status.Value[0].Err)
			}
			if status.Value[0].Confirmations != nil && *status.Value[0].Confirmations > 0 {
				log.Printf("✅ Transaction confirmed with %d confirmations", *status.Value[0].Confirmations)
				break
			}
		}

		log.Printf("⏳ Waiting for transaction confirmation...")
		time.Sleep(time.Second)
	}

	log.Printf("🎉 Transaction completed successfully! Signature: %s", sig)
	log.Printf("🔍 View on Solana Explorer: https://explorer.solana.com/tx/%s?cluster=devnet", sig)

	return sig.String(), nil
}
