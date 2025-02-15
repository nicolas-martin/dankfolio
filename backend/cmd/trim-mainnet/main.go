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
	rpcEndpoint       = "https://solana-mainnet.rpcpool.com"
	tokenAMint        = "So11111111111111111111111111111111111111112"  // SOL
	defaultTokenBMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // Default: USDC
	outputFile        = "trimmed_mainnet.json"
	raydiumURL        = "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
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
	tmpFile        string
	tokenB         string
	shouldDownload bool
}

// parseFlags parses command line flags and returns config
func parseFlags() Config {
	var config Config

	flag.StringVar(&config.tmpFile, "file", "", "Path to existing JSON file (optional)")
	flag.StringVar(&config.tokenB, "token", defaultTokenBMint, "Token B mint address (default: USDC)")

	flag.Parse()

	// Determine if we need to download
	config.shouldDownload = config.tmpFile == "" || !fileExists(config.tmpFile)

	return config
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// createTempDir creates a temporary directory if it doesn't exist
func createTempDir() (string, error) {
	tmpDir := filepath.Join(".", "tmp")
	err := os.MkdirAll(tmpDir, 0o755)
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	return tmpDir, nil
}

// cleanupTempFiles removes any leftover temporary files
func cleanupTempFiles(tmpDir string) {
	files, err := os.ReadDir(tmpDir)
	if err != nil {
		return
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "raydium-pools-") && strings.HasSuffix(file.Name(), ".json") {
			filePath := filepath.Join(tmpDir, file.Name())
			if err := os.Remove(filePath); err != nil {
				log.Printf("Failed to clean up temp file %s: %v", file.Name(), err)
			} else {
				log.Printf("Cleaned up temp file: %s", file.Name())
			}
		}
	}
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

// processPoolsFile processes the downloaded JSON file and filters pools
func processPoolsFile(tempFilePath string, tokenB string) ([]RaydiumPool, error) {
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

	// Filter pools
	var matchingPools []RaydiumPool
	tokenA := strings.ToLower(tokenAMint)
	tokenB = strings.ToLower(tokenB)

	for _, pool := range response.Official {
		baseMint := strings.ToLower(pool.BaseMint)
		quoteMint := strings.ToLower(pool.QuoteMint)

		matchesDirectPair := baseMint == tokenA && quoteMint == tokenB
		matchesReversePair := baseMint == tokenB && quoteMint == tokenA

		if matchesDirectPair || matchesReversePair {
			matchingPools = append(matchingPools, pool)
		}
	}

	return matchingPools, nil
}

// writeFilteredPools writes the filtered pools to the output file
func writeFilteredPools(pools []RaydiumPool) error {
	data, err := json.MarshalIndent(pools, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal pools: %w", err)
	}

	err = os.WriteFile(outputFile, data, 0o644)
	if err != nil {
		return fmt.Errorf("failed to write output file: %w", err)
	}

	return nil
}

func main() {
	config := parseFlags()

	var inputFile string
	var tmpDir string
	var err error

	// Print header
	fmt.Println("🌊 Raydium Pool Fetcher")
	fmt.Println("------------------------")
	fmt.Printf("SOL-USDC Pool Filter\n")
	fmt.Printf("Input: %s\n", tokenAMint)
	fmt.Printf("Output: %s\n", config.tokenB)
	if config.tmpFile != "" {
		fmt.Printf("Using file: %s\n", config.tmpFile)
	}
	fmt.Println()

	if config.shouldDownload {
		// Create temp directory
		tmpDir, err = createTempDir()
		if err != nil {
			log.Fatalf("Failed to create temp directory: %v", err)
		}

		// Clean up any leftover temp files
		cleanupTempFiles(tmpDir)

		// Create temporary file
		inputFile = filepath.Join(tmpDir, fmt.Sprintf("raydium-pools-%d.json", time.Now().UnixNano()))

		// Download file
		if err := downloadFile(raydiumURL, inputFile); err != nil {
			log.Fatalf("Failed to download file: %v", err)
		}
	} else {
		inputFile = config.tmpFile
	}

	// Process pools
	filteredPools, err := processPoolsFile(inputFile, config.tokenB)
	if err != nil {
		if config.shouldDownload {
			os.Remove(inputFile)
		}
		log.Fatalf("Failed to process pools: %v", err)
	}

	// Clean up temp file if we downloaded it
	if config.shouldDownload && tmpDir != "" {
		os.Remove(inputFile)
	}

	// Check if we found any pools
	if len(filteredPools) == 0 {
		fmt.Println("❌ No matching pools found for token pair")
		os.Exit(1)
	}

	// Write results
	if err := writeFilteredPools(filteredPools); err != nil {
		log.Fatalf("Failed to write filtered pools: %v", err)
	}

	fmt.Printf("✨ Successfully found and wrote %d pools to %s\n", len(filteredPools), outputFile)
}
