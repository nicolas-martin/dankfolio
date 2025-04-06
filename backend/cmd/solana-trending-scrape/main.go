package main

import (
	"context"
	"encoding/json"
	"errors"
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
	baseURL                 = "https://www.birdeye.so/?chain=solana"
	rowSelector             = "section.border-b tbody tr"                 // Relaxed specificity: Find rows in a section with border-b
	nameSelector            = "div.truncate.text-subtitle-medium-14"      // Updated: Selector for the name div
	iconSelector            = "td a img:not([src*='network/solana.png'])" // Target img within link, excluding the overlay icon
	mintAddressLinkSelector = "td a"                                      // Updated: Selector for the main link (get href)
	outputFile              = "trending_solana_tokens.json"
	userAgent               = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
)

func main() {
	url := baseURL

	// --- SELECTORS TO UPDATE ---
	// Updated based on browser inspection & using XPath for initial row selection (April 6, 2025)
	// tokenRowSelectorXPath := `//section[.//h4[contains(text(), 'Trending Tokens')]]//tbody/tr` // XPath to find rows in the specific table - Removed, using CSS selector constant now
	// volumeSelector := `td:nth-child(???))` // Volume column wasn't clear in the trending table, commenting out for now - Removed
	// --- END SELECTORS TO UPDATE ---

	// Create context with options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true), // Run headless unless debugging
		chromedp.Flag("disable-gpu", true),
		chromedp.UserAgent(userAgent),
	)
	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	taskCtx, cancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancel()

	// Create a timeout context
	timeoutCtx, cancel := context.WithTimeout(taskCtx, 120*time.Second) // Increased overall timeout to 120s
	defer cancel()

	var tokens []TokenInfo
	var tokenNodes []*cdp.Node

	log.Println("Navigating to", url, "and finding token rows...")
	err := chromedp.Run(timeoutCtx,
		chromedp.Navigate(url),
		// Wait for the table body to be visible as an indicator
		chromedp.WaitVisible(`tbody`, chromedp.ByQuery),
		// Add a delay for dynamic content loading
		chromedp.Sleep(5*time.Second),
		// Get all token row nodes using the rowSelector constant
		chromedp.Nodes(rowSelector, &tokenNodes, chromedp.ByQueryAll),
	)
	if err != nil {
		log.Fatalf("Chromedp navigation and node selection failed: %v", err)
	}

	log.Printf("Found %d potential token rows. Extracting data...", len(tokenNodes))
	tokens = make([]TokenInfo, 0, len(tokenNodes))

	// Create a new context for extraction tasks with the main timeout
	extractCtx, cancelExtract := context.WithTimeout(timeoutCtx, 15*time.Second) // Re-use the original timeout duration for overall extraction phase
	defer cancelExtract()

	for i, node := range tokenNodes {
		// Add a check to break the loop after processing the first 10 rows
		if i >= 10 {
			log.Println("Reached limit of 10 tokens. Stopping extraction.")
			break
		}

		log.Printf("--> Processing row %d...", i+1)
		var name, iconURL, mintAddressHref string // Raw values

		// Create a context with a shorter timeout *per row*
		rowCtx, rowCancel := context.WithTimeout(extractCtx, 15*time.Second) // Increased to 15-second timeout for this specific row

		err := chromedp.Run(rowCtx, // Use the per-row context here
			// Extract Name
			chromedp.TextContent(nameSelector, &name, chromedp.ByQuery, chromedp.FromNode(node)),
			// Extract Icon URL
			chromedp.AttributeValue(iconSelector, "src", &iconURL, nil, chromedp.ByQuery, chromedp.FromNode(node)),
			// Extract Mint Address Link
			chromedp.AttributeValue(mintAddressLinkSelector, "href", &mintAddressHref, nil, chromedp.ByQuery, chromedp.FromNode(node)),
		)
		rowCancel() // Cancel the row context as soon as we're done with it or it errors/times out

		log.Printf("<-- Finished chromedp.Run for row %d (Error: %v)", i+1, err)
		if err != nil {
			// Check if the error is a context deadline exceeded error
			if errors.Is(err, context.DeadlineExceeded) {
				log.Printf("    Timeout extracting data for row %d. Skipping row.", i+1)
			} else {
				log.Printf("    Error extracting data for row %d: %v. Skipping row.", i+1, err)
			}
			continue // Skip this row if extraction failed or timed out
		}

		log.Printf("    Processing extracted data for row %d...", i+1)
		token := TokenInfo{
			Name:        strings.TrimSpace(name),
			IconURL:     strings.TrimSpace(iconURL),
			MintAddress: strings.TrimSpace(mintAddressHref),
		}

		// Process mint address from href
		if strings.Contains(mintAddressHref, "/token/") {
			parts := strings.Split(mintAddressHref, "/token/")
			if len(parts) > 1 {
				// Remove potential query parameters like ?chain=solana
				addressParts := strings.Split(parts[1], "?")
				token.MintAddress = addressParts[0]
			}
		} else {
			log.Printf("WARN: Could not parse mint address from href: %s", mintAddressHref)
			token.MintAddress = ""
		}

		// Only add if we have essential info (Name and MintAddress)
		if token.Name != "" && token.MintAddress != "" {
			tokens = append(tokens, token)
		} else {
			log.Printf("WARN: Skipping row %d due to missing Name or MintAddress (Name: '%s', Address Href: '%s')", i+1, token.Name, mintAddressHref)
		}

		// Add a small delay between processing rows
		time.Sleep(250 * time.Millisecond)
	}

	log.Println("--- Extraction Complete --- --- Extracted Solana Tokens ---")
	if len(tokens) == 0 {
		log.Println("No valid tokens extracted. Double-check the CSS selectors in the script against the current website structure.")
		return
	}

	for _, token := range tokens {
		fmt.Printf("Name: %s\n", token.Name)
		fmt.Printf("  Volume: %s\n", token.Volume)
		fmt.Printf("  Icon: %s\n", token.IconURL)
		fmt.Printf("  Mint Address: %s\n", token.MintAddress)
		fmt.Println("-----------------------------")
	}

	// Save to JSON
	jsonData, err := json.MarshalIndent(tokens, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal tokens to JSON: %v", err)
	}

	err = os.WriteFile(outputFile, jsonData, 0644)
	if err != nil {
		log.Fatalf("Failed to write JSON to file %s: %v", outputFile, err)
	}

	log.Printf("Successfully saved %d tokens to %s", len(tokens), outputFile)
}
