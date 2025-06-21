package main

import (
	"context"
	"fmt"
	"log"
	"os"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		// Try loading from parent directory
		if err := godotenv.Load("../.env"); err != nil {
			log.Printf("Warning: Could not load .env file: %v", err)
		}
	}

	ctx := context.Background()
	
	// Get RPC URL from environment
	rpcURL := os.Getenv("SOLANA_RPC_URL")
	if rpcURL == "" {
		log.Fatal("SOLANA_RPC_URL not set in environment")
	}

	// Test wallet address
	testWallet := "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"
	
	// Test mint addresses
	solMint := "So11111111111111111111111111111111111111112"  // SOL
	maskMint := "6MQpbiTC2YcogidTmKqMLK82qvE9z5QEm7EP3AEDpump" // MASK token from your transaction
	
	fmt.Printf("Testing dynamic ATA detection\n")
	fmt.Printf("================================\n")
	fmt.Printf("Wallet: %s\n", testWallet)
	fmt.Printf("SOL Mint: %s\n", solMint)
	fmt.Printf("MASK Mint: %s\n", maskMint)
	fmt.Printf("RPC URL: %s\n\n", rpcURL)

	// Initialize test service
	testService := &TestATAService{}

	// Test different swap scenarios
	fmt.Printf("Test Case 1: SOL → MASK\n")
	fmt.Printf("------------------------\n")
	atasNeeded, err := testService.checkRequiredATAs(ctx, testWallet, solMint, maskMint)
	if err != nil {
		log.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("ATAs needed: %d\n", atasNeeded)
		fmt.Printf("Expected: 1 (MASK output ATA)\n")
	}
	
	fmt.Printf("\nTest Case 2: MASK → SOL\n")
	fmt.Printf("------------------------\n")
	atasNeeded, err = testService.checkRequiredATAs(ctx, testWallet, maskMint, solMint)
	if err != nil {
		log.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("ATAs needed: %d\n", atasNeeded)
		fmt.Printf("Expected: 0 or 1 (depending if MASK input ATA exists)\n")
	}

	// Test specific ATA existence
	fmt.Printf("\nDetailed ATA Analysis\n")
	fmt.Printf("=====================\n")
	
	userPubkey, err := solanago.PublicKeyFromBase58(testWallet)
	if err != nil {
		log.Fatalf("Invalid wallet address: %v", err)
	}
	
	maskMintPubkey, err := solanago.PublicKeyFromBase58(maskMint)
	if err != nil {
		log.Fatalf("Invalid MASK mint address: %v", err)
	}
	
	// Check MASK ATA
	maskATA, _, err := solanago.FindAssociatedTokenAddress(userPubkey, maskMintPubkey)
	if err != nil {
		log.Fatalf("Failed to derive MASK ATA: %v", err)
	}
	
	fmt.Printf("MASK ATA Address: %s\n", maskATA.String())
	
	exists := testService.ataExists(ctx, maskATA)
	fmt.Printf("MASK ATA exists: %t\n", exists)
	
	// Show all existing token accounts for comparison
	fmt.Printf("\nAll Token Accounts for wallet:\n")
	fmt.Printf("==============================\n")
	
	rpcClient := rpc.New(rpcURL)
	tokenProgramID := solanago.TokenProgramID
	config := &rpc.GetTokenAccountsConfig{
		ProgramId: &tokenProgramID,
	}
	opts := &rpc.GetTokenAccountsOpts{
		Encoding: solanago.EncodingJSONParsed,
	}
	
	result, err := rpcClient.GetTokenAccountsByOwner(ctx, userPubkey, config, opts)
	if err != nil {
		log.Printf("Error getting token accounts: %v\n", err)
	} else {
		fmt.Printf("Total token accounts found: %d\n", len(result.Value))
		for i, account := range result.Value {
			fmt.Printf("%d. Account: %s\n", i+1, account.Pubkey.String())
			
			// Try to parse the account data to get mint info
			if opts.Encoding == solanago.EncodingJSONParsed {
				data := account.Account.Data.GetRawJSON()
				fmt.Printf("   Data length: %d bytes\n", len(data))
			}
		}
	}
	
	fmt.Printf("\nTest completed successfully!\n")
}

// TestATAService implements the ATA checking logic for testing
type TestATAService struct {
	client interface{
		GetAccountInfo(ctx context.Context, address string) (interface{}, error)
	}
}

func (s *TestATAService) checkRequiredATAs(ctx context.Context, userPublicKey, inputMint, outputMint string) (int, error) {
	const solMint = "So11111111111111111111111111111111111111112"
	
	// Parse the user's public key
	userPubkey, err := solanago.PublicKeyFromBase58(userPublicKey)
	if err != nil {
		return 0, fmt.Errorf("invalid user public key: %w", err)
	}

	atasToCreate := 0

	// Check input mint ATA (skip if it's SOL)
	if inputMint != solMint {
		inputMintPubkey, err := solanago.PublicKeyFromBase58(inputMint)
		if err != nil {
			return 0, fmt.Errorf("invalid input mint: %w", err)
		}
		
		inputATA, _, err := solanago.FindAssociatedTokenAddress(userPubkey, inputMintPubkey)
		if err != nil {
			return 0, fmt.Errorf("failed to derive input ATA address: %w", err)
		}

		// Check if ATA exists
		if !s.ataExists(ctx, inputATA) {
			atasToCreate++
			fmt.Printf("Input ATA needs creation: %s (mint: %s)\n", inputATA.String(), inputMint)
		} else {
			fmt.Printf("Input ATA exists: %s (mint: %s)\n", inputATA.String(), inputMint)
		}
	}

	// Check output mint ATA (skip if it's SOL)
	if outputMint != solMint {
		outputMintPubkey, err := solanago.PublicKeyFromBase58(outputMint)
		if err != nil {
			return 0, fmt.Errorf("invalid output mint: %w", err)
		}
		
		outputATA, _, err := solanago.FindAssociatedTokenAddress(userPubkey, outputMintPubkey)
		if err != nil {
			return 0, fmt.Errorf("failed to derive output ATA address: %w", err)
		}

		// Check if ATA exists
		if !s.ataExists(ctx, outputATA) {
			atasToCreate++
			fmt.Printf("Output ATA needs creation: %s (mint: %s)\n", outputATA.String(), outputMint)
		} else {
			fmt.Printf("Output ATA exists: %s (mint: %s)\n", outputATA.String(), outputMint)
		}
	}

	return atasToCreate, nil
}

func (s *TestATAService) ataExists(ctx context.Context, ataAddress solanago.PublicKey) bool {
	// Use direct RPC call for testing
	rpcURL := os.Getenv("SOLANA_RPC_URL")
	client := rpc.New(rpcURL)
	
	accountInfo, err := client.GetAccountInfo(ctx, ataAddress)
	if err != nil {
		fmt.Printf("Failed to get ATA account info for %s: %v\n", ataAddress.String(), err)
		return false
	}

	// Account exists if it's not nil and not owned by the system program (uninitialized)
	systemProgram := solanago.SystemProgramID
	return accountInfo != nil && accountInfo.Value != nil && !accountInfo.Value.Owner.Equals(systemProgram)
}

