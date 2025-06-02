package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/olekukonko/tablewriter"
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
	"https://ipfs.io/ipfs/QmWnpBV7ws8nmUpzVRszT9Zf5eZCeVhDKLh1vjw2ek5sJm",
	"https://ipfs.io/ipfs/QmTDQ5aj96UCKay6MWmE9R6mAx26Cj4FboSXuT3bfe2Lbi",
	"https://arweave.net/DsmUYUnjErfEwSvbYdbTqoALLXz84ZgaaRlQWiWSx4o",
	"https://arweave.net/tRswKJzsF-X44AjZsdVDCvHWWkhT1uncNWdf1I7cyJs",
	"https://image-cdn.solana.fm/images/?imageUrl=https://cf-ipfs.com/ipfs/QmPrYKyQxrdkNYkHf1pGTvqgAhGENR3F7u1Q3uDgV9Whby",
	"https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
	"https://ipfs.io/ipfs/QmdnAHMWTbxfRkwdf1QweP8rJL1SCe2XbjFTFzCCjw5oAD",
	"https://ipfs.io/ipfs/QmaGqTXDBUBLMU9xGpT4xzYArJmqFFTo3LAU6wZLepWcWe",
	"https://ipfs.io/ipfs/QmVfhGnJmuUoJ8wdnEfRP1RaCg8GQ9WJgotiXVj5ARNGFd",
	"https://ipfs.io/ipfs/QmZk1xtQSZXqPHMD1qAEDTAhY3QhKafDuKCn2BgyZXHYpA",
}

// Copied and adapted from backend/internal/service/coin/enrich.go
var defaultCIDv0Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/",
	"https://ipfs.io/ipfs/", // Promoted fallback
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
		urisToProcess = predefinedURIs
	}

	fmt.Printf("🔍 Testing %d URIs...\n\n", len(urisToProcess))

	var wg sync.WaitGroup
	uriChan := make(chan string, len(urisToProcess))
	resultsChan := make(chan ValidationResult, len(urisToProcess))

	// Start workers
	for i := range maxWorkers {
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

	// Collect all results
	var results []ValidationResult
	for result := range resultsChan {
		results = append(results, result)
	}

	// Print results in a nice table format
	printResultsTable(results)

	// Generate HTML test page
	if err := generateHTMLTestPage(results); err != nil {
		log.Printf("Error generating HTML test page: %v", err)
	} else {
		fmt.Println("\n🌐 HTML test page generated: cmd/test-ipfs-img/ipfs-image-test.html")
		fmt.Println("   Open this file in a browser to visually test image loading")
	}
}

func worker(wg *sync.WaitGroup, id int, uriChan <-chan string, resultsChan chan<- ValidationResult) {
	defer wg.Done()

	for uri := range uriChan {
		standardizedURL := StandardizeIPFSURL(uri)
		var statusForStandardization string

		if standardizedURL == "" && uri != "" {
			statusForStandardization = "standardization_failed_empty_url"
		} else if standardizedURL != uri {
			// Standardization occurred
		}

		if statusForStandardization != "" {
			result := ValidationResult{
				OriginalURI:     uri,
				StandardizedURL: standardizedURL,
				IsValid:         false,
				Status:          statusForStandardization,
				Error:           "Standardization resulted in an empty or invalid URL",
			}
			fmt.Printf("❌ %s -> %s\n", truncateString(uri, 60), statusForStandardization)
			resultsChan <- result
			continue
		}

		if standardizedURL == "" {
			result := ValidationResult{
				OriginalURI:     uri,
				StandardizedURL: "",
				IsValid:         false,
				Status:          "empty_original_uri",
				Error:           "Original URI was empty",
			}
			fmt.Printf("❌ %s -> empty URI\n", truncateString(uri, 60))
			resultsChan <- result
			continue
		}

		isValid, reasonOrURL, err := VerifyDirectImageAccess(context.Background(), standardizedURL)

		result := ValidationResult{
			OriginalURI:     uri,
			StandardizedURL: standardizedURL,
			IsValid:         isValid,
			Status:          reasonOrURL,
		}
		if err != nil {
			result.Error = err.Error()
		}

		// Print simple result line
		if isValid {
			fmt.Printf("✅ %s -> Valid\n", truncateString(uri, 60))
		} else {
			fmt.Printf("❌ %s -> %s\n", truncateString(uri, 60), formatStatus(reasonOrURL))
		}

		resultsChan <- result
	}
}

