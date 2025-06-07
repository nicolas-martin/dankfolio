package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	// "github.com/davecgh/go-spew/spew"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	solanaClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/olekukonko/tablewriter"
)

func main() {
	// Replace with your actual RPC endpoint
	solApiKey := os.Getenv("SOLANA_RPC_API_KEY")
	solEndpoint := os.Getenv("SOLANA_RPC_ENDPOINT")
	if solApiKey == "" || solEndpoint == "" {
		log.Fatal("set SOLANA_RPC_API_KEY and SOLANA_RPC_ENDPOINT")
	}

	header := map[string]string{
		"Authorization": "Bearer " + solApiKey,
	}
	solRPC := rpc.NewWithHeaders(solEndpoint, header)
	// Create API tracker
	apiTracker := clients.NewAPICallTracker()

	_ = solanaClient.NewClient(solRPC, apiTracker)

	// Contract address from the issue
	contractAddress := solana.MustPublicKeyFromBase58("GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R")

	ctx := context.Background()
	programid := solana.MustPublicKeyFromBase58("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
	// GetProgramAccounts
	programAccounts, err := solRPC.GetProgramAccounts(ctx, programid)
	if err != nil {
		log.Printf("Error getting program accounts: %v", err)
	} else {
		fmt.Println("Program Accounts:")
		tableProgramAccounts := tablewriter.NewWriter(os.Stdout)
		tableProgramAccounts.Header([]string{"Public Key", "Mint", "Owner", "Amount", "UI Amount"}) // Changed here
		var programAccountsData [][]string
		for _, acct := range programAccounts {
			raw := acct.Account.Data.GetRawJSON()
			var info ProgramAccountInfo
			if err = json.Unmarshal(raw, &info); err != nil {
				log.Printf("failed to parse %s: %v", acct.Pubkey, err)
				continue
			}
			programAccountsData = append(programAccountsData, []string{
				acct.Pubkey.String(),
				info.Parsed.Info.Mint,
				info.Parsed.Info.Owner,
				info.Parsed.Info.TokenAmount.Amount,
				fmt.Sprintf("%.6f", info.Parsed.Info.TokenAmount.UiAmount),
			})

		}
		tableProgramAccounts.Bulk(programAccountsData) // Changed here
		tableProgramAccounts.Render()
		fmt.Println()
	}

	largestAccounts, err := solRPC.GetLargestAccounts(ctx, rpc.CommitmentFinalized, rpc.LargestAccountsFilterCirculating)
	if err != nil {
		log.Printf("Error getting largest accounts: %s", err.Error())
	} else {
		fmt.Println("Largest Accounts:")
		tableLargestAccounts := tablewriter.NewWriter(os.Stdout)
		tableLargestAccounts.Header([]string{"Address", "Lamports"}) // Changed here
		var largestAccountsData [][]string
		if largestAccounts != nil && largestAccounts.Value != nil {
			for _, account := range largestAccounts.Value {
				largestAccountsData = append(largestAccountsData, []string{account.Address.String(), fmt.Sprintf("%d", account.Lamports)})
			}
		}
		tableLargestAccounts.Bulk(largestAccountsData) // Changed here
		tableLargestAccounts.Render()
		fmt.Println()
	}

	// GetSupply
	// Provide default commitment for GetSupply
	supply, err := solRPC.GetSupply(ctx, rpc.CommitmentFinalized)
	if err != nil {
		log.Printf("Error getting supply: %s", err.Error())
	} else {
		fmt.Println("Supply:")
		tableSupply := tablewriter.NewWriter(os.Stdout)
		tableSupply.Header([]string{"Total", "Circulating", "Non-Circulating"}) // Changed here
		var supplyData [][]string
		if supply != nil && supply.Value != nil {
			supplyData = append(supplyData, []string{
				fmt.Sprintf("%d", supply.Value.Total),
				fmt.Sprintf("%d", supply.Value.Circulating),
				fmt.Sprintf("%d", supply.Value.NonCirculating),
			})
		}
		tableSupply.Bulk(supplyData) // Changed here
		tableSupply.Render()
		fmt.Println()
	}

	// GetTokenAccountsByOwner
	// Replace with the actual owner and mint public keys for testing this
	// Using the contract address as owner for demonstration, and a common mint (USDC)
	// You might need to find a relevant mint for the given contract address or use a different owner
	ownerAddress := contractAddress
	mintAddress := solana.MustPublicKeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC Mint

	out, err := solRPC.GetTokenAccountsByOwner(
		context.Background(),
		ownerAddress,
		&rpc.GetTokenAccountsConfig{
			ProgramId: solana.TokenProgramID.ToPointer(),
		},
		&rpc.GetTokenAccountsOpts{
			Encoding:   solana.EncodingJSONParsed,
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		log.Fatalf("Error getting token accounts by owner: %v", err)
	}
	fmt.Printf("Token Accounts by Owner (Owner: %s, Mint: %s):\n", ownerAddress.String(), mintAddress.String()) // Used Printf
	tableTokenAccounts := tablewriter.NewWriter(os.Stdout)
	tableTokenAccounts.Header([]string{"Mint", "Owner", "Amount", "UI Amount", "Decimals"}) // Changed here
	var tokenAccountsData [][]string
	if out != nil && out.Value != nil {
		// spew.Dump(out)

		{
			for _, acct := range out.Value {

				raw := acct.Account.Data.GetRawJSON()
				var p infoParser
				if err := json.Unmarshal(raw, &p); err != nil {
					log.Printf("unmarshal failed for %s: %v", acct.Pubkey, err)
					continue
				}
				tableTokenAccounts.Append([]string{p.Parsed.Info.Mint, p.Parsed.Info.Owner, p.Parsed.Info.TokenAmount.Amount, fmt.Sprintf("%f", p.Parsed.Info.TokenAmount.UiAmount), fmt.Sprintf("%d", p.Parsed.Info.TokenAmount.Decimals)})
			}
			// spew.Dump(tokenAccounts)
		}
	} else {
		fmt.Println("No token accounts found for the specified owner and mint.")
	}
	tableTokenAccounts.Bulk(tokenAccountsData) // Changed here
	tableTokenAccounts.Render()
	fmt.Println()
}

type infoParser struct {
	Parsed struct {
		Info struct {
			Mint        string `json:"mint"`
			Owner       string `json:"owner"`
			TokenAmount struct {
				Amount   string  `json:"amount"`
				UiAmount float64 `json:"uiAmount"`
				Decimals uint8   `json:"decimals"`
			} `json:"tokenAmount"`
		} `json:"info"`
	} `json:"parsed"`
}

// ProgramAccountInfo matches the JSON layout under data.parsed.info
type ProgramAccountInfo struct {
	Parsed struct {
		Info struct {
			Mint        string `json:"mint"`
			Owner       string `json:"owner"`
			TokenAmount struct {
				Amount   string  `json:"amount"`
				UiAmount float64 `json:"uiAmount"`
				Decimals uint8   `json:"decimals"`
			} `json:"tokenAmount"`
		} `json:"info"`
	} `json:"parsed"`
}
