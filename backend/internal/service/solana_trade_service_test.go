package service

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/stretchr/testify/require"

	"github.com/nicolas-martin/dankfolio/internal/model"
)

const (
	testnetRPCEndpoint = "https://api.testnet.solana.com"
	testnetWSEndpoint  = "wss://api.testnet.solana.com"
	// Using valid Solana addresses for testing
	testProgramID  = "11111111111111111111111111111111"             // System Program
	testPoolWallet = "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1" // Random valid address
	testTokenMint  = "So11111111111111111111111111111111111111112"  // Wrapped SOL mint
)

func skipIfAirdropLimitReached(t *testing.T, err error) {
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "You've either reached your airdrop limit today") ||
			strings.Contains(errMsg, "airdrop faucet has run dry") {
			t.Skip("Skipping test due to airdrop limit")
		}
	}
}

// verifyTestnetConnection verifies that we are connected to testnet
func verifyTestnetConnection(ctx context.Context, client *rpc.Client) error {
	// Get the genesis hash which is unique to each network
	genesis, err := client.GetGenesisHash(ctx)
	if err != nil {
		return fmt.Errorf("failed to get genesis hash: %w", err)
	}

	// Testnet genesis hash - this should be updated if testnet is reset
	// You can get the current testnet genesis hash by running: solana genesis-hash --url testnet
	expectedGenesisHash := "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY"
	if genesis.String() != expectedGenesisHash {
		return fmt.Errorf("not connected to testnet. Expected genesis hash %s, got %s", expectedGenesisHash, genesis.String())
	}
	return nil
}

// verifyWalletFunding verifies that the wallet has sufficient funds for testing
func verifyWalletFunding(ctx context.Context, client *rpc.Client, wallet solana.PublicKey) error {
	balanceResult, err := client.GetBalance(
		ctx,
		wallet,
		rpc.CommitmentFinalized,
	)
	if err != nil {
		return fmt.Errorf("failed to get wallet balance: %w", err)
	}

	// Require at least 1 SOL for testing
	minBalance := uint64(1_000_000_000) // 1 SOL in lamports
	if balanceResult.Value < minBalance {
		return fmt.Errorf("insufficient wallet balance for testing. Required: %d lamports, got: %d", minBalance, balanceResult.Value)
	}
	return nil
}

func setupTestEnvironment(t *testing.T) (*SolanaTradeService, *solana.Wallet, error) {
	ctx := context.Background()

	// Initialize service with testnet configuration
	service, err := NewSolanaTradeService(
		testnetRPCEndpoint,
		testnetWSEndpoint,
		testProgramID,
		testPoolWallet,
		nil, // We don't need DB for these tests
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create service: %w", err)
	}

	// Verify testnet connection
	if err := verifyTestnetConnection(ctx, service.client); err != nil {
		return nil, nil, fmt.Errorf("testnet verification failed: %w", err)
	}

	// Create a test wallet
	testWallet := solana.NewWallet()

	// Request airdrop for test wallet
	err = requestTestnetAirdrop(t, service.client, testWallet.PublicKey())
	skipIfAirdropLimitReached(t, err)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fund test wallet: %w", err)
	}

	// Verify wallet funding
	if err := verifyWalletFunding(ctx, service.client, testWallet.PublicKey()); err != nil {
		return nil, nil, fmt.Errorf("wallet funding verification failed: %w", err)
	}

	return service, testWallet, nil
}

func TestSolanaTradeService_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	ctx := context.Background()
	service, testWallet, err := setupTestEnvironment(t)
	if err != nil {
		t.Fatalf("Failed to setup test environment: %v", err)
	}
	require.NotNil(t, service)

	// Create a test trade
	trade := &model.Trade{
		ID:         "test_trade_1",
		UserID:     "test_user",
		CoinID:     testTokenMint,
		CoinSymbol: "TEST",
		Type:       "buy",
		Amount:     1.0,
		Price:      0.1,
		Fee:        0.001,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Execute the trade
	err = service.ExecuteTrade(ctx, trade, testWallet.PublicKey())
	require.NoError(t, err)

	// Verify trade was executed successfully
	require.Equal(t, "completed", trade.Status)
	require.NotEmpty(t, trade.TransactionHash)
}

