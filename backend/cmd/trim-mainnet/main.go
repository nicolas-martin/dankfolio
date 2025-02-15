package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	rpcEndpoint      = "https://solana-mainnet.rpcpool.com"
	defaultQuoteMint = "So11111111111111111111111111111111111111112" // SOL
	outputFile       = "trimmed_mainnet.json"
	raydiumURL       = "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
)

// RaydiumPool represents a Raydium liquidity pool
type RaydiumPool struct {
	ID              string `json:"id"`
	BaseMint        string `json:"baseMint"`
	QuoteMint       string `json:"quoteMint"`
	LPMint          string `json:"lpMint"`
	ProgramID       string `json:"programId"`
	Authority       string `json:"authority"`
	OpenOrders      string `json:"openOrders"`
	TargetOrders    string `json:"targetOrders"`
	BaseVault       string `json:"baseVault"`
	QuoteVault      string `json:"quoteVault"`
	Version         int    `json:"version"`
	BaseDecimals    int    `json:"baseDecimals"`
	QuoteDecimals   int    `json:"quoteDecimals"`
	LPDecimals      int    `json:"lpDecimals"`
	MarketVersion   int    `json:"marketVersion"`
	MarketProgramID string `json:"marketProgramId"`
	MarketID        string `json:"marketId"`
}

// RaydiumResponse represents the API response structure
type RaydiumResponse struct {
	Name     string        `json:"name"`
	Official []RaydiumPool `json:"official"`
}

// Config holds the program configuration
type Config struct {
	inputFile string
	baseMint  string // Changed from tokenB to baseMint for clarity
}

// parseFlags parses command line flags and returns config
func parseFlags() Config {
	var config Config

	flag.StringVar(&config.inputFile, "file", "", "Path to existing JSON file (optional)")
	flag.StringVar(&config.baseMint, "token", "", "Base token mint address to search for")

	flag.Parse()

	if config.baseMint == "" {
		log.Fatal("❌ --token parameter is required")
	}

	return config
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// downloadFile downloads a file and shows progress
func downloadFile(url, tempFilePath string) error {
	// Create the file
	out, err := os.Create(tempFilePath)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	// Check if we got a successful response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status code %d", resp.StatusCode)
	}

	// Create a buffer for reading chunks
	buf := make([]byte, 32*1024) // 32KB chunks
	var totalBytes int64
	lastPrint := time.Now()

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			totalBytes += int64(n)
			_, werr := out.Write(buf[:n])
			if werr != nil {
				return fmt.Errorf("error writing to file: %w", werr)
			}

			// Update progress every 500ms
			if time.Since(lastPrint) >= 500*time.Millisecond {
				fmt.Printf("\rDownloading... %.1f MB    ", float64(totalBytes)/(1024*1024))
				lastPrint = time.Now()
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("error reading from response: %w", err)
		}
	}
	fmt.Printf("\rDownloaded %.1f MB         \n", float64(totalBytes)/(1024*1024))

	return nil
}

// validateJSON checks if the downloaded file is a valid and complete JSON
func validateJSON(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file for validation: %w", err)
	}
	defer file.Close()

	// Create a decoder for validation
	decoder := json.NewDecoder(file)

	// Try to decode and validate structure
	var response RaydiumResponse
	if err := decoder.Decode(&response); err != nil {
		return fmt.Errorf("invalid JSON structure: %w", err)
	}

	// Basic validation of the response
	if response.Name == "" {
		return fmt.Errorf("invalid JSON: missing name field")
	}
	if response.Official == nil {
		return fmt.Errorf("invalid JSON: missing official pools array")
	}
	if len(response.Official) == 0 {
		return fmt.Errorf("invalid JSON: empty pools array")
	}

	fmt.Printf("✅ JSON validation successful: found %d pools\n", len(response.Official))
	return nil
}

