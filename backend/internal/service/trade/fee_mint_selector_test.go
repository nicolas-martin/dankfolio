package trade

import (
	"context"
	"testing"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFeeMintSelector_NativeSolNormalization(t *testing.T) {
	ctx := context.Background()
	platformAccount := "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"
	nativeSolMint := "11111111111111111111111111111111"
	wsolMint := "So11111111111111111111111111111111111111112"
	tokenMint := "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"

	// Mock ATA checker that returns true for wSOL ATA
	ataChecker := func(ctx context.Context, ata solanago.PublicKey) bool {
		// Only return true for wSOL ATA
		platformPubKey, _ := solanago.PublicKeyFromBase58(platformAccount)
		wsolPubKey, _ := solanago.PublicKeyFromBase58(wsolMint)
		expectedATA, _, _ := solanago.FindAssociatedTokenAddress(platformPubKey, wsolPubKey)
		return ata.String() == expectedATA.String()
	}

	// Mock ATA creator
	ataCreator := func(ctx context.Context, owner, mint solanago.PublicKey, signerKey *solanago.PrivateKey) error {
		return nil
	}

	// Create dummy private key
	dummyPrivKey := make([]byte, 64)
	privateKey := solanago.PrivateKey(dummyPrivKey)

	selector := NewFeeMintSelector(platformAccount, &privateKey, ataChecker, ataCreator)

	tests := []struct {
		name           string
		inputMint      string
		outputMint     string
		swapMode       string
		expectedMint   string
		description    string
	}{
		{
			name:         "Native SOL input ExactIn",
			inputMint:    nativeSolMint,
			outputMint:   tokenMint,
			swapMode:     "ExactIn",
			expectedMint: wsolMint,
			description:  "Native SOL input should be normalized to wSOL",
		},
		{
			name:         "Native SOL output ExactIn",
			inputMint:    tokenMint,
			outputMint:   nativeSolMint,
			swapMode:     "ExactIn",
			expectedMint: wsolMint,
			description:  "Native SOL output should result in wSOL fee mint",
		},
		{
			name:         "Native SOL input ExactOut",
			inputMint:    nativeSolMint,
			outputMint:   tokenMint,
			swapMode:     "ExactOut",
			expectedMint: wsolMint,
			description:  "Native SOL input ExactOut should be normalized to wSOL",
		},
		{
			name:         "wSOL input ExactIn",
			inputMint:    wsolMint,
			outputMint:   tokenMint,
			swapMode:     "ExactIn",
			expectedMint: wsolMint,
			description:  "wSOL input should remain wSOL",
		},
		{
			name:         "Token to token ExactIn",
			inputMint:    tokenMint,
			outputMint:   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
			swapMode:     "ExactIn",
			expectedMint: tokenMint,
			description:  "Token to token should use input mint",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ata, selectedMint, err := selector.SelectFeeMint(ctx, tt.inputMint, tt.outputMint, tt.swapMode, nil)
			
			require.NoError(t, err, "SelectFeeMint should not error")
			assert.Equal(t, tt.expectedMint, selectedMint, tt.description)
			
			// Verify ATA is for the selected mint
			if selectedMint == wsolMint {
				assert.NotEmpty(t, ata, "Should have ATA for wSOL")
			}
		})
	}
}

func TestFeeMintSelector_ATAConversion(t *testing.T) {
	ctx := context.Background()
	platformAccount := "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"
	nativeSolMint := "11111111111111111111111111111111"
	wsolMint := "So11111111111111111111111111111111111111112"

	// Track ATA creation attempts
	var createdATAs []string

	ataChecker := func(ctx context.Context, ata solanago.PublicKey) bool {
		return false // Always return false to trigger creation
	}

	ataCreator := func(ctx context.Context, owner, mint solanago.PublicKey, signerKey *solanago.PrivateKey) error {
		createdATAs = append(createdATAs, mint.String())
		return nil
	}

	dummyPrivKey := make([]byte, 64)
	privateKey := solanago.PrivateKey(dummyPrivKey)

	selector := NewFeeMintSelector(platformAccount, &privateKey, ataChecker, ataCreator)

	// Test native SOL conversion in calculateAndCheckATA
	platformPubKey, _ := solanago.PublicKeyFromBase58(platformAccount)
	selector.calculateAndCheckATA(ctx, platformPubKey, nativeSolMint)

	// Should attempt to create ATA for wSOL, not native SOL
	assert.Len(t, createdATAs, 0, "calculateAndCheckATA should not create ATA")

	// Test native SOL conversion in ensureATA
	createdATAs = nil
	selector.ensureATA(ctx, platformPubKey, nativeSolMint)

	// Should create ATA for wSOL
	assert.Len(t, createdATAs, 1, "Should create one ATA")
	assert.Equal(t, wsolMint, createdATAs[0], "Should create ATA for wSOL, not native SOL")
}

func TestFeeMintSelector_JupiterRecommendation(t *testing.T) {
	ctx := context.Background()
	platformAccount := "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"

	ataChecker := func(ctx context.Context, ata solanago.PublicKey) bool {
		return true // All ATAs exist
	}

	selector := NewFeeMintSelector(platformAccount, nil, ataChecker, nil)

	// Test with Jupiter recommendation
	jupiterQuote := &jupiter.QuoteResponse{
		PlatformFee: &jupiter.PlatformFee{
			FeeMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
			Amount:  "1000",
		},
	}

	ata, selectedMint, err := selector.SelectFeeMint(
		ctx,
		"So11111111111111111111111111111111111111112",
		"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
		"ExactIn",
		jupiterQuote,
	)

	require.NoError(t, err)
	assert.Equal(t, jupiterQuote.PlatformFee.FeeMint, selectedMint, "Should use Jupiter's recommended fee mint")
	assert.NotEmpty(t, ata, "Should have ATA for recommended mint")
}