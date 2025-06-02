package util

import (
	"log/slog"
	"strings"
)

func StandardizeIpfsUrl(iconUrlInput string) string {
	if iconUrlInput == "" {
		return ""
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
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return defaultCIDv0Gateways[0] + ipfsResourceIdentifier
		} else {
			// Assume it's CIDv1 or other. Use subdomain format with the first path component (potential CID).
			subdomainPart := firstPathComponent
			pathPart := ""
			if restOfPathIdx := strings.Index(ipfsResourceIdentifier, "/"); restOfPathIdx != -1 {
				pathPart = ipfsResourceIdentifier[restOfPathIdx:]
			} else {
				// No path after CID, add trailing slash for CIDv1
				pathPart = "/"
			}
			return "https://" + subdomainPart + ".ipfs.dweb.link" + pathPart
		}
	} else if strings.HasPrefix(iconUrlInput, "ipfs://") {
		// Handle raw ipfs:// URIs
		trimmedCidAndPath := strings.TrimPrefix(iconUrlInput, "ipfs://")

		firstPathComponent := strings.SplitN(trimmedCidAndPath, "/", 2)[0]

		if strings.HasPrefix(firstPathComponent, "Qm") && len(firstPathComponent) == 46 {
			// It's CIDv0. Use the first default gateway.
			if len(defaultCIDv0Gateways) == 0 {
				slog.Error("No default CIDv0 gateways configured for raw CIDv0 URI.", "url", iconUrlInput)
				return iconUrlInput // return original if no gateways are available
			}
			return defaultCIDv0Gateways[0] + trimmedCidAndPath
		} else {
			subdomainPart := firstPathComponent
			pathPart := ""
			if restOfPathIdx := strings.Index(trimmedCidAndPath, "/"); restOfPathIdx != -1 {
				pathPart = trimmedCidAndPath[restOfPathIdx:]
			} else {
				// No path after CID, add trailing slash for CIDv1
				pathPart = "/"
			}
			return "https://" + subdomainPart + ".ipfs.dweb.link" + pathPart
		}
	}

	// Not an IPFS gateway URL and not a raw ipfs:// URI, return as is
	return iconUrlInput
}
