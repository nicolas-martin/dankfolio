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
	// solData, err := s.rpcClient.GetBalance(
	// 	ctx,
	// 	pubKey,
	// 	rpc.CommitmentConfirmed,
	// )
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
		log.Fatalf("failed to get recent blockhash: %v", err)
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
	table.SetHeader([]string{"Token ID", "Amount"})
	for _, account := range accounts.Value {
		parsedData := account.Account.Data.GetRawJSON()
		if len(parsedData) == 0 {
			continue
		}
		if err := json.Unmarshal(parsedData, &parsedAccount); err != nil {
			log.Printf("failed to parse account data: %v", err)
		}
		table.Append([]string{parsedAccount.Parsed.Info.Mint, fmt.Sprintf("%.9f", parsedAccount.Parsed.Info.TokenAmount.UiAmount)})
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
