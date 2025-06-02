package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	// No longer attempting to import service/coin directly
)

const maxWorkers = 5

// ValidationResult holds the outcome of a single URI validation
type ValidationResult struct {
	OriginalURI     string
	StandardizedURL string
	IsValid         bool
	Status          string // e.g., "valid_image", "redirect_attempted", "non_200_status", "non_image_content_type", "network_error", "request_creation_failed", "standardization_failed"
	Error           string // Detailed error message, if any
}

var predefinedURIs = []string{
	"ipfs://bafkreihdwdcefgh4mbymxsyysqcecdnpqcomivgpw7u7xckftbrcnzxom4", // Valid IPFS (ENS anongit) -> Will be standardized
	"https://ipfs.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE",    // Valid IPFS (BAYC) -> Already a gateway link, might be re-standardized or kept
	"https://cloudflare-ipfs.com/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/0.png", // Direct image via gateway
	"https://arweave.net/LfgfW9kaJb9tS7n2mS2XSlkS2MaQ5xV2zYfM0gG0g_A",                         // Valid Arweave image
	"https://bad.domain/nonexistent.png",                                                        // Invalid HTTP
	"ipfs://QmTp2h37kGkf3iY4JFNuQ21qfmqN3v3rSRg12H2X2Y4X2Y",                                     // Likely invalid/non-existent IPFS CID -> Standardization will produce a link
	"http://httpbin.org/redirect-to?url=https://via.placeholder.com/150.png/PNG",               // Redirects to an image
	"https://example.com", // Valid HTTP but non-image content type
	"https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png", // Valid direct image
	"baduri://invalidformat", // Completely invalid URI format -> Standardization should handle this gracefully
	"https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=100", // Known redirect to image (Unsplash)
	"ipfs://QmPASnLJxP4jKAbD9fYeLTvXsfz99hJ2Y3G4x2syaVAPqP/image.png", // IPFS CIDv0 with a path
	"ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/image.png", // IPFS CIDv1 with a path
}

// Copied and adapted from backend/internal/service/coin/enrich.go
var defaultCIDv0Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/",
	"https://ipfs.io/ipfs/",              // Promoted fallback
	"https://dweb.link/ipfs/",
	// "https://cloudflare-ipfs.com/ipfs/", // DNS issues from sandbox
}

var defaultCIDv1Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/", // Usually reliable
	"https://ipfs.io/ipfs/",              // Fallback
	// "https://cloudflare-ipfs.com/ipfs/", // DNS issues from sandbox
	// "https://dweb.link/ipfs/",           // Timeout issues
}

