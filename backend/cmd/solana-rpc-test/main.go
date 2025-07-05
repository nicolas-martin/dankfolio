package main

import (
	"context"
	"log"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/olekukonko/tablewriter"
)

func main() {
	rpcClient := rpc.New(rpc.MainNetBeta_RPC)
	solanaClient := solana.NewClient(rpcClient, nil)

	// Your mint authority
	auth := solana.MustPublicKeyFromBase58("S7vYFFWH6BjJyEsdrPQpqpYTqLTrPRK6KW3VwsJuRaS")

	// 1. Get all mint accounts where you're the mint authority
	filters := []rpc.RPCFilter{
		// memcmp at offset 4 matches the mint-authority field in a Mint account
		rpc.RPCFilterMemcmp{Offset: 4, Bytes: auth.Bytes()},
		// fixed size = token.MintAccountSize
		rpc.RPCFilterDataSize{Size: token.MintAccountSize},
	}
	mints, err := rpcClient.GetProgramAccountsWithOpts(
		context.Background(),
		token.ProgramID,
		&rpc.GetProgramAccountsOpts{Filters: filters},
	)
	if err != nil {
		log.Fatalf("fetch mints: %v", err)
	}

	// Prepare table
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Mint", "Name", "Symbol"})

	// Type assert to the concrete client type that has GetMetadataAccount
	client, ok := solanaClient.(*solana.Client)
	if !ok {
		log.Fatalf("Failed to assert solanaClient to *solana.Client type")
	}

	for _, acct := range mints {
		mint := acct.Pubkey
		var name, symbol string

		// 2. Fetch metadata using the internal client
		metadata, err := client.GetMetadataAccount(context.Background(), mint.String())
		if err != nil {
			// Metadata doesn't exist or couldn't be fetched - this is normal for many tokens
			name = "N/A"
			symbol = "N/A"
		} else {
			name = metadata.Data.Name
			symbol = metadata.Data.Symbol
		}

		table.Append([]string{mint.String(), name, symbol})
	}

	table.Render()
}