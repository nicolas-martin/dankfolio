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
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
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
	// Create API tracker
	apiTracker := clients.NewAPICallTracker()

	solanaClient := solana.NewClient(rpcClient, apiTracker)

	// Fetch metadata
	fmt.Println("Fetching metadata for mint:", *mintAddress)

	metadata, err := solanaClient.GetMetadataAccount(ctx, *mintAddress)
	if err != nil {
		log.Fatalf("Error fetching metadata: %v", err)
	}

	// Display results in two ways: formatted table and detailed spew dump

	// 1. Display formatted data in a table
	fmt.Println("\n--- Metadata Summary (Table) ---")

	// Main metadata table
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

	// Render the main table first
	table.Render()

	// Add token standard if it exists
	if metadata.TokenStandard != nil {
		tokenStandardTable := tablewriter.NewWriter(os.Stdout)
		tokenStandardTable.SetHeader([]string{"Token Standard"})
		tokenStandardTable.SetBorder(false)
		tokenStandardTable.SetColumnSeparator(" │ ")
		tokenStandardTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		tokenStandardTable.SetAlignment(tablewriter.ALIGN_LEFT)

		tokenStandardTable.Append([]string{fmt.Sprintf("%v", *metadata.TokenStandard)})

		fmt.Println("\n--- Token Standard ---")
		tokenStandardTable.Render()
	}

	// Add collection details if they exist
	if metadata.CollectionDetails != nil {
		collectionDetailsTable := tablewriter.NewWriter(os.Stdout)
		collectionDetailsTable.SetHeader([]string{"Collection Type", "Size"})
		collectionDetailsTable.SetBorder(false)
		collectionDetailsTable.SetColumnSeparator(" │ ")
		collectionDetailsTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		collectionDetailsTable.SetAlignment(tablewriter.ALIGN_LEFT)

		collectionDetailsTable.Append([]string{
			fmt.Sprintf("V%d", metadata.CollectionDetails.Enum),
			fmt.Sprintf("%d", metadata.CollectionDetails.V1.Size),
		})

		fmt.Println("\n--- Collection Details ---")
		collectionDetailsTable.Render()
	}

	// Add programmable config if it exists
	if metadata.ProgrammableConfig != nil {
		configTable := tablewriter.NewWriter(os.Stdout)
		configTable.SetHeader([]string{"Config Type", "RuleSet"})
		configTable.SetBorder(false)
		configTable.SetColumnSeparator(" │ ")
		configTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		configTable.SetAlignment(tablewriter.ALIGN_LEFT)

		ruleSetValue := "None"
		if metadata.ProgrammableConfig.V1.RuleSet != nil {
			ruleSetValue = metadata.ProgrammableConfig.V1.RuleSet.ToBase58()
		}

		configTable.Append([]string{
			fmt.Sprintf("V%d", metadata.ProgrammableConfig.Enum),
			ruleSetValue,
		})

		fmt.Println("\n--- Programmable Config ---")
		configTable.Render()
	}

	// Add creators if they exist
	if metadata.Data.Creators != nil && len(*metadata.Data.Creators) > 0 {
		creatorTable := tablewriter.NewWriter(os.Stdout)
		creatorTable.SetHeader([]string{"Creator", "Address", "Verified", "Share"})
		creatorTable.SetBorder(false)
		creatorTable.SetColumnSeparator(" │ ")
		creatorTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		creatorTable.SetAlignment(tablewriter.ALIGN_LEFT)

		for i, creator := range *metadata.Data.Creators {
			creatorTable.Append([]string{
				fmt.Sprintf("#%d", i+1),
				creator.Address.ToBase58(),
				fmt.Sprintf("%t", creator.Verified),
				fmt.Sprintf("%d%%", creator.Share),
			})
		}

		fmt.Println("\n--- Creators ---")
		creatorTable.Render()
	}

	// Add collection if it exists
	if metadata.Collection != nil {
		collectionTable := tablewriter.NewWriter(os.Stdout)
		collectionTable.SetHeader([]string{"Collection Key", "Verified"})
		collectionTable.SetBorder(false)
		collectionTable.SetColumnSeparator(" │ ")
		collectionTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		collectionTable.SetAlignment(tablewriter.ALIGN_LEFT)

		collectionTable.Append([]string{
			metadata.Collection.Key.ToBase58(),
			fmt.Sprintf("%t", metadata.Collection.Verified),
		})

		fmt.Println("\n--- Collection ---")
		collectionTable.Render()
	}

	// Add uses if it exists
	if metadata.Uses != nil {
		usesTable := tablewriter.NewWriter(os.Stdout)
		usesTable.SetHeader([]string{"Use Method", "Remaining", "Total"})
		usesTable.SetBorder(false)
		usesTable.SetColumnSeparator(" │ ")
		usesTable.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
		usesTable.SetAlignment(tablewriter.ALIGN_LEFT)

		usesTable.Append([]string{
			fmt.Sprintf("%v", metadata.Uses.UseMethod),
			fmt.Sprintf("%d", metadata.Uses.Remaining),
			fmt.Sprintf("%d", metadata.Uses.Total),
		})

		fmt.Println("\n--- Uses ---")
		usesTable.Render()
	}

	// 2. Display detailed information using spew
	fmt.Println("\n--- Detailed Metadata Dump ---")
	spew.Config.Indent = "  "
	spew.Config.MaxDepth = 4
	spew.Dump(metadata)
}
