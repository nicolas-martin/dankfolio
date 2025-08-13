package wallet

import (
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

func TestSOLNormalizationFunctions(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		function string
	}{
		{
			name:     "Native SOL to wSOL for Jupiter",
			input:    model.NativeSolMint,
			expected: model.SolMint,
			function: "NormalizeSOLForJupiter",
		},
		{
			name:     "wSOL stays wSOL for Jupiter",
			input:    model.SolMint,
			expected: model.SolMint,
			function: "NormalizeSOLForJupiter",
		},
		{
			name:     "Other token stays unchanged for Jupiter",
			input:    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			expected: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			function: "NormalizeSOLForJupiter",
		},
		{
			name:     "wSOL to native SOL for user display",
			input:    model.SolMint,
			expected: model.NativeSolMint,
			function: "NormalizeSOLForUser",
		},
		{
			name:     "Native SOL stays native for user display",
			input:    model.NativeSolMint,
			expected: model.NativeSolMint,
			function: "NormalizeSOLForUser",
		},
		{
			name:     "Other token stays unchanged for user display",
			input:    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			expected: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			function: "NormalizeSOLForUser",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var result string
			
			switch tt.function {
			case "NormalizeSOLForJupiter":
				result = NormalizeSOLForJupiter(tt.input)
			case "NormalizeSOLForUser":
				result = NormalizeSOLForUser(tt.input)
			default:
				t.Fatalf("Unknown function: %s", tt.function)
			}
			
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestIsSOLVariant(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"Native SOL is SOL variant", model.NativeSolMint, true},
		{"wSOL is SOL variant", model.SolMint, true},
		{"USDC is not SOL variant", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", false},
		{"Empty string is not SOL variant", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsSOLVariant(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestShouldNormalizeToWSOL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"Native SOL should be normalized", model.NativeSolMint, true},
		{"wSOL should not be normalized", model.SolMint, false},
		{"Other tokens should not be normalized", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldNormalizeToWSOL(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

// TestSOLMintConstants ensures our mint constants are correct
func TestSOLMintConstants(t *testing.T) {
	if model.NativeSolMint != "11111111111111111111111111111111" {
		t.Errorf("NativeSolMint constant is wrong: %s", model.NativeSolMint)
	}
	
	if model.SolMint != "So11111111111111111111111111111111111111112" {
		t.Errorf("SolMint (wSOL) constant is wrong: %s", model.SolMint)
	}
	
	// Ensure they're different
	if model.NativeSolMint == model.SolMint {
		t.Error("NativeSolMint and SolMint should be different")
	}
}