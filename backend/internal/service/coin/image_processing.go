package coin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/imageproxy"
)

// processLogoURL processes a coin's logo URL through the image proxy service
// It immediately sets the S3 URL and uploads asynchronously
func (s *Service) processLogoURL(ctx context.Context, coin *model.Coin) {
	// Skip if imageProxy is not configured
	if s.imageProxy == nil {
		return
	}

	// Skip if logoURI is empty
	if coin.LogoURI == "" {
		// Set placeholder for coins with no logo
		coin.LogoURI = s.getPlaceholderURL()
		return
	}

	// Skip if already an S3 URL
	if imageproxy.IsS3URL(coin.LogoURI) {
		return
	}

	// Store original URL for async processing
	originalURL := coin.LogoURI
	
	// Immediately set the S3 URL (predictable based on mint address)
	// This URL will work once the image is uploaded
	coin.LogoURI = s.imageProxy.GetS3URL(coin.Address)
	
	// Try to download and upload asynchronously
	go func() {
		// Acquire rate limit token
		s.imageUploadLimiter <- struct{}{}
		defer func() {
			// Release token
			<-s.imageUploadLimiter
		}()
		
		// Use background context so it's not cancelled with the request
		bgCtx := context.Background()
		
		// Try to download from IPFS and upload to S3
		err := s.uploadLogoWithFallback(bgCtx, originalURL, coin.Address, coin.Symbol)
		if err != nil {
			slog.Error("Failed to download and upload logo after all retries",
				"coin", coin.Symbol,
				"address", coin.Address,
				"originalURL", originalURL,
				"error", err)
			
			// If download failed, transform to Pinata gateway URL for IPFS URLs
			// This allows the frontend to try fetching directly later
			s.updateLogoToPinataGateway(bgCtx, coin.Address, originalURL)
		}
	}()
}

// processLogoURLs processes multiple coins' logo URLs in parallel
func (s *Service) processLogoURLs(ctx context.Context, coins []model.Coin) {
	// Skip if imageProxy is not configured
	if s.imageProxy == nil {
		return
	}

	// Process each coin's logo
	for i := range coins {
		s.processLogoURL(ctx, &coins[i])
	}
}

// uploadLogoWithFallback tries to download a logo from IPFS (with fallback gateways) and upload to S3
func (s *Service) uploadLogoWithFallback(ctx context.Context, originalURL, mintAddress, symbol string) error {
	// If it's already a Pinata URL, try it first
	if !strings.Contains(originalURL, "gateway.pinata.cloud") && strings.Contains(originalURL, "ipfs") {
		cid := extractIPFSCID(originalURL)
		if cid != "" {
			// Try Pinata first since it's most reliable
			pinataURL := "https://gateway.pinata.cloud/ipfs/" + cid
			if err := s.tryUploadFromURL(ctx, pinataURL, mintAddress); err == nil {
				slog.Debug("Successfully uploaded via Pinata gateway",
					"symbol", symbol)
				return nil
			}
		}
	}
	
	// Try the original URL
	err := s.tryUploadFromURL(ctx, originalURL, mintAddress)
	if err == nil {
		return nil
	}
	
	// If it's an IPFS URL and failed, try other gateways
	if strings.Contains(originalURL, "ipfs") || strings.Contains(originalURL, "IPFS") {
		// Extract CID from various IPFS URL formats
		cid := extractIPFSCID(originalURL)
		if cid != "" {
			// Try alternative IPFS gateways (excluding Pinata if we already tried it)
			alternativeGateways := []string{
				"https://ipfs.io/ipfs/",
				"https://dweb.link/ipfs/",
				"https://cloudflare-ipfs.com/ipfs/",
				"https://w3s.link/ipfs/",
			}
			
			for _, gateway := range alternativeGateways {
				// Skip if we already tried this gateway
				if strings.Contains(originalURL, gateway) {
					continue
				}
				
				alternativeURL := gateway + cid
				slog.Debug("Trying alternative IPFS gateway",
					"symbol", symbol,
					"gateway", gateway,
					"cid", cid)
				
				if err := s.tryUploadFromURL(ctx, alternativeURL, mintAddress); err == nil {
					slog.Info("Successfully uploaded via alternative gateway",
						"symbol", symbol,
						"gateway", gateway)
					return nil
				}
			}
		}
	}
	
	return fmt.Errorf("failed to upload from all sources")
}

// tryUploadFromURL attempts to upload an image from a specific URL
func (s *Service) tryUploadFromURL(ctx context.Context, imageURL, mintAddress string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	
	_, err := s.imageProxy.ProcessAndUploadImage(ctx, imageURL, mintAddress)
	return err
}

// getPlaceholderURL returns the S3 URL for the placeholder image
func (s *Service) getPlaceholderURL() string {
	// Use a predictable placeholder URL in our S3 bucket
	return s.imageProxy.GetS3URL("placeholder")
}

// updateLogoToPinataGateway updates a coin's logo to use Pinata gateway URL
func (s *Service) updateLogoToPinataGateway(ctx context.Context, mintAddress, originalURL string) {
	// If it's an IPFS URL, transform it to Pinata gateway
	if strings.Contains(originalURL, "ipfs") || strings.Contains(originalURL, "IPFS") {
		cid := extractIPFSCID(originalURL)
		if cid != "" {
			coin, err := s.store.Coins().GetByField(ctx, "address", mintAddress)
			if err != nil {
				slog.Warn("Failed to get coin for Pinata gateway update",
					"address", mintAddress,
					"error", err)
				return
			}
			
			// Update to Pinata gateway URL
			coin.LogoURI = "https://gateway.pinata.cloud/ipfs/" + cid
			if err := s.store.Coins().Update(ctx, coin); err != nil {
				slog.Warn("Failed to update coin logo to Pinata gateway",
					"address", mintAddress,
					"error", err)
			} else {
				slog.Info("Updated coin logo to Pinata gateway URL",
					"address", mintAddress,
					"cid", cid)
			}
		}
	}
	// If not an IPFS URL, leave it as-is (could be a regular HTTP URL)
}

// extractIPFSCID extracts the CID from various IPFS URL formats
func extractIPFSCID(url string) string {
	// Handle ipfs:// URLs
	if strings.HasPrefix(url, "ipfs://") {
		return strings.TrimPrefix(url, "ipfs://")
	}
	
	// Handle gateway URLs like https://ipfs.io/ipfs/CID
	if idx := strings.Index(url, "/ipfs/"); idx != -1 {
		cidPart := url[idx+6:]
		// Remove any query parameters or additional path
		if qIdx := strings.IndexAny(cidPart, "?#"); qIdx != -1 {
			cidPart = cidPart[:qIdx]
		}
		return cidPart
	}
	
	// Handle subdomain format like https://CID.ipfs.dweb.link
	if strings.Contains(url, ".ipfs.") {
		parts := strings.Split(url, ".")
		if len(parts) > 2 {
			// Extract subdomain which should be the CID
			subdomain := strings.TrimPrefix(parts[0], "https://")
			subdomain = strings.TrimPrefix(subdomain, "http://")
			return subdomain
		}
	}
	
	return ""
}

