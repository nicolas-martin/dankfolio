package trade

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	solanago "github.com/gagliardetto/solana-go"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
)

const (
	// WSOLMint is the mint address for Wrapped SOL
	WSOLMint = "So11111111111111111111111111111111111111112"
)

// FeeMintSelector handles the logic for selecting the appropriate fee mint
// based on Jupiter's rules and the swap parameters
type FeeMintSelector struct {
	platformFeeAccount string
	platformKey        *solanago.PrivateKey
	ataChecker         func(context.Context, solanago.PublicKey) bool
	ataCreator         func(context.Context, solanago.PublicKey, solanago.PublicKey, *solanago.PrivateKey) error
}

// NewFeeMintSelector creates a new fee mint selector
func NewFeeMintSelector(
	platformFeeAccount string,
	platformKey *solanago.PrivateKey,
	ataChecker func(context.Context, solanago.PublicKey) bool,
	ataCreator func(context.Context, solanago.PublicKey, solanago.PublicKey, *solanago.PrivateKey) error,
) *FeeMintSelector {
	return &FeeMintSelector{
		platformFeeAccount: platformFeeAccount,
		platformKey:        platformKey,
		ataChecker:         ataChecker,
		ataCreator:         ataCreator,
	}
}

// SelectFeeMint determines the best mint to use for platform fee collection
// Returns the fee account ATA address and the mint that will be used for fees
func (s *FeeMintSelector) SelectFeeMint(
	ctx context.Context,
	inputMint string,
	outputMint string,
	swapMode string,
	jupiterQuote *jupiter.QuoteResponse,
) (feeAccountATA string, selectedFeeMint string, err error) {
	if s.platformFeeAccount == "" {
		slog.Debug("No platform fee account configured")
		return "", "", nil
	}

	platformPubKey, err := solanago.PublicKeyFromBase58(s.platformFeeAccount)
	if err != nil {
		return "", "", err
	}

	// Priority 1: Use Jupiter's recommendation if available
	if jupiterQuote != nil && jupiterQuote.PlatformFee != nil && jupiterQuote.PlatformFee.FeeMint != "" {
		recommendedMint := jupiterQuote.PlatformFee.FeeMint
		slog.Debug("Jupiter recommends fee mint", "mint", recommendedMint)

		ata, err := s.calculateAndCheckATA(ctx, platformPubKey, recommendedMint)
		if err == nil && ata != "" {
			return ata, recommendedMint, nil
		}
		slog.Warn("Jupiter recommended fee mint ATA not available", "mint", recommendedMint)
	}

	// Priority 2: Apply our proven fee mint selection logic (from platform-fee-test)
	// Also normalize native SOL to wSOL
	nativeSolMint := "11111111111111111111111111111111"

	switch swapMode {
	case "ExactOut":
		// For ExactOut, must use input mint ONLY (Jupiter requirement)
		selectedFeeMint = inputMint
		// Convert native SOL to wSOL
		if selectedFeeMint == nativeSolMint {
			selectedFeeMint = WSOLMint
			slog.Debug("ExactOut swap: converting native SOL to wSOL for fees")
		}
		slog.Debug("ExactOut swap: using input mint for fees", "mint", selectedFeeMint)

	case "ExactIn", "":
		// For ExactIn, prefer WSOL if it's involved (better liquidity for fee collection)
		// Also handle native SOL by converting to wSOL
		if outputMint == WSOLMint || outputMint == nativeSolMint {
			selectedFeeMint = WSOLMint
			slog.Debug("ExactIn swap with SOL output: using WSOL for fees")
		} else if inputMint == WSOLMint || inputMint == nativeSolMint {
			selectedFeeMint = WSOLMint
			slog.Debug("ExactIn swap with SOL input: using WSOL for fees")
		} else {
			// Token-to-token swap: use input mint (proven strategy)
			selectedFeeMint = inputMint
			slog.Debug("ExactIn token-to-token swap: using input mint for fees",
				"input", inputMint, "output", outputMint)
		}

	default:
		slog.Warn("Unknown swap mode, defaulting to input mint", "swapMode", swapMode)
		selectedFeeMint = inputMint
		// Convert native SOL to wSOL
		if selectedFeeMint == nativeSolMint {
			selectedFeeMint = WSOLMint
		}
	}

	// Check if the selected fee mint has an ATA, create if needed
	ata, err := s.ensureATA(ctx, platformPubKey, selectedFeeMint)
	if err != nil {
		slog.Error("Error ensuring ATA for selected fee mint", "mint", selectedFeeMint, "error", err)
		return "", "", err
	}

	if ata != "" {
		slog.Info("Selected fee mint with ATA",
			"mint", selectedFeeMint,
			"ata", ata,
			"swapMode", swapMode)
		return ata, selectedFeeMint, nil
	}

	// Failed to ensure ATA
	slog.Error("Failed to ensure platform ATA for selected fee mint",
		"inputMint", inputMint,
		"outputMint", outputMint,
		"swapMode", swapMode,
		"selectedFeeMint", selectedFeeMint)

	return "", "", fmt.Errorf("failed to ensure ATA for fee mint %s", selectedFeeMint)
}

