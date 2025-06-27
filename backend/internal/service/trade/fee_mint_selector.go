package trade

import (
	"context"
	"encoding/json"
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
	ataChecker         func(context.Context, solanago.PublicKey) bool
}

// NewFeeMintSelector creates a new fee mint selector
func NewFeeMintSelector(platformFeeAccount string, ataChecker func(context.Context, solanago.PublicKey) bool) *FeeMintSelector {
	return &FeeMintSelector{
		platformFeeAccount: platformFeeAccount,
		ataChecker:         ataChecker,
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

	// Priority 2: Apply our fee mint selection logic
	var candidateMints []string
	
	switch swapMode {
	case "ExactOut":
		// For ExactOut, must use input mint ONLY (Jupiter requirement)
		candidateMints = []string{inputMint}
		slog.Debug("ExactOut swap: must use input mint for fees", "mint", inputMint)
		
	case "ExactIn", "":
		// For ExactIn, we can use either input or output mint
		// Prefer WSOL if it's involved (better liquidity for fee collection)
		if outputMint == WSOLMint {
			candidateMints = []string{WSOLMint, inputMint}
			slog.Debug("ExactIn swap with WSOL output: preferring WSOL for fees")
		} else if inputMint == WSOLMint {
			candidateMints = []string{WSOLMint, outputMint}
			slog.Debug("ExactIn swap with WSOL input: preferring WSOL for fees")
		} else {
			// Token-to-token swap: try input first, then output
			candidateMints = []string{inputMint, outputMint}
			slog.Debug("ExactIn token-to-token swap: trying input mint first", 
				"input", inputMint, "output", outputMint)
		}
		
	default:
		slog.Warn("Unknown swap mode, defaulting to input mint", "swapMode", swapMode)
		candidateMints = []string{inputMint}
	}

	// Try each candidate mint in order of preference
	for _, mint := range candidateMints {
		ata, err := s.calculateAndCheckATA(ctx, platformPubKey, mint)
		if err != nil {
			slog.Debug("Error calculating ATA", "mint", mint, "error", err)
			continue
		}
		if ata != "" {
			slog.Info("Selected fee mint with existing ATA", 
				"mint", mint, 
				"ata", ata,
				"swapMode", swapMode)
			return ata, mint, nil
		}
	}

	// No suitable ATA found
	slog.Warn("No platform ATAs exist for fee collection",
		"inputMint", inputMint,
		"outputMint", outputMint,
		"swapMode", swapMode,
		"candidateMints", candidateMints)
	
	return "", "", nil
}

// calculateAndCheckATA calculates the ATA address and checks if it exists
func (s *FeeMintSelector) calculateAndCheckATA(
	ctx context.Context,
	owner solanago.PublicKey,
	mint string,
) (string, error) {
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
	var rawQuote map[string]interface{}
	if err := json.Unmarshal(quoteRaw, &rawQuote); err == nil {
		if platformFee, ok := rawQuote["platformFee"].(map[string]interface{}); ok {
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
	inputMint string,
	outputMint string,
	swapMode string,
	quoteRaw []byte,
	ataChecker func(context.Context, solanago.PublicKey) bool,
) (feeAccountATA string, selectedFeeMint string) {
	selector := NewFeeMintSelector(platformFeeAccount, ataChecker)
	
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