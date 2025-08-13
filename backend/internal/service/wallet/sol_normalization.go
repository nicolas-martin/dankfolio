package wallet

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"

	bclient "github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

// SOLNormalizer handles the complexity of native SOL vs wSOL for balance operations
type SOLNormalizer struct {
	chainClient bclient.GenericClientAPI
}

// NewSOLNormalizer creates a new SOL normalization helper
func NewSOLNormalizer(chainClient bclient.GenericClientAPI) *SOLNormalizer {
	return &SOLNormalizer{
		chainClient: chainClient,
	}
}

// GetCombinedSOLBalance gets both native SOL and wSOL balances and combines them
func (n *SOLNormalizer) GetCombinedSOLBalance(ctx context.Context, address string) (*Balance, error) {
	var totalUIAmount float64
	var totalRawAmount uint64

	slog.Debug("Getting combined SOL balance", "address", address)

	// 1. Get native SOL balance
	nativeBalance, err := n.chainClient.GetBalance(ctx, bmodel.Address(address), "confirmed")
	if err != nil {
		slog.Warn("Failed to get native SOL balance", "address", address, "error", err)
		// Don't fail entirely - wSOL might still exist
	} else {
		totalUIAmount += nativeBalance.UIAmount
		if rawAmount, parseErr := parseRawAmount(nativeBalance.Amount); parseErr == nil {
			totalRawAmount += rawAmount
		}
		slog.Debug("Native SOL balance", "ui_amount", nativeBalance.UIAmount, "raw_amount", nativeBalance.Amount)
	}

	// 2. Get wSOL token balance (if any wSOL ATA exists)
	wsolBalance, err := n.getWSOLTokenBalance(ctx, address)
	if err != nil {
		slog.Debug("No wSOL token account found", "address", address)
		// This is normal - many wallets don't have wSOL ATAs
	} else {
		totalUIAmount += wsolBalance
		slog.Debug("wSOL token balance", "ui_amount", wsolBalance)
	}

	slog.Info("Combined SOL balance calculated", 
		"address", address,
		"total_sol", totalUIAmount,
		"native_sol", func() float64 {
			if nativeBalance != nil { return nativeBalance.UIAmount }
			return 0
		}(),
		"wsol_tokens", func() float64 {
			if wsolBalance > 0 { return wsolBalance }
			return 0
		}())

	return &Balance{
		ID:     model.NativeSolMint, // Always represent as native SOL to the user
		Amount: totalUIAmount,
	}, nil
}

// getWSOLTokenBalance checks if the wallet has any wSOL token accounts
func (n *SOLNormalizer) getWSOLTokenBalance(ctx context.Context, address string) (float64, error) {
	// Get all token accounts for this address filtered by wSOL mint
	opts := bmodel.TokenAccountsOptions{
		Encoding: "jsonParsed",
	}
	// Use specific mint filter by calling specific wSOL account lookup
	// For now, get all token accounts and filter for wSOL
	accounts, err := n.chainClient.GetTokenAccountsByOwner(ctx, bmodel.Address(address), opts)
	if err != nil {
		return 0, fmt.Errorf("failed to get wSOL token accounts: %w", err)
	}

	var totalBalance float64
	for _, account := range accounts {
		// Only include wSOL accounts
		if string(account.MintAddress) == model.SolMint {
			totalBalance += account.UIAmount
			slog.Debug("Found wSOL token account", 
				"account", account.MintAddress,
				"balance", account.UIAmount)
		}
	}

	return totalBalance, nil
}

// parseRawAmount safely parses the raw amount string to uint64
func parseRawAmount(amountStr string) (uint64, error) {
	if amountStr == "" {
		return 0, nil
	}
	return strconv.ParseUint(amountStr, 10, 64)
}

// ShouldNormalizeToWSOL determines if a mint address should be treated as wSOL for Jupiter calls
func ShouldNormalizeToWSOL(mintAddress string) bool {
	return mintAddress == model.NativeSolMint
}

// NormalizeSOLForJupiter converts native SOL addresses to wSOL for Jupiter API compatibility
func NormalizeSOLForJupiter(mintAddress string) string {
	if mintAddress == model.NativeSolMint {
		return model.SolMint // Convert to wSOL
	}
	return mintAddress
}

// NormalizeSOLForUser converts any SOL variant back to native SOL representation for user display
func NormalizeSOLForUser(mintAddress string) string {
	if mintAddress == model.SolMint {
		return model.NativeSolMint // Convert back to native for user display
	}
	return mintAddress
}

// IsSOLVariant checks if a mint address is any variant of SOL (native or wrapped)
func IsSOLVariant(mintAddress string) bool {
	return mintAddress == model.NativeSolMint || mintAddress == model.SolMint
}