func printResultsTable(results []ValidationResult) {
	fmt.Println("\n🔍 IPFS Image Validation Results")
	fmt.Println("================================")

	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"#", "Original URI", "Valid", "Status", "Error"})

	// Configure table appearance for better readability
	table.SetBorder(false)
	table.SetRowLine(false)
	table.SetAutoWrapText(true)
	table.SetAutoFormatHeaders(true)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)
	table.SetCenterSeparator("")
	table.SetColumnSeparator(" | ")
	table.SetRowSeparator("")
	table.SetHeaderLine(true)
	table.SetTablePadding(" ")
	table.SetNoWhiteSpace(false)

	// Set specific column widths for better formatting
	table.SetColMinWidth(0, 3)  // # column
	table.SetColMinWidth(1, 45) // Original URI column
	table.SetColMinWidth(2, 8)  // Valid column
	table.SetColMinWidth(3, 15) // Status column
	table.SetColMinWidth(4, 25) // Error column

	for i, result := range results {
		// Truncate long URLs for better readability
		originalURI := truncateString(result.OriginalURI, 45)

		// Format valid status with emoji
		validStr := "❌ No"
		if result.IsValid {
			validStr = "✅ Yes"
		}

		// Format status with color indicators
		status := formatStatus(result.Status)

		// Truncate error message
		errorMsg := truncateString(result.Error, 30)
		if errorMsg == "" {
			errorMsg = "-"
		}

		table.Append([]string{
			fmt.Sprintf("%d", i+1),
			originalURI,
			validStr,
			status,
			errorMsg,
		})
	}

	table.Render()

	// Print summary
	printSummary(results)
}