// processPoolsFile processes the downloaded JSON file and filters pools
func processPoolsFile(tempFilePath string, baseMint string) ([]RaydiumPool, error) {
	// Read the file
	file, err := os.Open(tempFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open temp file: %w", err)
	}
	defer file.Close()

	fmt.Println("Processing pools...")

	// Create a decoder for the file
	decoder := json.NewDecoder(file)

	// Read the response
	var response RaydiumResponse
	if err := decoder.Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode JSON: %w", err)
	}

	// Debug: Print search parameters
	fmt.Println("\nSearching for pools...")
	fmt.Printf("Base Token (WIF): %s\n", baseMint)
	fmt.Printf("Quote Token (SOL): %s\n\n", defaultQuoteMint)

	// Filter pools
	var matchingPools []RaydiumPool
	searchBaseMint := strings.ToLower(baseMint)
	searchQuoteMint := strings.ToLower(defaultQuoteMint)

	fmt.Printf("Looking for pools containing Base Token (lowercase):\n")
	fmt.Printf("  %s\n\n", searchBaseMint)

	for _, pool := range response.Official {
		poolBaseMint := strings.ToLower(pool.BaseMint)
		poolQuoteMint := strings.ToLower(pool.QuoteMint)

		// Only show pools that contain our base token
		if poolBaseMint == searchBaseMint {
			fmt.Printf("Found pool with WIF as base token:\n")
			fmt.Printf("  Pool ID: %s\n", pool.ID)
			fmt.Printf("  Base:  %s\n", pool.BaseMint)
			fmt.Printf("  Quote: %s\n", pool.QuoteMint)
			if poolQuoteMint == searchQuoteMint {
				fmt.Printf("  ✅ This pool matches our criteria!\n")
				matchingPools = append(matchingPools, pool)
			}
			fmt.Println()
		}
	}

	if len(matchingPools) == 0 {
		fmt.Println("❌ No pools found matching both Base (WIF) and Quote (SOL) tokens")
	} else {
		fmt.Printf("✅ Found %d matching pool(s)\n", len(matchingPools))
	}

	return matchingPools, nil
}

// writeFilteredPools writes the filtered pools to the output file
func writeFilteredPools(pools []RaydiumPool) error {
	fmt.Printf("Found %d matching pools\n", len(pools))

	// Create the full response structure
	response := RaydiumResponse{
		Name:     "Raydium Mainnet Liquidity Pools",
		Official: pools,
	}

	// Marshal with proper indentation (2 spaces)
	data, err := json.MarshalIndent(response, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal pools: %w", err)
	}

	// Add newline at the end of the file
	data = append(data, '\n')

	// Write with proper permissions
	if err := os.WriteFile(outputFile, data, 0o644); err != nil {
		return fmt.Errorf("failed to write output file: %w", err)
	}

	return nil
}

func main() {
	fmt.Println("🌊 Raydium Pool Fetcher")
	fmt.Println("------------------------")

	// Parse command line flags
	config := parseFlags()
	fmt.Printf("Base Token: %s\n", config.baseMint)
	fmt.Printf("Quote Token (SOL): %s\n", defaultQuoteMint)

	var jsonFilePath string

	if config.inputFile != "" {
		// Use provided file
		if !fileExists(config.inputFile) {
			log.Fatalf("❌ Provided file does not exist: %s", config.inputFile)
		}
		jsonFilePath = config.inputFile
		fmt.Printf("Using provided file: %s\n\n", jsonFilePath)
	} else {
		// Create tmp directory if it doesn't exist
		if err := os.MkdirAll("tmp", 0o755); err != nil {
			log.Fatalf("❌ Failed to create tmp directory: %v", err)
		}

		// Download to a new file
		jsonFilePath = filepath.Join("tmp", fmt.Sprintf("raydium-pools-%d.json", time.Now().UnixNano()))
		fmt.Printf("Downloading to: %s\n", jsonFilePath)

		if err := downloadFile(raydiumURL, jsonFilePath); err != nil {
			log.Fatalf("❌ Download failed: %v", err)
		}
	}

	// Validate the JSON file
	if err := validateJSON(jsonFilePath); err != nil {
		if config.inputFile == "" {
			// Clean up the downloaded file if it's invalid
			os.Remove(jsonFilePath)
		}
		log.Fatalf("❌ Invalid JSON file: %v", err)
	}

	// Process the pools
	pools, err := processPoolsFile(jsonFilePath, config.baseMint)
	if err != nil {
		if config.inputFile == "" {
			// Clean up the downloaded file if processing fails
			os.Remove(jsonFilePath)
		}
		log.Fatalf("❌ Failed to process pools: %v", err)
	}

	// Write filtered pools to output file
	if err := writeFilteredPools(pools); err != nil {
		log.Fatalf("❌ Failed to write filtered pools: %v", err)
	}

	fmt.Printf("✅ Successfully wrote %d filtered pools to %s\n", len(pools), outputFile)

	// If we downloaded the file, suggest using it next time
	if config.inputFile == "" {
		fmt.Printf("\n💡 Tip: Use --file=%s next time to skip downloading\n", jsonFilePath)
	}
}
