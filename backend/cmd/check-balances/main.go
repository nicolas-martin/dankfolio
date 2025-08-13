package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"github.com/olekukonko/tablewriter"
)

type WalletInfo struct {
	Path      string
	PublicKey string
	Tokens    []wallet.Balance
}

func main() {
	// Parse command line flags
	solApiKey := os.Getenv("SOLANA_RPC_API_KEY")
	solEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	if solApiKey == "" || solEndpoint == "" {
		log.Fatal("set SOLANA_RPC_API_KEY and SOLANA_RPC_ENDPOINT")
	}

	header := map[string]string{
		"Authorization": "Bearer " + solApiKey,
	}
	solRPC := rpc.NewWithHeaders(solEndpoint, header)
	// solanaClient := sgo.NewClient(solRPC)

	k, err := solana.PublicKeyFromBase58("GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R")
	if err != nil {
		log.Fatalf("failed to parse public key: %v", err)
	}
	solData, err := solRPC.GetBalance(
		context.Background(),
		k,
		rpc.CommitmentConfirmed,
	)
	if err != nil {
		log.Fatalf("failed to get SOL balance: %v", err)
	}
	// Get regular SPL token accounts
	accounts, err := solRPC.GetTokenAccountsByOwner(
		context.Background(),
		k,
		&rpc.GetTokenAccountsConfig{
			ProgramId: solana.TokenProgramID.ToPointer(),
		},
		&rpc.GetTokenAccountsOpts{
			Encoding:   solana.EncodingJSONParsed,
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		log.Fatalf("failed to get SPL token accounts: %v", err)
	}
	
	// Get Token2022 accounts
	token2022ProgramID := solana.MustPublicKeyFromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
	accounts2022, err := solRPC.GetTokenAccountsByOwner(
		context.Background(),
		k,
		&rpc.GetTokenAccountsConfig{
			ProgramId: &token2022ProgramID,
		},
		&rpc.GetTokenAccountsOpts{
			Encoding:   solana.EncodingJSONParsed,
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		log.Printf("Note: No Token2022 accounts found (this is normal): %v", err)
	}
	var parsedAccount struct {
		Parsed struct {
			Info struct {
				Mint        string `json:"mint"`
				TokenAmount struct {
					UiAmount float64 `json:"uiAmount"`
				} `json:"tokenAmount"`
			} `json:"info"`
		} `json:"parsed"`
	}

	table := tablewriter.NewWriter(os.Stdout)
	table.Header([]string{"Token ID", "Amount", "Program"}) // Added Program column
	
	// Add SOL balance first
	solBalance := float64(solData.Value) / float64(solana.LAMPORTS_PER_SOL)
	table.Append([]string{"SOL (Native)", fmt.Sprintf("%.9f", solBalance), "System"})
	
	// Process regular SPL tokens
	for _, account := range accounts.Value {
		parsedData := account.Account.Data.GetRawJSON()
		if len(parsedData) == 0 {
			continue
		}
		if err := json.Unmarshal(parsedData, &parsedAccount); err != nil {
			log.Printf("failed to parse account data: %v", err)
			continue
		}
		table.Append([]string{parsedAccount.Parsed.Info.Mint, fmt.Sprintf("%.9f", parsedAccount.Parsed.Info.TokenAmount.UiAmount), "SPL Token"})
	}
	
	// Process Token2022 accounts
	if accounts2022 != nil {
		for _, account := range accounts2022.Value {
			parsedData := account.Account.Data.GetRawJSON()
			if len(parsedData) == 0 {
				continue
			}
			if err := json.Unmarshal(parsedData, &parsedAccount); err != nil {
				log.Printf("failed to parse Token2022 account data: %v", err)
				continue
			}
			// Add Token2022 label to distinguish from regular SPL tokens
			table.Append([]string{parsedAccount.Parsed.Info.Mint, fmt.Sprintf("%.9f", parsedAccount.Parsed.Info.TokenAmount.UiAmount), "Token2022"})
		}
	}

	table.Render()
}

// // Initialize memory store
// store := memory.NewWithConfig(memory.Config{})

// // Initialize HTTP client and Jupiter client using environment variables
// httpClient := &http.Client{
// 	Timeout: time.Second * 10,
// }
// jupiterClient := jupiter.NewClient(httpClient, os.Getenv("JUPITER_API_URL"), os.Getenv("JUPITER_API_KEY"))

// // Initialize coin service using environment variables like main API
// coinServiceConfig := &coin.Config{
// 	BirdEyeBaseURL:        os.Getenv("BIRDEYE_ENDPOINT"),
// 	BirdEyeAPIKey:         os.Getenv("BIRDEYE_API_KEY"),
// 	CoinGeckoAPIKey:       os.Getenv("COINGECKO_API_KEY"),
// 	SolanaRPCEndpoint:     solEndpoint,
// 	NewCoinsFetchInterval: time.Hour, // Default for this utility
// }

// coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store, solanaClient)

// // Initialize the wallet service
// walletService := wallet.New(solRPC, store, coinService)

// // Get wallet balances
// balances, err := walletService.GetWalletBalances(context.Background(), "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R")
// if err != nil {
// 	log.Fatalf("Error getting wallet balances: %v", err)
// }

// table := tablewriter.NewWriter(os.Stdout)
// table.SetHeader([]string{"Token ID", "Amount"})

// for _, balance := range balances.Balances {
// 	table.Append([]string{balance.ID, fmt.Sprintf("%.9f", balance.Amount)})
// }
// table.Render()
// }
