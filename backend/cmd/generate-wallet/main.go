package main

import (
	"crypto/ed25519" // Use the standard library for key generation from seed
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/tyler-smith/go-bip39"
)

// Define the output filenames
const (
	privateKeyFilename = "wallet.json"  // Will store the 64-byte keypair as JSON array
	publicKeyFilename  = "wallet.pub"   // Will store the public key as Base58 string
	mnemonicFilename   = "mnemonic.txt" // Will store the recovery phrase
)

func main() {
	fmt.Println("Generating new Solana wallet...")

	// 1. Generate a new mnemonic phrase (12 words - 128 bits)
	entropy, err := bip39.NewEntropy(128)
	if err != nil {
		log.Fatalf("FATAL: Failed to generate entropy: %v", err)
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		log.Fatalf("FATAL: Failed to generate mnemonic: %v", err)
	}
	fmt.Printf(" - Generated Mnemonic (SAVE THIS SECURELY!): %s\n", mnemonic)

	// 2. Generate the seed from the mnemonic
	seed := bip39.NewSeed(mnemonic, "") // Standard empty passphrase

	// 3. Create the standard library ed25519 private key (64 bytes) from the first 32 bytes of the seed.
	if len(seed) < 32 {
		log.Fatalf("FATAL: Generated seed is too short: %d bytes, expected at least 32", len(seed))
	}
	// This function returns the 64-byte key: 32-byte private scalar (derived from seed) + 32-byte public key
	stdLibPrivateKey := ed25519.NewKeyFromSeed(seed[:32])
	fmt.Println(" - Derived Ed25519 key material from seed.")

	// 4. Cast the standard library key (which is []byte) to solana.PrivateKey type.
	// The solana-go library uses this 64-byte format internally.
	solanaPrivateKey := solana.PrivateKey(stdLibPrivateKey)

	// 5. Get the corresponding Solana public key using the method from solana.PrivateKey
	publicKey := solanaPrivateKey.PublicKey()
	fmt.Printf(" - Derived Public Key: %s\n", publicKey.String())

	// --- Saving the components ---

	// 6. Save the Solana Private Key (as JSON byte array - full 64 bytes)
	// This format is directly usable by `solana-keygen verify` and other tools expecting the keypair file.
	privateKeyBytes := []byte(solanaPrivateKey) // This is the 64-byte keypair
	jsonData, err := json.Marshal(privateKeyBytes)
	if err != nil {
		log.Fatalf("FATAL: Failed to marshal private key to JSON: %v", err)
	}
	// Use restrictive permissions (read/write for owner only)
	err = os.WriteFile(privateKeyFilename, jsonData, 0o600)
	if err != nil {
		log.Fatalf("FATAL: Failed to write private key file '%s': %v", privateKeyFilename, err)
	}
	fmt.Printf(" - Private Key saved to: %s (JSON format, 64 bytes)\n", privateKeyFilename)

	// 7. Save the Public Key (Base58 string)
	err = os.WriteFile(publicKeyFilename, []byte(publicKey.String()), 0o644) // Readable by others is fine
	if err != nil {
		log.Fatalf("FATAL: Failed to write public key file '%s': %v", publicKeyFilename, err)
	}
	fmt.Printf(" - Public Key saved to: %s\n", publicKeyFilename)

	// 8. Save the Mnemonic Phrase (Plain text)
	err = os.WriteFile(mnemonicFilename, []byte(mnemonic), 0o600) // Restrictive permissions
	if err != nil {
		log.Fatalf("FATAL: Failed to write mnemonic file '%s': %v", mnemonicFilename, err)
	}
	fmt.Printf(" - Mnemonic phrase saved to: %s\n", mnemonicFilename)

	fmt.Println("\n*** SECURITY WARNING ***")
	fmt.Printf("Securely back up your mnemonic phrase file ('%s') AND your private key file ('%s').\n", mnemonicFilename, privateKeyFilename)
	fmt.Println("Anyone with access to these can control your funds. Do NOT commit them to version control (like Git).")
	fmt.Println("Wallet generation complete.")

	// Validation Check (Manual step explained below)
	fmt.Println("\n--- Manual Validation Step ---")
	fmt.Printf("To verify the keypair, run:\n")
	fmt.Printf("solana-keygen verify %s %s\n", publicKey.String(), privateKeyFilename)
	fmt.Println("-----------------------------")
}
