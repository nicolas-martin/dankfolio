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

// downloadImage downloads an image from the given URL
func (s *Service) downloadImage(ctx context.Context, imageURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set user agent to avoid blocks
	req.Header.Set("User-Agent", "Dankfolio/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

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

	// Validate it's an image
	if !strings.HasPrefix(contentType, "image/") {
		return nil, "", fmt.Errorf("invalid content type: %s", contentType)
	}

	return data, contentType, nil
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