package main

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/tyler-smith/go-bip39"
)

// generateWallet creates a new wallet and writes its private key to the provided file path.
func generateWallet(filePath string) (solana.PrivateKey, error) {
	// Generate a mnemonic phrase using bip39 for wallet recovery
	entropy, err := bip39.NewEntropy(256)
	if err != nil {
		return nil, err
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return nil, err
	}

	// Derive seed from the mnemonic, and use the first 32 bytes for an ed25519 private key
	seed := bip39.NewSeed(mnemonic, "")
	privateKey := ed25519.NewKeyFromSeed(seed[:32])

	// Serialize the private key bytes as JSON
	pkBytes, err := json.Marshal(privateKey)
	if err != nil {
		return nil, err
	}

	// Write the wallet file with secure permissions
	if err = os.WriteFile(filePath, pkBytes, 0600); err != nil {
		return nil, err
	}

	// Store the recovery mnemonic in a separate file
	recoveryFile := strings.Replace(filePath, "mainnet-wallet", "mainnet-wallet-recovery", 1)
	recoveryFile = strings.Replace(recoveryFile, ".json", ".txt", 1)
	if err = os.WriteFile(recoveryFile, []byte(mnemonic), 0600); err != nil {
		return nil, err
	}

	fmt.Printf("🚀 Generated new wallet.\n🔑 Public Key: %s\n📝 Recovery Phrase stored in %s\n", solana.PrivateKey(privateKey).PublicKey().String(), recoveryFile)
	return solana.PrivateKey(privateKey), nil
}

// waitForFunds polls the account until funds are detected.
func waitForFunds(client *rpc.Client, publicKey solana.PublicKey) {
	fmt.Printf("⏳ Waiting for funds to be sent to: %s\n", publicKey.String())
	fmt.Println("💡 This address is new and will be created once you send SOL to it")

	for {
		info, err := client.GetAccountInfo(context.Background(), publicKey)
		if err != nil {
			// Skip logging "not found" errors as they're expected for new accounts
			if !strings.Contains(err.Error(), "not found") {
				log.Printf("Error fetching account info: %v", err)
			}
		} else if info != nil && info.Value != nil && info.Value.Lamports > 0 {
			solBalance := float64(info.Value.Lamports) / float64(solana.LAMPORTS_PER_SOL)
			fmt.Printf("🎉 Funds received! Current balance: %.9f SOL (%d lamports)\n", solBalance, info.Value.Lamports)
			break
		}
		time.Sleep(5 * time.Second)
		fmt.Print(".") // Show a simple progress indicator
	}
}

func main() {
	baseWalletFile := "../../../keys/mainnet-wallet.json"
	walletFile := baseWalletFile

	if _, err := os.Stat(baseWalletFile); err == nil {
		// Wallet file exists, so generate a new one with an appended numeric suffix
		i := 1
		for {
			newWalletFile := fmt.Sprintf("../../../keys/mainnet-wallet-%d.json", i)
			if _, err := os.Stat(newWalletFile); os.IsNotExist(err) {
				walletFile = newWalletFile
				break
			}
			i++
		}
		fmt.Printf("Wallet file already exists. Creating new wallet file: %s\n", walletFile)
	} else {
		fmt.Println("Wallet file not found. Generating a new wallet...")
	}

	pk, err := generateWallet(walletFile)
	if err != nil {
		log.Fatalf("Failed to generate wallet: %v", err)
	}
	privateKey := pk

	// Connect to Solana mainnet-beta
	client := rpc.New("https://api.mainnet-beta.solana.com")

	// Wait for funds to be sent to the wallet
	waitForFunds(client, privateKey.PublicKey())
}
