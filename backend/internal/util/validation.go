package util

import (
	"regexp"
)

// IsValidSolanaAddress checks if the given address is a valid Solana address.
// A valid Solana address is a Base58 encoded string typically between 32 and 44 characters.
func IsValidSolanaAddress(address string) bool {
	if len(address) < 32 || len(address) > 44 {
		return false
	}
	return IsValidBase58(address)
}

// IsValidBase58 checks if the given string contains only Base58 characters.
func IsValidBase58(str string) bool {
	// Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
	// This regex checks if all characters in the string are valid Base58 characters.
	// It does not check for length, as that can vary depending on the use case (e.g., address vs transaction signature).
	matched, _ := regexp.MatchString("^[1-9A-HJ-NP-Za-km-z]+$", str)
	return matched
}