func TestSolanaTradeService_CreateAssociatedTokenAccount(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	ctx := context.Background()
	service, testWallet, err := setupTestEnvironment(t)
	if err != nil {
		t.Fatalf("Failed to setup test environment: %v", err)
	}

	// Create a test trade with a new token
	trade := &model.Trade{
		ID:         "test_trade_2",
		UserID:     "test_user",
		CoinID:     testTokenMint,
		CoinSymbol: "TEST",
		Type:       "buy",
		Amount:     1.0,
		Price:      0.1,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Test creating associated token account
	instruction, err := service.createAssociatedTokenAccountInstruction(ctx, trade, testWallet.PublicKey())
	require.NoError(t, err)
	require.NotNil(t, instruction)

	// Build and send transaction
	recent, err := service.client.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	require.NoError(t, err)

	tx, err := solana.NewTransaction(
		[]solana.Instruction{instruction},
		recent.Value.Blockhash,
		solana.TransactionPayer(testWallet.PublicKey()),
	)
	require.NoError(t, err)

	// Sign and send transaction
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(testWallet.PublicKey()) {
			return &testWallet.PrivateKey
		}
		return nil
	})
	require.NoError(t, err)

	// Submit transaction
	sig, err := service.client.SendTransaction(ctx, tx)
	require.NoError(t, err)

	// Wait for confirmation
	confirmed, err := waitForSignatureConfirmation(ctx, service.client, sig)
	require.NoError(t, err)
	require.True(t, confirmed)
}

func TestSolanaTradeService_InvalidTrades(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	ctx := context.Background()
	service, testWallet, err := setupTestEnvironment(t)
	if err != nil {
		t.Fatalf("Failed to setup test environment: %v", err)
	}

	// Test invalid coin ID first, before any blockchain interaction
	invalidTrade := &model.Trade{
		ID:         "test_trade_3",
		UserID:     "test_user",
		CoinID:     "invalid_coin_id",
		CoinSymbol: "TEST",
		Type:       "buy",
		Amount:     1.0,
		Price:      0.1,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// This should fail during validation, before any RPC calls
	instruction, err := service.createAssociatedTokenAccountInstruction(ctx, invalidTrade, testWallet.PublicKey())
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid coin ID")
	require.Nil(t, instruction)

	// Test insufficient balance with valid coin ID
	insufficientTrade := &model.Trade{
		ID:         "test_trade_4",
		UserID:     "test_user",
		CoinID:     testTokenMint,
		CoinSymbol: "TEST",
		Type:       "buy",
		Amount:     1000000.0, // Very large amount
		Price:      1000000.0,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	err = service.ExecuteTrade(ctx, insufficientTrade, testWallet.PublicKey())
	require.Error(t, err)
	require.Contains(t, err.Error(), "insufficient balance")
}

// Helper function to wait for transaction confirmation
func waitForSignatureConfirmation(ctx context.Context, client *rpc.Client, signature solana.Signature) (bool, error) {
	for i := 0; i < 50; i++ { // Try for about 25 seconds
		sigs := []solana.Signature{signature}
		result, err := client.GetSignatureStatuses(ctx, true, sigs...)
		if err != nil {
			return false, err
		}

		if result.Value != nil && len(result.Value) > 0 && result.Value[0] != nil {
			if result.Value[0].Err != nil {
				return false, fmt.Errorf("transaction failed: %v", result.Value[0].Err)
			}
			return true, nil
		}

		select {
		case <-ctx.Done():
			return false, ctx.Err()
		case <-time.After(500 * time.Millisecond):
			continue
		}
	}

	return false, fmt.Errorf("timeout waiting for confirmation")
}

func requestTestnetAirdrop(t *testing.T, client *rpc.Client, pubkey solana.PublicKey) error {
	ctx := context.Background()

	// Request 2 SOL airdrop
	sig, err := client.RequestAirdrop(
		ctx,
		pubkey,
		2e9, // 2 SOL in lamports
		rpc.CommitmentFinalized,
	)
	if err != nil {
		return fmt.Errorf("airdrop request failed: %w", err)
	}

	// Wait for confirmation
	confirmed, err := waitForSignatureConfirmation(ctx, client, sig)
	if err != nil {
		return err
	}
	if !confirmed {
		return fmt.Errorf("airdrop confirmation timeout")
	}

	return nil
}

func getTokenBalance(ctx context.Context, client *rpc.Client, wallet solana.PublicKey, mint string) (uint64, error) {
	mintPubkey, err := solana.PublicKeyFromBase58(mint)
	if err != nil {
		return 0, err
	}

	ata, _, err := solana.FindAssociatedTokenAddress(wallet, mintPubkey)
	if err != nil {
		return 0, err
	}

	account, err := client.GetTokenAccountBalance(ctx, ata, rpc.CommitmentFinalized)
	if err != nil {
		return 0, err
	}

	// Convert string amount to uint64
	amount := uint64(0)
	_, err = fmt.Sscanf(account.Value.Amount, "%d", &amount)
	if err != nil {
		return 0, fmt.Errorf("failed to parse token amount: %w", err)
	}

	return amount, nil
}

// Helper function to create a test SPL token
func createTestToken(t *testing.T, client *rpc.Client, owner solana.PrivateKey) (string, error) {
	// TODO: Implement token creation logic
	// This would involve:
	// 1. Creating a new mint account
	// 2. Initializing the mint
	// 3. Creating an associated token account
	// 4. Minting initial tokens
	return "", nil
}
