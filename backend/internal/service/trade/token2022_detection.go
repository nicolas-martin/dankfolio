package trade

import (
	"strings"
)

// isToken2022 checks if a token is a Token2022 token based on known patterns
// Token2022 tokens cannot have platform fees collected the same way as regular SPL tokens
func isToken2022(mintAddress string) bool {
	// xStocks tokens are all Token2022
	// They all start with "Xs" prefix
	return strings.HasPrefix(mintAddress, "Xs")
}

// shouldDisablePlatformFees determines if platform fees should be disabled for a swap
func shouldDisablePlatformFees(inputMint, outputMint string) bool {
	// If either input or output is a Token2022 token, disable platform fees
	// Jupiter error 0x177e (6014) = IncorrectTokenProgramID occurs when trying
	// to take platform fees on Token2022 tokens
	return isToken2022(inputMint) || isToken2022(outputMint)
}