// calculateAndCheckATA calculates the ATA address and checks if it exists
func (s *FeeMintSelector) calculateAndCheckATA(
	ctx context.Context,
	owner solanago.PublicKey,
	mint string,
) (string, error) {
	// Convert native SOL to wSOL for ATA checking
	if mint == "11111111111111111111111111111111" {
		mint = WSOLMint
		slog.Debug("Converting native SOL to wSOL for ATA check", "original", "11111111111111111111111111111111", "converted", mint)
	}

	mintPubKey, err := solanago.PublicKeyFromBase58(mint)
	if err != nil {
		return "", err
	}

	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mintPubKey)
	if err != nil {
		return "", err
	}

	// Check if ATA exists
	if s.ataChecker(ctx, ata) {
		return ata.String(), nil
	}

	return "", nil
}

// ensureATA calculates the ATA address, checks if it exists, and creates it if needed
func (s *FeeMintSelector) ensureATA(
	ctx context.Context,
	owner solanago.PublicKey,
	mint string,
) (string, error) {
	// Convert native SOL to wSOL for ATA creation
	if mint == "11111111111111111111111111111111" {
		mint = WSOLMint
		slog.Debug("Converting native SOL to wSOL for ATA creation", "original", "11111111111111111111111111111111", "converted", mint)
	}

	mintPubKey, err := solanago.PublicKeyFromBase58(mint)
	if err != nil {
		return "", err
	}

	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mintPubKey)
	if err != nil {
		return "", err
	}

	// Check if ATA exists
	if s.ataChecker(ctx, ata) {
		slog.Debug("ATA already exists", "mint", mint, "ata", ata.String())
		return ata.String(), nil
	}

	// ATA doesn't exist, create it if we have the creator function and platform key
	if s.ataCreator != nil && s.platformKey != nil {
		slog.Info("Creating platform ATA for fee collection", "mint", mint, "ata", ata.String())

		if err := s.ataCreator(ctx, owner, mintPubKey, s.platformKey); err != nil {
			return "", fmt.Errorf("failed to create ATA: %w", err)
		}

		slog.Info("Successfully created platform ATA", "mint", mint, "ata", ata.String())
		return ata.String(), nil
	}

	// No ATA creator available
	slog.Warn("ATA does not exist and no creator function available", "mint", mint, "ata", ata.String())
	return "", nil
}

// AnalyzeQuoteFeeMint extracts the platform fee mint from a Jupiter quote response
func AnalyzeQuoteFeeMint(quoteRaw []byte) string {
	if len(quoteRaw) == 0 {
		return ""
	}

	var quote jupiter.QuoteResponse
	if err := json.Unmarshal(quoteRaw, &quote); err != nil {
		slog.Debug("Failed to unmarshal quote for fee mint analysis", "error", err)
		return ""
	}

	if quote.PlatformFee != nil && quote.PlatformFee.FeeMint != "" {
		return quote.PlatformFee.FeeMint
	}

	// Fallback: check raw JSON structure
	var rawQuote map[string]any
	if err := json.Unmarshal(quoteRaw, &rawQuote); err == nil {
		if platformFee, ok := rawQuote["platformFee"].(map[string]any); ok {
			if feeMint, ok := platformFee["feeMint"].(string); ok {
				return feeMint
			}
		}
	}

	return ""
}

// DetermineFeeMintForSwap is a convenience function that combines quote analysis and mint selection
func DetermineFeeMintForSwap(
	ctx context.Context,
	platformFeeAccount string,
	platformKey *solanago.PrivateKey,
	inputMint string,
	outputMint string,
	swapMode string,
	quoteRaw []byte,
	ataChecker func(context.Context, solanago.PublicKey) bool,
	ataCreator func(context.Context, solanago.PublicKey, solanago.PublicKey, *solanago.PrivateKey) error,
) (feeAccountATA string, selectedFeeMint string) {
	selector := NewFeeMintSelector(platformFeeAccount, platformKey, ataChecker, ataCreator)

	// Parse quote if available
	var quote *jupiter.QuoteResponse
	if len(quoteRaw) > 0 {
		var q jupiter.QuoteResponse
		if err := json.Unmarshal(quoteRaw, &q); err == nil {
			quote = &q
		}
	}

	ata, mint, err := selector.SelectFeeMint(ctx, inputMint, outputMint, swapMode, quote)
	if err != nil {
		slog.Error("Error selecting fee mint", "error", err)
		return "", ""
	}

	return ata, mint
}
