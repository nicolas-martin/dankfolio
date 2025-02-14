package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gagliardetto/solana-go"
	ata "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
)

// LiquidityPool holds keys from the Raydium liquidity pool JSON.
type LiquidityPool struct {
	AmmID     string `json:"ammId"`
	Authority string `json:"authority"`
	BaseMint  string `json:"baseMint"`
	QuoteMint string `json:"quoteMint"`
	// Other fields omitted for brevity.
}

// LiquidityData represents the JSON structure.
type LiquidityData struct {
	Official   []LiquidityPool `json:"official"`
	UnOfficial []LiquidityPool `json:"unOfficial"`
}

// fetchPoolInfo downloads pool data from the API, logs pool details, and returns a pool that contains the given token.
func fetchPoolInfo(apiURL, tokenMint string) (*LiquidityPool, error) {
	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get pool data: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read pool response: %w", err)
	}

	var data LiquidityData
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pool JSON: %w", err)
	}

	allPools := append(data.Official, data.UnOfficial...)
	log.Printf("Fetched %d pools from API", len(allPools))
	for idx, pool := range allPools {
		log.Printf("Pool %d: BaseMint=%s, QuoteMint=%s", idx, pool.BaseMint, pool.QuoteMint)
		// Check if tokenMint matches either the base or quote token.
		if pool.BaseMint == tokenMint || pool.QuoteMint == tokenMint {
			log.Printf("Matching pool found at index %d", idx)
			return &pool, nil
		}
	}
	return nil, fmt.Errorf("pool not found for token %s", tokenMint)
}

func main() {
	// Switch to mainnet endpoints.
	client := rpc.New("https://api.mainnet-beta.solana.com")

	// Load wallet from file
	walletBytes, err := os.ReadFile("keys/mainnet-wallet.json")
	if err != nil {
		log.Fatal("Error reading wallet file:", err)
	}
	var privateKeyBytes []byte
	if err := json.Unmarshal(walletBytes, &privateKeyBytes); err != nil {
		log.Fatal("Error parsing wallet file:", err)
	}
	privateKey := solana.PrivateKey(privateKeyBytes)
	fmt.Printf("🔑 Using wallet address: %s\n", privateKey.PublicKey().String())

	// WIF token mint address on mainnet
	tokenMint := solana.MustPublicKeyFromBase58("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm")

	// Get latest blockhash.
	recentBlockhash, err := client.GetLatestBlockhash(context.Background(), rpc.CommitmentConfirmed)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✅ Got latest blockhash: %s\n", recentBlockhash.Value.Blockhash)

	var instructions []solana.Instruction

	// Create Associated Token Account if needed.
	tokenATA, _, err := solana.FindAssociatedTokenAddress(privateKey.PublicKey(), tokenMint)
	if err != nil {
		log.Fatal(err)
	}
	if _, err := client.GetAccountInfo(context.Background(), tokenATA); err != nil {
		createATAIx := ata.NewCreateInstruction(
			privateKey.PublicKey(), // Payer
			privateKey.PublicKey(), // Wallet address
			tokenMint,              // Mint
		).Build()
		instructions = append(instructions, createATAIx)
		fmt.Printf("🏦 Creating new Associated Token Account: %s\n", tokenATA.String())
	}

	// Use mainnet liquidity pool data.
	apiURL := "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
	poolInfo, err := fetchPoolInfo(apiURL, tokenMint.String())
	if err != nil {
		log.Fatal(err)
	}
	// Convert the AmmID and Authority to public keys.
	poolID := solana.MustPublicKeyFromBase58(poolInfo.AmmID)
	poolAuthority := solana.MustPublicKeyFromBase58(poolInfo.Authority)
	fmt.Printf("🏊 Using Raydium pool:\n  ID: %s\n  Authority: %s\n", poolID, poolAuthority)

	// Build Raydium swap instruction.
	swapInstruction := solana.NewInstruction(
		solana.MustPublicKeyFromBase58("675kPX9MHJBtzV3MThEBqyX4Z8FQw3MqmHsugjvLT5y"), // Raydium Swap v2 Program ID
		[]*solana.AccountMeta{
			{PublicKey: poolID, IsSigner: false, IsWritable: true},                // POOL_ID
			{PublicKey: poolAuthority, IsSigner: false, IsWritable: false},        // POOL_AUTHORITY
			{PublicKey: privateKey.PublicKey(), IsSigner: true, IsWritable: true}, // Payer
			{PublicKey: tokenATA, IsSigner: false, IsWritable: true},              // Destination token account
			{PublicKey: token.ProgramID, IsSigner: false, IsWritable: false},      // Token program
			{PublicKey: system.ProgramID, IsSigner: false, IsWritable: false},     // System program
		},
		[]byte{}, // Replace with actual swap parameters.
	)
	instructions = append(instructions, swapInstruction)

	// Create transaction.
	tx, err := solana.NewTransaction(
		instructions,
		recentBlockhash.Value.Blockhash,
		solana.TransactionPayer(privateKey.PublicKey()),
	)
	if err != nil {
		log.Fatal(err)
	}

	// Sign transaction.
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(privateKey.PublicKey()) {
			return &privateKey
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}

	// Send transaction.
	sig, err := client.SendTransaction(context.Background(), tx)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("🚀 Swap submitted! Signature: %s\n", sig)
	fmt.Printf("📱 View on Solana Explorer: https://explorer.solana.com/tx/%s\n", sig)
}
