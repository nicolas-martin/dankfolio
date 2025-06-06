package util

import (
	"log/slog"
	"strings"
)


var DefaultCIDv0Gateways = []string{
	"https://gateway.pinata.cloud/ipfs/", // Pinata is generally more reliable
	"https://dweb.link/ipfs/",            // Protocol Labs' newer gateway
	"https://ipfs.io/ipfs/",              // Keep as fallback, but not first choice

}

// TryNextGatewayOnFailure determines if we should try the next gateway when one fails
// Set this to false to disable automatic fallback
var TryNextGatewayOnFailure = true

func StandardizeIpfsUrl(iconUrlInput string) string {
	if iconUrlInput == "" {
		return ""
	}

	// Check for subdomain IPFS format (like pump.ipfs.dweb.link or CID.ipfs.dweb.link)
	if strings.Contains(iconUrlInput, ".ipfs.dweb.link/") {
		// Extract the CID from the subdomain
		// URL format: https://subdomain.ipfs.dweb.link/path
		// For pump.fun: https://pump.ipfs.dweb.link/CID_filename.webp
		// For regular: https://CID.ipfs.dweb.link/path

		parts := strings.SplitN(iconUrlInput, ".ipfs.dweb.link/", 2)
		if len(parts) == 2 {
			// Extract subdomain from the URL
			urlParts := strings.Split(parts[0], "://")
			if len(urlParts) == 2 {
				subdomain := urlParts[1] // This could be "pump" or a CID
				pathPart := parts[1]     // This is the path after .ipfs.dweb.link/

				// Check if subdomain is "pump" (pump.fun case)
				if subdomain == "pump" {
					// For pump.fun URLs, the CID is in the path part before the first underscore
					// Example: 8i7j6iX1XbVoZJT2RPY1ZKCTDngbvhz6A318V2R9pump_147.webp
					// The CID is: 8i7j6iX1XbVoZJT2RPY1ZKCTDngbvhz6A318V2R9pump
					underscoreIdx := strings.Index(pathPart, "_")
					if underscoreIdx != -1 {
						// Extract everything before the underscore as the CID
						cid := pathPart[:underscoreIdx]
						// The rest is the file extension/suffix
						suffix := pathPart[underscoreIdx:]

						// Use preferred gateway for pump.fun URLs
						if len(DefaultCIDv0Gateways) == 0 {
							slog.Error("No default gateways configured for pump.fun URL.", "url", iconUrlInput)
							return iconUrlInput
						}
						return DefaultCIDv0Gateways[0] + cid + suffix
					} else {
						// No underscore found, treat the whole path as CID
						if len(DefaultCIDv0Gateways) == 0 {
							slog.Error("No default gateways configured for pump.fun URL.", "url", iconUrlInput)
							return iconUrlInput
						}
						return DefaultCIDv0Gateways[0] + pathPart
					}
				} else {
					// Regular CID.ipfs.dweb.link format
					cid := subdomain

					// Check if it's a CIDv0 (starts with Qm and is 46 chars)
					if strings.HasPrefix(cid, "Qm") && len(cid) == 46 {
						if len(DefaultCIDv0Gateways) == 0 {
							slog.Error("No default CIDv0 gateways configured for subdomain URL.", "url", iconUrlInput)
							return iconUrlInput
						}
						return DefaultCIDv0Gateways[0] + cid + "/" + pathPart
					} else {
						// It's a CIDv1 in subdomain format on dweb.link. It's already standard.
						return iconUrlInput
					}
				}
			}
		}
		// If parsing failed, return original
		return iconUrlInput
	}

	// Check if it's an IPFS gateway URL (contains "/ipfs/")
	if strings.Contains(iconUrlInput, "/ipfs/") {
		// Extract IPFS hash part (the part after "/ipfs/")
		parts := strings.SplitN(iconUrlInput, "/ipfs/", 2)
		if len(parts) < 2 || parts[1] == "" {
			return iconUrlInput // Malformed or nothing after /ipfs/, return original
		}

		ipfsPathContent := parts[1] // This is <hash_or_cid_or_cid_with_path_and_query>

		var ipfsResourceIdentifier string
		if queryIdx := strings.Index(ipfsPathContent, "?"); queryIdx != -1 {
			ipfsResourceIdentifier = ipfsPathContent[:queryIdx]
		} else {
			ipfsResourceIdentifier = ipfsPathContent
		}

		firstPathComponent := strings.SplitN(ipfsResourceIdentifier, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 {
			// It's CIDv0. Use the first default gateway.
			if len(DefaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return DefaultCIDv0Gateways[0] + ipfsResourceIdentifier
		} else {
			// For now, use defaultCIDv0Gateways for CIDv1 as well
			// This is because we want to use our paid Pinata gateway for all CIDs
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default gateways configured for CIDv1.", "url", iconUrlInput)
				return iconUrlInput
			}
			return defaultCIDv0Gateways[0] + ipfsResourceIdentifier

			// Original behavior using subdomain format commented out to avoid linter errors:
			// Use the commented code below if you want to revert to subdomain format
			/*
				subdomainPart := firstPathComponent
				pathPart := ""
				if restOfPathIdx := strings.Index(ipfsResourceIdentifier, "/"); restOfPathIdx != -1 {
					pathPart = ipfsResourceIdentifier[restOfPathIdx:]
				} else {
					// No path after CID, add trailing slash for CIDv1
					pathPart = "/"
				}
				return "https://" + subdomainPart + ".ipfs.dweb.link" + pathPart
			*/
		}
	} else if strings.HasPrefix(iconUrlInput, "ipfs://") {
		// Handle raw ipfs:// URIs
		trimmedCidAndPath := strings.TrimPrefix(iconUrlInput, "ipfs://")

		// Handle empty case
		if trimmedCidAndPath == "" {
			return iconUrlInput // Return original malformed URL
		}

		firstPathComponent := strings.SplitN(trimmedCidAndPath, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 {
			// It's CIDv0. Use the first default gateway.
			if len(DefaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured for raw CIDv0 URI.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return DefaultCIDv0Gateways[0] + trimmedCidAndPath
		} else {
			// For now, use defaultCIDv0Gateways for CIDv1 as well
			// This is because we want to use our paid Pinata gateway for all CIDs
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default gateways configured for CIDv1.", "url", iconUrlInput)
				return iconUrlInput
			}
			return defaultCIDv0Gateways[0] + trimmedCidAndPath

			// Original behavior using subdomain format commented out to avoid linter errors:
			// Use the commented code below if you want to revert to subdomain format
			/*
				subdomainPart := firstPathComponent
				pathPart := ""
				if restOfPathIdx := strings.Index(trimmedCidAndPath, "/"); restOfPathIdx != -1 {
					pathPart = trimmedCidAndPath[restOfPathIdx:]
				} else {
					// No path after CID, add trailing slash for CIDv1
					pathPart = "/"
				}
				return "https://" + subdomainPart + ".ipfs.dweb.link" + pathPart
			*/
		}
	}

	// Not an IPFS URL (including dexscreener, etc.), return as is
	// This handles non-IPFS URLs like https://dd.dexscreener.com/... which should remain unchanged
	return iconUrlInput
}

// GetNextGateway returns the next gateway in the list if TryNextGatewayOnFailure is true
// Returns empty string if there are no more gateways or if TryNextGatewayOnFailure is false
func GetNextGateway(currentGateway string) string {
	if !TryNextGatewayOnFailure || len(defaultCIDv0Gateways) <= 1 {
		return ""
	}

	for i, gateway := range defaultCIDv0Gateways {
		if gateway == currentGateway && i < len(defaultCIDv0Gateways)-1 {
			return defaultCIDv0Gateways[i+1]
		}
	}

	return ""
}
