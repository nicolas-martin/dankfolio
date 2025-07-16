package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
)

const (
	// Test tokens
	BONKMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
	WIFMint  = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
	NativeSolMint = "11111111111111111111111111111111"
	WSOLMint = "So11111111111111111111111111111111111111112"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	fmt.Println("=== Testing Automatic Meme-to-Meme Routing ===")
	fmt.Println()

	// Test cases
	testCases := []struct {
		name           string
		fromMint       string
		toMint         string
		expectedRoute  string
	}{
		{
			name:          "BONK -> WIF (meme-to-meme)",
			fromMint:      BONKMint,
			toMint:        WIFMint,
			expectedRoute: "meme-to-meme",
		},
		{
			name:          "Native SOL -> BONK",
			fromMint:      NativeSolMint,
			toMint:        BONKMint,
			expectedRoute: "regular",
		},
		{
			name:          "BONK -> Native SOL",
			fromMint:      BONKMint,
			toMint:        NativeSolMint,
			expectedRoute: "regular",
		},
		{
			name:          "wSOL -> BONK",
			fromMint:      WSOLMint,
			toMint:        BONKMint,
			expectedRoute: "regular",
		},
		{
			name:          "BONK -> wSOL",
			fromMint:      BONKMint,
			toMint:        WSOLMint,
			expectedRoute: "regular",
		},
		{
			name:          "WIF -> BONK (meme-to-meme)",
			fromMint:      WIFMint,
			toMint:        BONKMint,
			expectedRoute: "meme-to-meme",
		},
	}

	fmt.Println("Testing routing logic:")
	for _, tc := range testCases {
		// Check if this is a meme-to-meme swap (neither coin is SOL)
		isMemeToMeme := tc.fromMint != model.NativeSolMint && 
		                tc.fromMint != model.SolMint &&
		                tc.toMint != model.NativeSolMint && 
		                tc.toMint != model.SolMint

		route := "regular"
		if isMemeToMeme {
			route = "meme-to-meme"
		}

		status := "✅"
		if route != tc.expectedRoute {
			status = "❌"
		}

		fmt.Printf("%s %s: %s (expected: %s, got: %s)\n", 
			status, tc.name, 
			getShortAddress(tc.fromMint) + " -> " + getShortAddress(tc.toMint),
			tc.expectedRoute, route)
	}

	fmt.Println("\nKey:")
	fmt.Printf("Native SOL: %s\n", NativeSolMint)
	fmt.Printf("wSOL: %s\n", WSOLMint)
	fmt.Printf("BONK: %s\n", BONKMint)
	fmt.Printf("WIF: %s\n", WIFMint)
}

func getShortAddress(address string) string {
	switch address {
	case NativeSolMint:
		return "SOL"
	case WSOLMint:
		return "wSOL"
	case BONKMint:
		return "BONK"
	case WIFMint:
		return "WIF"
	default:
		if len(address) > 8 {
			return address[:4] + "..." + address[len(address)-4:]
		}
		return address
	}
}