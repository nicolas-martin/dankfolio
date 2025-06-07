package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/olekukonko/tablewriter"
	solanaClient "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
)

func main() {
	// Replace with your actual RPC endpoint
	rpcEndpoint := "https://api.mainnet-beta.solana.com"
	client := rpc.New(rpcEndpoint)
	solClient := solanaClient.NewClient(client)

	// Contract address from the issue
	contractAddress := solana.MustPublicKeyFromBase58("0x0c582EA5737AA66FeC20BE123C4457150F556F1d")

	ctx := context.Background()

	// GetProgramAccounts
	programAccounts, err := solClient.GetProgramAccounts(ctx, contractAddress)
	if err != nil {
		log.Fatalf("Error getting program accounts: %v", err)
	}
	fmt.Println("Program Accounts:")
	tableProgramAccounts := tablewriter.NewWriter(os.Stdout)
	tableProgramAccounts.Header([]string{"Public Key", "Account Data Length"}) // Changed here
	var programAccountsData [][]string
	if programAccounts != nil && programAccounts.Value != nil {
		for _, account := range programAccounts.Value {
			programAccountsData = append(programAccountsData, []string{account.Pubkey.String(), fmt.Sprintf("%d", len(account.Account.Data.GetBinary()))})
		}
	}
	tableProgramAccounts.Bulk(programAccountsData) // Changed here
	tableProgramAccounts.Render()
	fmt.Println()

	// GetLargestAccounts
	// Provide default commitment and filter for GetLargestAccounts
	largestAccounts, err := solClient.GetLargestAccounts(ctx, rpc.CommitmentFinalized, nil)
	if err != nil {
		log.Fatalf("Error getting largest accounts: %v", err)
	}
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

	// GetSupply
	// Provide default commitment for GetSupply
	supply, err := solClient.GetSupply(ctx, rpc.CommitmentFinalized)
	if err != nil {
		log.Fatalf("Error getting supply: %v", err)
	}
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

	// GetTokenAccountsByOwner
	// Replace with the actual owner and mint public keys for testing this
	// Using the contract address as owner for demonstration, and a common mint (USDC)
	// You might need to find a relevant mint for the given contract address or use a different owner
	ownerAddress := contractAddress
	mintAddress := solana.MustPublicKeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC Mint

	tokenAccounts, err := solClient.GetTokenAccountsByOwner(ctx, ownerAddress, mintAddress, solana.EncodingJSONParsed)
	if err != nil {
		log.Fatalf("Error getting token accounts by owner: %v", err)
	}
	fmt.Printf("Token Accounts by Owner (Owner: %s, Mint: %s):\n", ownerAddress.String(), mintAddress.String()) // Used Printf
	tableTokenAccounts := tablewriter.NewWriter(os.Stdout)
	tableTokenAccounts.Header([]string{"Public Key", "Account Data Length"}) // Changed here
	var tokenAccountsData [][]string
	if tokenAccounts != nil && tokenAccounts.Value != nil {
		for _, account := range tokenAccounts.Value {
			tokenAccountsData = append(tokenAccountsData, []string{account.Pubkey.String(), fmt.Sprintf("%d", len(account.Account.Data.GetBinary()))})
		}
	} else {
		fmt.Println("No token accounts found for the specified owner and mint.")
	}
	tableTokenAccounts.Bulk(tokenAccountsData) // Changed here
	tableTokenAccounts.Render()
	fmt.Println()
}
