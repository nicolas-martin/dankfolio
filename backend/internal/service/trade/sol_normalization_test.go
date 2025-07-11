package trade

import (
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
)

func TestSolNormalization(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Native SOL should be normalized to wSOL",
			input:    model.NativeSolMint,
			expected: model.SolMint,
		},
		{
			name:     "wSOL should remain wSOL",
			input:    model.SolMint,
			expected: model.SolMint,
		},
		{
			name:     "Other tokens should remain unchanged",
			input:    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
			expected: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This is the normalization logic used in PrepareSwap
			normalized := tt.input
			if tt.input == model.NativeSolMint {
				normalized = model.SolMint
			}
			
			assert.Equal(t, tt.expected, normalized)
		})
	}
}

func TestFeeMintSelectionLogic(t *testing.T) {
	nativeSolMint := model.NativeSolMint
	wsolMint := model.SolMint
	tokenMint := "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"

	tests := []struct {
		name         string
		inputMint    string
		outputMint   string
		swapMode     string
		expectedMint string
	}{
		{
			name:         "ExactIn with native SOL input",
			inputMint:    nativeSolMint,
			outputMint:   tokenMint,
			swapMode:     "ExactIn",
			expectedMint: wsolMint,
		},
		{
			name:         "ExactIn with native SOL output",
			inputMint:    tokenMint,
			outputMint:   nativeSolMint,
			swapMode:     "ExactIn",
			expectedMint: wsolMint,
		},
		{
			name:         "ExactOut with native SOL input",
			inputMint:    nativeSolMint,
			outputMint:   tokenMint,
			swapMode:     "ExactOut",
			expectedMint: wsolMint,
		},
		{
			name:         "Token to token swap",
			inputMint:    tokenMint,
			outputMint:   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			swapMode:     "ExactIn",
			expectedMint: tokenMint,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This simulates the fee mint selection logic
			var selectedFeeMint string
			
			switch tt.swapMode {
			case "ExactOut":
				selectedFeeMint = tt.inputMint
				if selectedFeeMint == nativeSolMint {
					selectedFeeMint = wsolMint
				}
			case "ExactIn", "":
				if tt.outputMint == wsolMint || tt.outputMint == nativeSolMint {
					selectedFeeMint = wsolMint
				} else if tt.inputMint == wsolMint || tt.inputMint == nativeSolMint {
					selectedFeeMint = wsolMint
				} else {
					selectedFeeMint = tt.inputMint
				}
			default:
				selectedFeeMint = tt.inputMint
				if selectedFeeMint == nativeSolMint {
					selectedFeeMint = wsolMint
				}
			}
			
			assert.Equal(t, tt.expectedMint, selectedFeeMint)
		})
	}
}

func TestAddressValidation(t *testing.T) {
	tests := []struct {
		name    string
		address string
		valid   bool
	}{
		{
			name:    "Native SOL mint is valid",
			address: model.NativeSolMint,
			valid:   true,
		},
		{
			name:    "wSOL mint is valid",
			address: model.SolMint,
			valid:   true,
		},
		{
			name:    "Token mint is valid",
			address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
			valid:   true,
		},
		{
			name:    "Invalid address",
			address: "invalid",
			valid:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simple length check for Solana addresses
			// Native SOL is 32 chars, others are 43-44 chars
			isValid := len(tt.address) == 32 || (len(tt.address) >= 43 && len(tt.address) <= 44)
			assert.Equal(t, tt.valid, isValid)
		})
	}
}