func formatStatus(status string) string {
	switch status {
	case "valid_image":
		return "✅ Valid Image"
	case "redirect_attempted":
		return "🔄 Redirect"
	case "non_200_status":
		return "❌ HTTP Error"
	case "non_image_content_type":
		return "📄 Not Image"
	case "network_error":
		return "🌐 Network Error"
	case "request_creation_failed":
		return "⚠️ Request Failed"
	case "standardization_failed":
		return "🔧 Standardization Failed"
	case "empty_original_uri":
		return "📭 Empty URI"
	default:
		return status
	}
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func printSummary(results []ValidationResult) {
	fmt.Println("\n📊 Summary")
	fmt.Println("==========")

	total := len(results)
	valid := 0

	for _, result := range results {
		if result.IsValid {
			valid++
		}
	}

	fmt.Printf("Total URIs processed: %d\n", total)
	fmt.Printf("Valid images: %d (%.1f%%)\n", valid, float64(valid)/float64(total)*100)
	fmt.Printf("Invalid images: %d (%.1f%%)\n", total-valid, float64(total-valid)/float64(total)*100)
}

// VerifyDirectImageAccess checks if a URL points directly to an image without redirects
// and has a common image content type.
func VerifyDirectImageAccess(ctx context.Context, urlStr string) (bool, string, error) {
	// Create a new HTTP client configured to not follow redirects
	noRedirectClient := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Important: Prevents following redirects
		},
		Timeout: 10 * time.Second, // Set a reasonable timeout for the request
	}

	req, err := http.NewRequestWithContext(ctx, "HEAD", urlStr, nil)
	if err != nil {
		return false, "request_creation_failed", fmt.Errorf("failed to create request for %s: %w", urlStr, err)
	}
	// Set a generic User-Agent. Consider making this configurable or more specific.
	req.Header.Set("User-Agent", "DankfolioImageValidator/1.0")

	resp, err := noRedirectClient.Do(req)
	// This error handling block needs to be before resp.Body.Close()
	if err != nil {
		// Check if the error is due to the redirect policy
		// url.Error is part of "net/url"
		if urlErr, ok := err.(*url.Error); ok && urlErr.Err == http.ErrUseLastResponse {
			location := ""
			// Ensure resp and resp.Header are not nil before trying to access Location.
			// This is important because the error might occur before a response is fully received.
			if resp != nil && resp.Header != nil {
				location = resp.Header.Get("Location")
				// It's good practice to close the body if a response was received, even in error cases.
				// However, in the case of ErrUseLastResponse, the body might not be fully formed or relevant.
				// For safety and consistency, ensure it's closed if resp is not nil.
				if resp.Body != nil {
					resp.Body.Close()
				}
			}
			return false, "redirect_attempted", fmt.Errorf("redirect attempted for %s (Location: %s)", urlStr, location)
		}
		return false, "network_error", fmt.Errorf("http request failed for %s: %w", urlStr, err)
	}
	defer resp.Body.Close()

	// Check for explicit redirect status codes first.
	// With CheckRedirect: ErrUseLastResponse, any redirect attempt should ideally result in an error caught above.
	// However, this explicit check handles cases where a server might send a 3xx status
	// without the Go http client necessarily wrapping the error as http.ErrUseLastResponse
	// (e.g. if the redirect is malformed or server closes connection weirdly after 3xx).
	if resp.StatusCode >= 300 && resp.StatusCode <= 399 {
		location := resp.Header.Get("Location")
		// Using "redirect_attempted" for consistency with the error path.
		return false, "redirect_attempted", fmt.Errorf("redirect status code %d for %s (Location: %s)", resp.StatusCode, urlStr, location)
	}

	if resp.StatusCode != http.StatusOK {
		return false, "non_200_status", fmt.Errorf("non-200 status for %s: %d", urlStr, resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	// Normalize content type by taking the part before any semicolon (e.g., charset) and converting to lower case.
	normalizedContentType := strings.ToLower(strings.Split(contentType, ";")[0])

	allowedContentTypes := map[string]bool{
		"image/png":     true,
		"image/jpeg":    true,
		"image/gif":     true,
		"image/webp":    true,
		"image/svg+xml": true,
	}

	if !allowedContentTypes[normalizedContentType] {
		return false, "non_image_content_type", fmt.Errorf("non-image content type for %s: %s", urlStr, contentType)
	}

	return true, urlStr, nil
}

// HTMLTemplateData holds the data for the HTML template
type HTMLTemplateData struct {
	Results   []ValidationResult
	Timestamp string
	Summary   Summary
}

type Summary struct {
	Total        int
	Valid        int
	Invalid      int
	StatusCounts map[string]int
}

func generateHTMLTestPage(results []ValidationResult) error {
	// Calculate summary
	summary := Summary{
		Total:        len(results),
		StatusCounts: make(map[string]int),
	}

	for _, result := range results {
		if result.IsValid {
			summary.Valid++
		} else {
			summary.Invalid++
		}
		summary.StatusCounts[result.Status]++
	}

	data := HTMLTemplateData{
		Results:   results,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Summary:   summary,
	}

	tmpl := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPFS Image Validation Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .image-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .image-card:hover {
            transform: translateY(-2px);
        }
        .image-container {
            width: 100%;
            height: 200px;
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .image-placeholder {
            color: #6c757d;
            font-size: 14px;
            text-align: center;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status-valid { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .status-redirect { background: #fff3cd; color: #856404; }
        .url-info {
            font-size: 12px;
            color: #6c757d;
            word-break: break-all;
            margin-bottom: 10px;
        }
        .error-info {
            font-size: 11px;
            color: #dc3545;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            margin-top: 10px;
        }
        .loading-indicator {
            display: none;
            color: #007bff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 IPFS Image Validation Test</h1>
        <p>Visual test of image URL accessibility</p>
        <p>Generated: {{.Timestamp}}</p>
    </div>

    <div class="summary">
        <h2>📊 Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">{{.Summary.Total}}</div>
                <div>Total URLs</div>
            </div>
            <div class="summary-card">
                <div class="summary-number" style="color: #28a745;">{{.Summary.Valid}}</div>
                <div>Valid Images</div>
            </div>
            <div class="summary-card">
                <div class="summary-number" style="color: #dc3545;">{{.Summary.Invalid}}</div>
                <div>Invalid Images</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">{{printf "%.1f%%" (div (mul (toFloat .Summary.Valid) 100.0) (toFloat .Summary.Total))}}</div>
                <div>Success Rate</div>
            </div>
        </div>
    </div>

    <div class="image-grid">
        {{range $index, $result := .Results}}
        <div class="image-card">
            <div class="status-badge {{if $result.IsValid}}status-valid{{else if eq $result.Status "redirect_attempted"}}status-redirect{{else}}status-error{{end}}">
                {{if $result.IsValid}}✅ Valid{{else if eq $result.Status "redirect_attempted"}}🔄 Redirect{{else}}❌ Error{{end}}
            </div>
            
            <div class="image-container">
                {{if $result.IsValid}}
                    <img src="{{$result.OriginalURI}}" 
                         alt="Image {{add $index 1}}" 
                         onload="this.parentElement.style.border='2px solid #28a745'"
                         onerror="this.parentElement.innerHTML='<div class=\'image-placeholder\'>❌ Failed to load<br>{{$result.Status}}</div>'; this.parentElement.style.border='2px solid #dc3545'">
                {{else}}
                    <div class="image-placeholder">
                        {{if eq $result.Status "redirect_attempted"}}🔄{{else}}❌{{end}} 
                        Cannot load<br>{{$result.Status}}
                    </div>
                {{end}}
            </div>
            
            <div class="url-info">
                <strong>Original:</strong><br>
                {{$result.OriginalURI}}
            </div>
            
            {{if ne $result.OriginalURI $result.StandardizedURL}}
            <div class="url-info">
                <strong>Standardized:</strong><br>
                {{$result.StandardizedURL}}
            </div>
            {{end}}
            
            {{if $result.Error}}
            <div class="error-info">
                <strong>Error:</strong> {{$result.Error}}
            </div>
            {{end}}
        </div>
        {{end}}
    </div>

    <script>
        // Add loading indicators
        document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                const container = img.parentElement;
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading-indicator';
                loadingDiv.innerHTML = '⏳ Loading...';
                loadingDiv.style.display = 'block';
                container.appendChild(loadingDiv);
                
                img.onload = function() {
                    loadingDiv.style.display = 'none';
                };
                
                img.onerror = function() {
                    loadingDiv.style.display = 'none';
                };
            });
        });
    </script>
</body>
</html>`

	// Create template with helper functions
	t := template.New("html").Funcs(template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"mul": func(a, b float64) float64 { return a * b },
		"div": func(a, b float64) float64 {
			if b == 0 {
				return 0
			}
			return a / b
		},
		"toFloat": func(a int) float64 { return float64(a) },
	})

	t, err := t.Parse(tmpl)
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	// Create output file in the same directory as main.go
	outputPath := "cmd/test-ipfs-img/ipfs-image-test.html"
	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create HTML file: %w", err)
	}
	defer file.Close()

	// Execute template
	if err := t.Execute(file, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	// Get absolute path for user convenience
	absPath, _ := filepath.Abs(outputPath)
	fmt.Printf("   Full path: %s\n", absPath)

	return nil
}
