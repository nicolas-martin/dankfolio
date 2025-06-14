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

// IsValidSolanaAddress checks if the given address string is a valid Solana public key
// that lies on the ed25519 curve.
// This means it will return `false` for Program Derived Addresses (PDAs), as they are not on the curve.
func IsValidSolanaAddress(address string) bool {
	if len(address) < minAddressLength || len(address) > maxAddressLength {
		return false
	}
	// Pre-validate with regex. PublicKeyFromBase58 also does validation,
	// but this can be a quick check for obviously invalid characters.
	if !base58Regex.MatchString(address) {
		return false
	}

	pubKey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return false // Error during Base58 decoding or if not a valid pubkey format for the lib
	}

	// A valid public key must be on the ed25519 curve.
	// Note: Program Derived Addresses (PDAs) are *not* on the curve by design.
	// This function will return false for PDAs. If PDA validation is needed,
	// (e.g. checking if an address *could* be a PDA or is a valid address format regardless of curve status),
	// a different or more nuanced function would be required.
	return pubKey.IsOnCurve()
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
