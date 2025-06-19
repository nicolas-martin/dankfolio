package util

import (
	"regexp"

	"github.com/gagliardetto/solana-go" // Ensure this import
)

// Base58 validation regex
var base58Regex = regexp.MustCompile("^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$")

const (
	minAddressLength = 32
	maxAddressLength = 44
)

// IsValidSolanaAddress checks if the given address string is a valid Solana address.
// This includes both regular addresses (on ed25519 curve) and Program Derived Addresses (PDAs).
// PDAs are valid Solana addresses but are not on the curve by design.
func IsValidSolanaAddress(address string) bool {
	if len(address) < minAddressLength || len(address) > maxAddressLength {
		return false
	}
	// Pre-validate with regex. PublicKeyFromBase58 also does validation,
	// but this can be a quick check for obviously invalid characters.
	if !base58Regex.MatchString(address) {
		return false
	}

	_, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return false // Error during Base58 decoding or if not a valid pubkey format for the lib
	}

	// If we can successfully parse it as a PublicKey, it's a valid Solana address.
	// This includes both regular addresses (on curve) and PDAs (off curve).
	return true
}

// IsValidBase58 checks if the given string contains only Base58 characters.
// This function is useful for validating transaction signatures or other Base58 encoded strings
// where the on-curve property of a Solana PublicKey is not relevant.
func IsValidBase58(str string) bool {
	// Check if the string is empty, as the regex will match an empty string with `+` if not careful,
	// though `+` means one or more. An empty string is not valid Base58 in most contexts.
	if str == "" {
		return false
	}
	return base58Regex.MatchString(str)

}
