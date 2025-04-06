package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/chromedp/cdproto/cdp"
	// "github.com/chromedp/cdproto/dom" // No longer needed
	"github.com/chromedp/chromedp"
)

// Adjust this struct based on the actual API response structure
type ApiResponse struct {
	Data struct {
		Tokens []TokenInfo `json:"tokens"` // Assuming the tokens are in a nested structure
	} `json:"data"`
}

type TokenInfo struct {
	Name        string
	Volume      string // Keep as string for easier extraction
	IconURL     string
	MintAddress string
}

const (
	baseURL = "https://www.birdeye.so/?chain=solana"
	// Selectors focused ONLY on the modal
	viewMoreButtonSelector = `section.border-b div[type="button"][data-state="closed"]` // Keep this to trigger modal
	modalSelector          = "div[role='dialog']"                                       // Modal container
	modalRowSelector       = "div[role='dialog'] table tbody tr"                        // Rows within the modal's table
	modalLinkSelector      = "td a"                                                     // Link within a row containing token info
	modalIconSelector      = "img:not([src*='network/solana.png'])"                     // Image within the link (excluding overlay)
	modalNameSelector      = "div[class*='text-subtitle']"                              // Name div within the link (more robust class match)
	modalVolumeSelector    = "td:nth-child(4) span"                                     // Volume span (assumes 4th column)
	// Other constants
	outputFile = "../../data/trending_solana_tokens.json"
	userAgent  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
)

func main() {
	url := baseURL

	// --- Context Setup (same as before) ---
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.UserAgent(userAgent),
	)
	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()
	taskCtx, cancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancel()
	timeoutCtx, cancel := context.WithTimeout(taskCtx, 120*time.Second) // Overall timeout
	defer cancel()

	var tokens []TokenInfo
	var modalNodes []*cdp.Node

	log.Println("Navigating to", url, "clicking 'View more', and waiting for modal...")
	err := chromedp.Run(timeoutCtx,
		chromedp.Navigate(url),
		chromedp.WaitVisible(`tbody`, chromedp.ByQuery), // Wait for initial table structure
		chromedp.Sleep(2*time.Second),                   // Short delay before click
		// Click "View more" to load the modal
		chromedp.Click(viewMoreButtonSelector, chromedp.ByQuery, chromedp.NodeVisible),
		// Wait for the modal dialog to appear
		chromedp.WaitVisible(modalSelector, chromedp.ByQuery),
		chromedp.Sleep(1*time.Second), // Small delay after modal visible
	)

	if err != nil {
		log.Fatalf("Failed to navigate, click 'View more', or wait for modal: %v", err)
		// If the script should continue without the modal, change Fatalf to Printf and return or handle differently.
	}

	log.Println("Modal appeared. Extracting data directly from modal rows...")

	// --- Extract Data Directly From Modal ---
	extractCtx, cancelExtract := context.WithTimeout(timeoutCtx, 60*time.Second) // Timeout for modal scraping
	defer cancelExtract()

	err = chromedp.Run(extractCtx,
		chromedp.Nodes(modalRowSelector, &modalNodes, chromedp.ByQueryAll),
	)

	if err != nil {
		log.Fatalf("Failed to get rows from modal: %v", err)
	}

	log.Printf("Found %d rows in modal. Processing up to first 10...", len(modalNodes))

	// Limit to first 10 rows if more are found
	if len(modalNodes) > 10 {
		modalNodes = modalNodes[:10]
	}

	tokens = make([]TokenInfo, 0, len(modalNodes))

	for i, node := range modalNodes {
		var name, iconURL, addressHref, volume string
		var linkNode *cdp.Node    // Need the link node to extract multiple attributes from it
		var linkNodes []*cdp.Node // Slice to hold results from Nodes

		rowCtx, rowCancel := context.WithTimeout(extractCtx, 10*time.Second) // Timeout per row

		// Get the main link node first using Nodes
		err = chromedp.Run(rowCtx,
			chromedp.Nodes(modalLinkSelector, &linkNodes, chromedp.ByQuery, chromedp.FromNode(node)), // Use Nodes
		)

		// Check for errors and if any nodes were found
		if err != nil {
			log.Printf("WARN: Error querying link node in modal row %d: %v. Skipping.", i+1, err)
			rowCancel()
			continue
		}
		if len(linkNodes) == 0 {
			log.Printf("WARN: Could not find link node in modal row %d. Skipping.", i+1)
			rowCancel()
			continue
		}
		linkNode = linkNodes[0] // Assign the first found node

		// Extract details using the linkNode as the base where appropriate
		err = chromedp.Run(rowCtx,
			chromedp.AttributeValue(modalLinkSelector, "href", &addressHref, nil, chromedp.ByQuery, chromedp.FromNode(node)), // Get href from link in row
			chromedp.TextContent(modalNameSelector, &name, chromedp.ByQuery, chromedp.FromNode(linkNode)),                    // Get name from within link node
			chromedp.AttributeValue(modalIconSelector, "src", &iconURL, nil, chromedp.ByQuery, chromedp.FromNode(linkNode)),  // Get icon src from within link node
			chromedp.TextContent(modalVolumeSelector, &volume, chromedp.ByQuery, chromedp.FromNode(node)),                    // Get volume from row node directly
		)
		rowCancel()

		if err != nil {
			log.Printf("WARN: Failed to extract details from modal row %d: %v. Skipping.", i+1, err)
			continue
		}

		token := TokenInfo{
			Name:    strings.TrimSpace(name),
			IconURL: strings.TrimSpace(iconURL),
			Volume:  strings.TrimSpace(volume),
		}

		// Process mint address from href
		if strings.Contains(addressHref, "/token/") {
			parts := strings.Split(addressHref, "/token/")
			if len(parts) > 1 {
				addressParts := strings.Split(parts[1], "?")
				token.MintAddress = addressParts[0]
			}
		} else {
			token.MintAddress = ""
		}

		// Only add if we have essential info (Name and MintAddress)
		if token.Name != "" && token.MintAddress != "" {
			tokens = append(tokens, token)
		} else {
			log.Printf("WARN: Skipping modal row %d due to missing Name or MintAddress (Name: '%s', Address Href: '%s')", i+1, token.Name, addressHref)
		}
	}

	// --- Log Extracted Data ---
	log.Println("--- Extraction Complete --- --- Extracted Solana Tokens (from Modal) ---")
	if len(tokens) == 0 {
		log.Println("No valid tokens extracted from modal.")
		return
	}
	for _, token := range tokens {
		fmt.Printf("Name: %s\n", token.Name)
		fmt.Printf("  Volume: %s\n", token.Volume)
		fmt.Printf("  Icon: %s\n", token.IconURL)
		fmt.Printf("  Mint Address: %s\n", token.MintAddress)
		fmt.Println("-----------------------------")
	}

	// --- Save to JSON (same as before) ---
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	err = encoder.Encode(tokens)
	if err != nil {
		log.Fatalf("Failed to encode tokens to JSON buffer: %v", err)
	}
	err = os.WriteFile(outputFile, buf.Bytes(), 0644)
	if err != nil {
		log.Fatalf("Failed to write JSON to file %s: %v", outputFile, err)
	}

	log.Printf("Successfully saved %d tokens to %s", len(tokens), outputFile)
}
