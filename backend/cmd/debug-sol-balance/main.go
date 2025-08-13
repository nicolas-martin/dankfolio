package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	solanaClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

const walletAddress = "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"

func main() {
	rpcEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	rpcAPIKey := os.Getenv("SOLANA_RPC_API_KEY")

	if rpcEndpoint == "" || rpcAPIKey == "" {
		log.Fatal("Missing SOLANA_RPC_ENDPOINT or SOLANA_RPC_API_KEY")
	}

	fmt.Printf("🔍 Debugging SOL Balance for: %s\n\n", walletAddress)

	// Create Solana client
	client, err := solanaClient.NewClient(rpcEndpoint, rpcAPIKey, 30)
	if err != nil {
		log.Fatalf("Failed to create Solana client: %v", err)
	}

	ctx := context.Background()

	fmt.Println("1️⃣ Native SOL Balance:")
	nativeBalance, err := client.GetBalance(ctx, bmodel.Address(walletAddress), "confirmed")
	if err != nil {
		log.Printf("❌ Error getting native balance: %v", err)
	} else {
		fmt.Printf("   Raw amount: %s lamports\n", nativeBalance.Amount)
		fmt.Printf("   UI amount: %.9f SOL\n", nativeBalance.UIAmount)
		
		// Convert to needed amount
		if rawAmount, parseErr := strconv.ParseUint(nativeBalance.Amount, 10, 64); parseErr == nil {
			fmt.Printf("   In lamports: %d\n", rawAmount)
			fmt.Printf("   Transaction needs: 2,136,720 lamports\n")
			if rawAmount >= 2136720 {
				fmt.Printf("   ✅ Sufficient native SOL for transaction\n")
			} else {
				shortfall := 2136720 - rawAmount
				fmt.Printf("   ❌ Native SOL shortfall: %d lamports (%.9f SOL)\n", shortfall, float64(shortfall)/1e9)
			}
		}
	}

	fmt.Println("\n2️⃣ wSOL Token Balance:")
	wsolAccounts, err := client.GetTokenAccountsByOwner(ctx, bmodel.Address(walletAddress), model.SolMint, "confirmed")
	if err != nil {
		fmt.Printf("   ❌ Error getting wSOL accounts: %v\n", err)
	} else if len(wsolAccounts) == 0 {
		fmt.Println("   ℹ️  No wSOL token accounts found")
	} else {
		var totalWSOL float64
		for i, account := range wsolAccounts {
			fmt.Printf("   Account %d: %.9f wSOL\n", i+1, account.UIAmount)
			totalWSOL += account.UIAmount
		}
		fmt.Printf("   Total wSOL: %.9f SOL\n", totalWSOL)
	}

	fmt.Println("\n3️⃣ All Token Accounts:")
	allAccounts, err := client.GetAllTokenAccountsByOwner(ctx, bmodel.Address(walletAddress), "confirmed")
	if err != nil {
		fmt.Printf("   ❌ Error getting all token accounts: %v\n", err)
	} else {
		solRelatedCount := 0
		for _, account := range allAccounts {
			if account.PubkeyMint == model.SolMint || account.PubkeyMint == model.NativeSolMint {
				fmt.Printf("   SOL-related: %s = %.9f (mint: %s)\n", 
					account.PubkeyMint, account.UIAmount, account.PubkeyMint)
				solRelatedCount++
			}
		}
		if solRelatedCount == 0 {
			fmt.Println("   ℹ️  No SOL-related token accounts found")
		}
		fmt.Printf("   Total token accounts: %d\n", len(allAccounts))
	}

	fmt.Println("\n4️⃣ Direct RPC Check:")
	// Direct RPC call to double-check
	pubkey := solana.MustPublicKeyFromBase58(walletAddress)
	rpcClient := rpc.New(rpcEndpoint)
	rpcClient.SetHeader("Authorization", "Bearer "+rpcAPIKey)
	
	balance, err := rpcClient.GetBalance(ctx, pubkey, rpc.CommitmentConfirmed)
	if err != nil {
		fmt.Printf("   ❌ Direct RPC error: %v\n", err)
	} else {
		fmt.Printf("   Direct RPC: %d lamports (%.9f SOL)\n", balance.Value, float64(balance.Value)/1e9)
	}

	fmt.Println("\n📋 Summary:")
	if nativeBalance != nil {
		if rawAmount, parseErr := strconv.ParseUint(nativeBalance.Amount, 10, 64); parseErr == nil {
			needed := uint64(2136720)
			if rawAmount >= needed {
				fmt.Printf("✅ You have enough SOL: %d >= %d lamports\n", rawAmount, needed)
				fmt.Println("💡 The transaction should work. If it's failing, there might be:")
				fmt.Println("   - A different balance cache issue")
				fmt.Println("   - SOL reserved for rent")
				fmt.Println("   - A concurrent transaction")
			} else {
				fmt.Printf("❌ Insufficient SOL: %d < %d lamports\n", rawAmount, needed)
				shortfall := needed - rawAmount
				fmt.Printf("💰 You need %.9f more SOL\n", float64(shortfall)/1e9)
			}
		}
	}
}