// StandardizeIPFSURL (adapted from backend/internal/service/coin/enrich.go)
// Made standalone for this test utility.
// Uses log.Printf for warnings/errors instead of slog.
func StandardizeIPFSURL(iconUrlInput string) string {
	if iconUrlInput == "" {
		return ""
	}

	// Check if it's an IPFS gateway URL (contains "/ipfs/")
	if strings.Contains(iconUrlInput, "/ipfs/") {
		parts := strings.SplitN(iconUrlInput, "/ipfs/", 2)
		if len(parts) < 2 || parts[1] == "" {
			return iconUrlInput // Malformed or nothing after /ipfs/, return original
		}
		ipfsPathContent := parts[1]
		ipfsResourceIdentifier := ipfsPathContent
		if queryIdx := strings.Index(ipfsPathContent, "?"); queryIdx != -1 {
			ipfsResourceIdentifier = ipfsPathContent[:queryIdx]
		}

		firstPathComponent := strings.SplitN(ipfsResourceIdentifier, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 { // CIDv0
			if len(defaultCIDv0Gateways) == 0 {
				log.Printf("Warning: No default CIDv0 gateways configured for IPFS gateway URL: %s", iconUrlInput)
				return iconUrlInput
			}
			return defaultCIDv0Gateways[0] + ipfsResourceIdentifier // ipfsResourceIdentifier already includes path and query
		} else { // CIDv1 or other
			// It's CIDv1 or other (non-CIDv0). Use the first default CIDv1 gateway.
			if len(defaultCIDv1Gateways) == 0 {
				log.Printf("Warning: No default CIDv1 gateways configured for HTTP gateway URL: %s", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			// ipfsResourceIdentifier here is <CIDv1_or_other><optional_path_and_query>
			return defaultCIDv1Gateways[0] + ipfsResourceIdentifier
		}
	} else if strings.HasPrefix(iconUrlInput, "ipfs://") {
		trimmedCidAndPath := strings.TrimPrefix(iconUrlInput, "ipfs://")
		if trimmedCidAndPath == "" {
			log.Printf("Warning: Empty path after ipfs:// scheme: %s", iconUrlInput)
			return "" // Invalid IPFS URI
		}
		
		firstPathComponent := strings.SplitN(trimmedCidAndPath, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 { // CIDv0
			if len(defaultCIDv0Gateways) == 0 {
				log.Printf("Warning: No default CIDv0 gateways configured for raw IPFS URI: %s", iconUrlInput)
				return iconUrlInput
			}
			return defaultCIDv0Gateways[0] + trimmedCidAndPath // trimmedCidAndPath includes full path and query
		} else { // CIDv1 or other
			// It's CIDv1 or other (non-CIDv0). Use the first default CIDv1 gateway.
			if len(defaultCIDv1Gateways) == 0 {
				log.Printf("Warning: No default CIDv1 gateways configured for raw CIDv1 URI: %s", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			// trimmedCidAndPath is <CIDv1_or_other><optional_path_and_query>
			return defaultCIDv1Gateways[0] + trimmedCidAndPath
		}
	} else if strings.HasPrefix(iconUrlInput, "ar://") {
		// Basic Arweave gateway replacement
		txID := strings.TrimPrefix(iconUrlInput, "ar://")
		if txID == "" {
			log.Printf("Warning: Empty transaction ID after ar:// scheme: %s", iconUrlInput)
			return "" // Invalid Arweave URI
		}
		return "https://arweave.net/" + txID
	}

	// Not an IPFS or Arweave URI, return as is
	return iconUrlInput
}

func main() {
	urisToProcess := os.Args[1:]
	if len(urisToProcess) == 0 {
		log.Println("No URIs provided via command line, using predefined list.")
		urisToProcess = predefinedURIs
	}

	var wg sync.WaitGroup
	uriChan := make(chan string, len(urisToProcess))
	resultsChan := make(chan ValidationResult, len(urisToProcess))

	// Start workers
	for i := 0; i < maxWorkers; i++ {
		wg.Add(1)
		go worker(&wg, i+1, uriChan, resultsChan)
	}

	// Send URIs to workers
	for _, uri := range urisToProcess {
		uriChan <- uri
	}
	close(uriChan)

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	fmt.Println("--- Validation Results ---")
	for result := range resultsChan {
		printResult(result)
	}

	log.Println("Processing complete.")
}

func worker(wg *sync.WaitGroup, id int, uriChan <-chan string, resultsChan chan<- ValidationResult) {
	defer wg.Done()
	log.Printf("Worker %d started", id)

	httpClient := &http.Client{Timeout: 10 * time.Second}
	// Note: offchainClient itself has specific redirect handling for VerifyDirectImageAccess
	offchainClient := offchain.NewClient(httpClient)

	for uri := range uriChan {
		log.Printf("Worker %d: Processing URI: %s", id, uri)
		
		standardizedURL := StandardizeIPFSURL(uri)
		var statusForStandardization string

		if standardizedURL == "" && uri != "" { // URI was not empty but standardization resulted in empty (e.g. bad ipfs:// or ar://)
			statusForStandardization = "standardization_failed_empty_url"
			log.Printf("Worker %d: Standardization for %s resulted in empty URL.", id, uri)
		} else if standardizedURL != uri {
			log.Printf("Worker %d: Standardized URI %s to %s", id, uri, standardizedURL)
		} else {
			// No change or not applicable for standardization (e.g. HTTP URL)
			// No specific log here unless we want to be more verbose
		}


		if statusForStandardization != "" {
			resultsChan <- ValidationResult{
				OriginalURI:     uri,
				StandardizedURL: standardizedURL, // Will be empty
				IsValid:         false,
				Status:          statusForStandardization,
				Error:           "Standardization resulted in an empty or invalid URL",
			}
			continue
		}
		
		// If standardization produced an empty URL from a non-empty input, it's an issue.
		// However, if the original URI was already empty, StandardizeIPFSURL returns empty, which is fine.
		// We must ensure VerifyDirectImageAccess is not called with an empty URL if the original was not empty.
		if standardizedURL == "" { // This check is after the statusForStandardization block.
			                             // This means original uri must have been empty.
			resultsChan <- ValidationResult{
				OriginalURI:     uri, // will be ""
				StandardizedURL: "",
				IsValid:         false,
				Status:          "empty_original_uri",
				Error:           "Original URI was empty",
			}
			continue
		}


		log.Printf("Worker %d: Verifying direct access for %s (Original: %s)", id, standardizedURL, uri)
		isValid, reasonOrURL, err := offchainClient.VerifyDirectImageAccess(context.Background(), standardizedURL)
		
		result := ValidationResult{
			OriginalURI:     uri,
			StandardizedURL: standardizedURL,
			IsValid:         isValid,
			Status:          reasonOrURL,
		}
		if err != nil {
			result.Error = err.Error()
			log.Printf("Worker %d: Verification for %s (orig: %s) failed. Valid: %t, Reason: %s, Error: %s", id, standardizedURL, uri, isValid, reasonOrURL, err.Error())
		} else {
			if isValid {
				result.Status = "valid_image" 
				log.Printf("Worker %d: Verification for %s (orig: %s) successful. Valid: %t, Status: %s", id, standardizedURL, uri, isValid, result.Status)
			} else {
				log.Printf("Worker %d: Verification for %s (orig: %s) returned not valid. Reason: %s", id, standardizedURL, uri, reasonOrURL)
			}
		}
		resultsChan <- result
	}
	log.Printf("Worker %d finished", id)
}

func printResult(result ValidationResult) {
	fmt.Printf("Original:     %s\n", result.OriginalURI)
	fmt.Printf("Standardized: %s\n", result.StandardizedURL)
	fmt.Printf("Valid:        %t\n", result.IsValid)
	fmt.Printf("Status:       %s\n", result.Status)
	if result.Error != "" {
		fmt.Printf("Error:        %s\n", result.Error)
	}
	fmt.Println("---")
}
