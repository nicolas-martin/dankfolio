package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

type WalletInfo struct {
	Path      string
	PublicKey string
	Balance   uint64
}

func checkBalance(ctx context.Context, client *rpc.Client, keyPath string) (*WalletInfo, error) {
	fmt.Printf("\nChecking balance for: %s\n", keyPath)

	keypair, err := solana.PrivateKeyFromSolanaKeygenFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse keypair: %v", err)
	}

	// Get the balance
	balance, err := client.GetBalance(
		ctx,
		keypair.PublicKey(),
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %v", err)
	}

	fmt.Printf("Public Key: %s\n", keypair.PublicKey())
	fmt.Printf("Balance: %.9f SOL\n", float64(balance.Value)/1e9)

	return &WalletInfo{
		Path:      keyPath,
		PublicKey: keypair.PublicKey().String(),
		Balance:   balance.Value,
	}, nil
}

func main() {
	ctx := context.Background()
	client := rpc.New("https://api.mainnet-beta.solana.com")

	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// Get the project root directory (3 levels up from current directory)
	projectRoot := filepath.Join(wd, "../../..")

	// Define wallet paths to check
	paths := []string{
		filepath.Join(projectRoot, "keys/mainnet-wallet-1.json"),
		filepath.Join(projectRoot, "keys/mainnet-wallet.json"),
		filepath.Join(projectRoot, "backend/keys/mainnet-wallet-1.json"),
	}

	var validWallets []*WalletInfo

	// Check each wallet
	for _, path := range paths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			log.Printf("Error resolving path %s: %v", path, err)
			continue
		}

		info, err := checkBalance(ctx, client, absPath)
		if err != nil {
			log.Printf("Error checking %s: %v", absPath, err)
			continue
		}

		if info != nil {
			validWallets = append(validWallets, info)
		}
	}

	if len(validWallets) > 0 {
		// Find wallet with highest balance
		activeWallet := validWallets[0]
		for _, wallet := range validWallets[1:] {
			if wallet.Balance > activeWallet.Balance {
				activeWallet = wallet
			}
		}

		fmt.Printf("\nActive wallet found:\n")
		fmt.Printf("Path: %s\n", activeWallet.Path)
		fmt.Printf("Public Key: %s\n", activeWallet.PublicKey)
		fmt.Printf("Balance: %.9f SOL\n", float64(activeWallet.Balance)/1e9)

		// Print which files to delete
		for _, wallet := range validWallets {
			if wallet.Path != activeWallet.Path {
				fmt.Printf("\nDelete this wallet (inactive):\n%s\n", wallet.Path)
			}
		}
	} else {
		fmt.Println("No valid wallets found")
	}
}
