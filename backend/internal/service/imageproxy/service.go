package imageproxy

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/s3"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

type Service struct {
	s3Client   *s3.Client
	httpClient *http.Client
}

// NewService creates a new image proxy service
func NewService(s3Client *s3.Client) *Service {
	return &Service{
		s3Client: s3Client,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ProcessAndUploadImage downloads an image from the given URL and uploads it to S3
// Returns the S3 URL or an error
func (s *Service) ProcessAndUploadImage(ctx context.Context, imageURL string, mintAddress string) (string, error) {
	if imageURL == "" {
		return "", fmt.Errorf("empty image URL")
	}

	// Generate S3 key for the image
	key := s.generateS3Key(mintAddress)

	// Check if image already exists in S3
	exists, err := s.s3Client.ImageExists(ctx, key)
	if err != nil {
		slog.Warn("Failed to check if image exists in S3", 
			"mintAddress", mintAddress,
			"error", err)
	}
	if exists {
		// Image already uploaded, return the S3 URL
		s3URL := s.s3Client.GetImageURL(key)
		slog.Debug("Image already exists in S3",
			"mintAddress", mintAddress,
			"s3URL", s3URL)
		return s3URL, nil
	}

	// Resolve IPFS URLs to HTTP gateway URLs
	resolvedURL := s.resolveImageURL(imageURL)
	
	slog.Debug("Resolved image URL", 
		"original", imageURL,
		"resolved", resolvedURL)

	// Download the image
	imageData, contentType, err := s.downloadImage(ctx, resolvedURL)
	if err != nil {
		return "", fmt.Errorf("failed to download image: %w", err)
	}

	// Upload to S3
	s3URL, err := s.s3Client.UploadImage(ctx, key, bytes.NewReader(imageData), contentType)
	if err != nil {
		return "", fmt.Errorf("failed to upload image to S3: %w", err)
	}

	slog.Info("Successfully processed and uploaded image",
		"mintAddress", mintAddress,
		"originalURL", imageURL,
		"s3URL", s3URL)

	return s3URL, nil
}

// generateS3Key generates a consistent S3 key for a token image
func (s *Service) generateS3Key(mintAddress string) string {
	// Use a simple structure: tokens/{mint_address}.png
	return fmt.Sprintf("tokens/%s.png", mintAddress)
}

// resolveImageURL resolves IPFS and other URLs to HTTP URLs
func (s *Service) resolveImageURL(imageURL string) string {
	// Use existing IPFS standardization logic
	return util.StandardizeIpfsUrl(imageURL)
}

// downloadImage downloads an image from the given URL with retry logic
func (s *Service) downloadImage(ctx context.Context, imageURL string) ([]byte, string, error) {
	maxRetries := 3
	baseDelay := time.Second

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			delay := baseDelay * time.Duration(1<<(attempt-1))
			slog.Debug("Retrying download after delay",
				"attempt", attempt+1,
				"delay", delay)
			
			select {
			case <-time.After(delay):
				// Continue with retry
			case <-ctx.Done():
				return nil, "", ctx.Err()
			}
		}

		req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
		if err != nil {
			return nil, "", fmt.Errorf("failed to create request: %w", err)
		}

		// Set user agent to avoid blocks
		req.Header.Set("User-Agent", "Dankfolio/1.0")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			if attempt < maxRetries-1 {
				slog.Warn("Download failed, will retry",
					"error", err,
					"attempt", attempt+1)
				continue
			}
			return nil, "", fmt.Errorf("failed to download image: %w", err)
		}
		defer resp.Body.Close()

		// Handle rate limiting with retry
		if resp.StatusCode == http.StatusTooManyRequests && attempt < maxRetries-1 {
			slog.Warn("Rate limited, will retry",
				"statusCode", resp.StatusCode,
				"attempt", attempt+1)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			return nil, "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		}

		// Read the image data
		data, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // Limit to 10MB
		if err != nil {
			return nil, "", fmt.Errorf("failed to read image data: %w", err)
		}

		// Determine content type
		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			// Try to detect from data
			contentType = http.DetectContentType(data)
		}

		// Validate it's an image or handle common cases
		if !strings.HasPrefix(contentType, "image/") {
			// Sometimes IPFS returns application/octet-stream for images
			if contentType == "application/octet-stream" {
				// Try to detect from data
				detectedType := http.DetectContentType(data)
				if strings.HasPrefix(detectedType, "image/") {
					contentType = detectedType
					slog.Debug("Detected image type from content",
						"originalType", "application/octet-stream",
						"detectedType", detectedType)
				} else {
					// For IPFS URLs, if we get application/octet-stream and can't detect,
					// assume it's a PNG (most common case)
					if strings.Contains(imageURL, "gateway.pinata.cloud/ipfs/") || 
					   strings.Contains(imageURL, "ipfs.io/ipfs/") ||
					   strings.Contains(imageURL, "dweb.link/ipfs/") {
						contentType = "image/png"
						slog.Warn("IPFS image with unknown content type, defaulting to PNG",
							"url", imageURL,
							"originalType", "application/octet-stream",
							"detectedType", detectedType)
					} else {
						slog.Debug("Failed to detect image type",
							"contentType", contentType,
							"detectedType", detectedType)
						return nil, "", fmt.Errorf("invalid content type: %s (detected: %s)", contentType, detectedType)
					}
				}
			} else {
				return nil, "", fmt.Errorf("invalid content type: %s", contentType)
			}
		}

		return data, contentType, nil
	}

	return nil, "", fmt.Errorf("failed after %d attempts", maxRetries)
}

// GetS3URL returns the S3 URL for a given mint address without downloading
func (s *Service) GetS3URL(mintAddress string) string {
	key := s.generateS3Key(mintAddress)
	return s.s3Client.GetImageURL(key)
}

// MigrateImageToS3 migrates an existing image URL to S3
// This is useful for batch migration of existing coins
func (s *Service) MigrateImageToS3(ctx context.Context, imageURL string, mintAddress string) (string, error) {
	// If it's already an S3 URL, skip migration
	if strings.Contains(imageURL, "linodeobjects.com") {
		slog.Debug("Image already on S3, skipping migration",
			"mintAddress", mintAddress,
			"url", imageURL)
		return imageURL, nil
	}

	return s.ProcessAndUploadImage(ctx, imageURL, mintAddress)
}

// IsS3URL checks if a URL is already an S3 URL
func IsS3URL(url string) bool {
	return strings.Contains(url, "linodeobjects.com") || 
	       strings.Contains(url, "s3.amazonaws.com")
}