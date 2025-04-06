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

// Top-level structure for the JSON output
type ScrapeOutput struct {
	ScrapeTimestamp time.Time            `json:"scrapeTimestamp"`
	Tokens          map[string]TokenInfo `json:"tokens"`
}

// Simplified struct for individual token details (no timestamp here)
type TokenInfo struct {
	Name    string `json:"Name"`
	Volume  string `json:"Volume"`
	IconURL string `json:"IconURL"`
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
	outputFile = "../../data/trending_solana_tokens.json" // Use the data directory
	userAgent  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
	cacheTTL   = 24 * time.Hour // Cache duration
)

func main() {
	url := baseURL

	// --- Check for Existing Data and Timestamp ---
	var existingData ScrapeOutput
	fileData, err := os.ReadFile(outputFile)

	if err == nil {
		// File exists, try to decode
		err = json.Unmarshal(fileData, &existingData)
		if err == nil {
			// Decode successful, check timestamp
			if time.Since(existingData.ScrapeTimestamp) < cacheTTL {
				log.Printf("Cached data in %s is fresh (scraped at %s). Using cached data.", outputFile, existingData.ScrapeTimestamp.Format(time.RFC3339))
				// Optional: Print cached data for confirmation
				logAndPrintData(existingData) // Use a helper to avoid repetition
				return                        // Exit successfully using cached data
			}
			log.Printf("Cached data in %s is older than %v (scraped at %s). Proceeding with fresh scrape.", outputFile, cacheTTL, existingData.ScrapeTimestamp.Format(time.RFC3339))
		} else {
			log.Printf("WARN: Found file %s but failed to decode JSON: %v. Proceeding with fresh scrape.", outputFile, err)
		}
	} else if os.IsNotExist(err) {
		log.Printf("No existing data file found at %s. Proceeding with fresh scrape.", outputFile)
	} else {
		// Other file reading error
		log.Printf("WARN: Error reading file %s: %v. Proceeding with fresh scrape.", outputFile, err)
	}

	// --- Proceed with Scraping if Necessary ---
	log.Println("Starting fresh scrape process...")

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

	// Use the simplified TokenInfo map
	tokensMap := make(map[string]TokenInfo)
	var modalNodes []*cdp.Node

	log.Println("Navigating to", url, "clicking 'View more', and waiting for modal...")
	err = chromedp.Run(timeoutCtx,
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

		// Process mint address from href
		mintAddress := ""
		if strings.Contains(addressHref, "/token/") {
			parts := strings.Split(addressHref, "/token/")
			if len(parts) > 1 {
				addressParts := strings.Split(parts[1], "?")
				mintAddress = addressParts[0]
			}
		}

		// Validate essential info
		trimmedName := strings.TrimSpace(name)
		if trimmedName != "" && mintAddress != "" {
			// Create TokenInfo (no timestamp) and add to map
			tokensMap[mintAddress] = TokenInfo{
				Name:    trimmedName,
				IconURL: strings.TrimSpace(iconURL),
				Volume:  strings.TrimSpace(volume),
			}
		} else {
			log.Printf("WARN: Skipping modal row %d due to missing Name or MintAddress (Name: '%s', Mint: '%s')", i+1, trimmedName, mintAddress)
		}
	}

	// --- Prepare Final Output ---
	finalOutput := ScrapeOutput{
		ScrapeTimestamp: time.Now(), // Set timestamp for the whole run
		Tokens:          tokensMap,  // Assign the map
	}

	// --- Log Extracted Data (Map) ---
	logAndPrintData(finalOutput) // Use helper function

	// --- Save Final Output Struct to JSON ---
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	err = encoder.Encode(finalOutput) // Encode the top-level struct
	if err != nil {
		log.Fatalf("Failed to encode final output to JSON buffer: %v", err)
	}
	err = os.WriteFile(outputFile, buf.Bytes(), 0644)
	if err != nil {
		log.Fatalf("Failed to write final JSON to file %s: %v", outputFile, err)
	}

	log.Printf("Successfully saved data for %d tokens to %s", len(finalOutput.Tokens), outputFile)
}

// Helper function to log and print token data
func logAndPrintData(data ScrapeOutput) {
	log.Println("--- Solana Tokens Data ---")
	if len(data.Tokens) == 0 {
		log.Println("No token data available.")
		return
	}
	log.Printf("Timestamp: %s", data.ScrapeTimestamp.Format(time.RFC3339))
	for mintAddr, token := range data.Tokens {
		fmt.Printf("MintAddress: %s\n", mintAddr)
		fmt.Printf("  Name: %s\n", token.Name)
		fmt.Printf("  Volume: %s\n", token.Volume)
		fmt.Printf("  Icon: %s\n", token.IconURL)
		fmt.Println("-----------------------------")
	}
}
