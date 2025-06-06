package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/olekukonko/tablewriter"
)

func main() {
	// Parse command line arguments
	rpcURL := flag.String("rpc", "https://api.mainnet-beta.solana.com", "Solana RPC URL")
	mintAddress := flag.String("mint", "", "Mint address to fetch metadata for")
	apiKey := flag.String("api-key", "", "API key for RPC authentication")
	timeout := flag.Duration("timeout", 30*time.Second, "Request timeout")
	flag.Parse()

	if *mintAddress == "" {
		fmt.Println("Error: Mint address is required")
		fmt.Println("Usage: test-metadata -mint <mint_address> [-rpc <rpc_url>] [-api-key <api_key>] [-timeout <duration>]")
		os.Exit(1)
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	// Initialize RPC client with auth header if API key is provided
	var rpcClient *rpc.Client
	if *apiKey != "" {
		// Create headers map with Authorization header
		headers := map[string]string{
			"Authorization": "Bearer " + *apiKey,
		}
		rpcClient = rpc.NewWithHeaders(*rpcURL, headers)
		fmt.Println("Using RPC URL with API key authentication:", *rpcURL)
	} else {
		rpcClient = rpc.New(*rpcURL)
		fmt.Println("Using RPC URL (no authentication):", *rpcURL)
	}

	// Initialize Solana client
	solanaClient := solana.NewClient(rpcClient)

	// Fetch metadata
	fmt.Println("Fetching metadata for mint:", *mintAddress)

	metadata, err := solanaClient.GetMetadataAccount(ctx, *mintAddress)
	if err != nil {
		log.Fatalf("Error fetching metadata: %v", err)
	}

	// Display results in two ways: formatted table and detailed spew dump

	// 1. Display formatted data in a table
	fmt.Println("\n--- Metadata Summary (Table) ---")

	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Field", "Value"})
	table.SetBorder(false)
	table.SetColumnSeparator(" │ ")
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)

	table.Append([]string{"Name", metadata.Data.Name})
	table.Append([]string{"Symbol", metadata.Data.Symbol})
	table.Append([]string{"URI", metadata.Data.Uri})
	table.Append([]string{"Seller Fee Basis Points", fmt.Sprintf("%d", metadata.Data.SellerFeeBasisPoints)})
	table.Append([]string{"Primary Sale Happened", fmt.Sprintf("%t", metadata.PrimarySaleHappened)})
	table.Append([]string{"Is Mutable", fmt.Sprintf("%t", metadata.IsMutable)})
	table.Append([]string{"Mint", metadata.Mint.ToBase58()})
	table.Append([]string{"Update Authority", metadata.UpdateAuthority.ToBase58()})

	// Add creators if they exist
	if metadata.Data.Creators != nil && len(*metadata.Data.Creators) > 0 {
		creatorInfo := "Creators:\n"
		for i, creator := range *metadata.Data.Creators {
			creatorInfo += fmt.Sprintf("  %d. Address: %s\n     Verified: %t\n     Share: %d%%\n",
				i+1,
				creator.Address.ToBase58(),
				creator.Verified,
				creator.Share)
		}
		table.Append([]string{"Creators", creatorInfo})
	}

	// Add collection if it exists
	if metadata.Collection != nil {
		collectionInfo := fmt.Sprintf("Key: %s\nVerified: %t",
			metadata.Collection.Key.ToBase58(),
			metadata.Collection.Verified)
		table.Append([]string{"Collection", collectionInfo})
	}

	// Add uses if they exist
	if metadata.Uses != nil {
		usesInfo := fmt.Sprintf("Method: %v\nRemaining: %d\nTotal: %d",
			metadata.Uses.UseMethod,
			metadata.Uses.Remaining,
			metadata.Uses.Total)
		table.Append([]string{"Uses", usesInfo})
	}

	// Add token standard if it exists
	if metadata.TokenStandard != nil {
		table.Append([]string{"Token Standard", fmt.Sprintf("%v", *metadata.TokenStandard)})
	}

	// Add collection details if they exist
	if metadata.CollectionDetails != nil {
		detailsInfo := fmt.Sprintf("Type: V%d\nSize: %d",
			metadata.CollectionDetails.Enum,
			metadata.CollectionDetails.V1.Size)
		table.Append([]string{"Collection Details", detailsInfo})
	}

	// Add programmable config if it exists
	if metadata.ProgrammableConfig != nil {
		ruleSetValue := "None"
		if metadata.ProgrammableConfig.V1.RuleSet != nil {
			ruleSetValue = metadata.ProgrammableConfig.V1.RuleSet.ToBase58()
		}
		configInfo := fmt.Sprintf("Type: V%d\nRuleSet: %s",
			metadata.ProgrammableConfig.Enum,
			ruleSetValue)
		table.Append([]string{"Programmable Config", configInfo})
	}

	table.Render()

	// 2. Display detailed information using spew
	fmt.Println("\n--- Detailed Metadata Dump ---")
	spew.Config.Indent = "  "
	spew.Config.MaxDepth = 4
	spew.Dump(metadata)
}
