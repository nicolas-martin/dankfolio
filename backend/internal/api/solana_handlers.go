package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gin-gonic/gin"
	"github.com/nicolas-martin/dankfolio/internal/model"
)

// verifyTestnetConnection verifies that we are connected to testnet
func verifyTestnetConnection(ctx context.Context, client *rpc.Client) error {
	// Get the genesis hash which is unique to each network
	genesis, err := client.GetGenesisHash(ctx)
	if err != nil {
		return fmt.Errorf("failed to get genesis hash: %w", err)
	}

	// Testnet genesis hash - this should be updated if testnet is reset
	expectedGenesisHash := "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY"
	if genesis.String() != expectedGenesisHash {
		return fmt.Errorf("not connected to testnet. Expected genesis hash %s, got %s", expectedGenesisHash, genesis.String())
	}
	return nil
}

// verifyWalletFunding verifies that the wallet has sufficient funds for trading
func verifyWalletFunding(ctx context.Context, client *rpc.Client, wallet solana.PublicKey) error {
	balanceResult, err := client.GetBalance(
		ctx,
		wallet,
		rpc.CommitmentFinalized,
	)
	if err != nil {
		return fmt.Errorf("failed to get wallet balance: %w", err)
	}

	// Require at least 0.1 SOL for trading
	minBalance := uint64(100_000_000) // 0.1 SOL in lamports
	if balanceResult.Value < minBalance {
		return fmt.Errorf("insufficient wallet balance for trading. Required: %d lamports, got: %d", minBalance, balanceResult.Value)
	}
	return nil
}

// waitForSignatureConfirmation waits for a transaction to be confirmed
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

// requestTestnetAirdrop requests an airdrop of SOL on testnet
func requestTestnetAirdrop(ctx context.Context, client *rpc.Client, wallet solana.PublicKey) error {
	// Request 2 SOL airdrop
	sig, err := client.RequestAirdrop(
		ctx,
		wallet,
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

// handleTestnetFunding handles funding a wallet on testnet (TEST ONLY)
func (r *Router) handleTestnetFunding() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		// Only allow this endpoint in test environment
		if os.Getenv("APP_ENV") != "test" {
			respondError(w, http.StatusForbidden, "This endpoint is only available in test environment")
			return
		}

		ctx := req.Context()

		// Get user from context for authorization
		user := getUserFromContext(ctx)
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Get user's wallet
		wallet, err := r.walletService.GetWallet(ctx, user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get user wallet: %v", err))
			return
		}

		// Convert wallet public key
		pubKey, err := solana.PublicKeyFromBase58(wallet.PublicKey)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Invalid wallet public key")
			return
		}

		client := r.solanaService.GetClient()

		// Request airdrop
		if err := requestTestnetAirdrop(ctx, client, pubKey); err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to request airdrop: %v", err))
			return
		}

		// Get updated balance
		balance, err := client.GetBalance(
			ctx,
			pubKey,
			rpc.CommitmentFinalized,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get updated balance: %v", err))
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"message": "Successfully funded wallet on testnet",
			"balance": float64(balance.Value) / 1e9, // Convert lamports to SOL
		})
	}
}

// handlePreviewSolanaTrade handles trade preview requests
func (r *Router) handlePreviewSolanaTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx := req.Context()

		// Get user from context for authorization
		user := getUserFromContext(ctx)
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		client := r.solanaService.GetClient()

		// Verify testnet connection
		if err := verifyTestnetConnection(ctx, client); err != nil {
			respondError(w, http.StatusServiceUnavailable, fmt.Sprintf("Testnet verification failed: %v", err))
			return
		}

		// Get user's wallet
		wallet, err := r.walletService.GetWallet(ctx, user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get user wallet: %v", err))
			return
		}

		// Convert wallet public key
		pubKey, err := solana.PublicKeyFromBase58(wallet.PublicKey)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Invalid wallet public key")
			return
		}

		// Verify wallet funding
		if err := verifyWalletFunding(ctx, client, pubKey); err != nil {
			respondError(w, http.StatusBadRequest, fmt.Sprintf("Wallet funding check failed: %v", err))
			return
		}

		// Continue with existing preview logic...
	}
}

// handleExecuteSolanaTrade handles trade execution requests
func (r *Router) handleExecuteSolanaTrade() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx := req.Context()

		// Get user from context for authorization
		user := getUserFromContext(ctx)
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		client := r.solanaService.GetClient()

		// Verify testnet connection
		if err := verifyTestnetConnection(ctx, client); err != nil {
			respondError(w, http.StatusServiceUnavailable, fmt.Sprintf("Testnet verification failed: %v", err))
			return
		}

		// Get user's wallet
		wallet, err := r.walletService.GetWallet(ctx, user.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get user wallet: %v", err))
			return
		}

		// Convert wallet public key
		pubKey, err := solana.PublicKeyFromBase58(wallet.PublicKey)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Invalid wallet public key")
			return
		}

		// Verify wallet funding
		if err := verifyWalletFunding(ctx, client, pubKey); err != nil {
			respondError(w, http.StatusBadRequest, fmt.Sprintf("Wallet funding check failed: %v", err))
			return
		}

		// Continue with existing trade execution logic...
	}
}

func (r *Router) handleGetSolanaTradingPairs() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		// Get user from context for authorization
		user := getUserFromContext(req.Context())
		if user == nil {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// For now, return a static list of trading pairs
		// In a real implementation, this would fetch from the Solana network
		tradingPairs := []map[string]interface{}{
			{
				"base_token": map[string]string{
					"symbol":  "SOL",
					"address": "So11111111111111111111111111111111111111112",
					"name":    "Wrapped SOL",
				},
				"quote_token": map[string]string{
					"symbol":  "USDC",
					"address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
					"name":    "USD Coin",
				},
				"price_usd":  "100.50",
				"volume_24h": "1000000",
				"market_cap": "10000000000",
			},
			{
				"base_token": map[string]string{
					"symbol":  "BONK",
					"address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
					"name":    "Bonk",
				},
				"quote_token": map[string]string{
					"symbol":  "USDC",
					"address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
					"name":    "USD Coin",
				},
				"price_usd":  "0.00001234",
				"volume_24h": "500000",
				"market_cap": "1000000",
			},
		}

		respondJSON(w, http.StatusOK, tradingPairs)
	}
}

func (r *SolanaRouter) GetWallet(c *gin.Context) {
	user := c.MustGet("user").(*model.User)

	wallet, err := r.walletService.GetWallet(c.Request.Context(), user.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get wallet: %v", err)})
		return
	}

	c.JSON(http.StatusOK, wallet)
}

func (r *SolanaRouter) FundTestnetWallet(c *gin.Context) {
	user := c.MustGet("user").(*model.User)

	wallet, err := r.walletService.GetWallet(c.Request.Context(), user.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get wallet: %v", err)})
		return
	}

	// Fund the wallet with test SOL
	err = r.solanaService.FundTestnetWallet(c.Request.Context(), wallet.PublicKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to fund wallet: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wallet funded successfully"})
}

func (r *SolanaRouter) GetBalance(c *gin.Context) {
	user := c.MustGet("user").(*model.User)

	wallet, err := r.walletService.GetWallet(c.Request.Context(), user.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get wallet: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"balance": wallet.Balance})
}
