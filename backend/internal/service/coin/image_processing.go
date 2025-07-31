package coin

import (
	"context"
	"log/slog"

	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/imageproxy"
)

// processLogoURL processes a coin's logo URL through the image proxy service
// It uploads the image to S3 and returns the S3 URL
func (s *Service) processLogoURL(ctx context.Context, coin *model.Coin) {
	// Skip if imageProxy is not configured
	if s.imageProxy == nil {
		return
	}

	// Skip if logoURI is empty
	if coin.LogoURI == "" {
		return
	}

	// Skip if already an S3 URL
	if imageproxy.IsS3URL(coin.LogoURI) {
		return
	}

	// Process and upload the image
	s3URL, err := s.imageProxy.ProcessAndUploadImage(ctx, coin.LogoURI, coin.Address)
	if err != nil {
		slog.Warn("Failed to process logo image",
			"coin", coin.Symbol,
			"address", coin.Address,
			"logoURI", coin.LogoURI,
			"error", err)
		// Don't update the logoURI on failure - keep the original
		return
	}

	// Update the coin's logoURI to the S3 URL
	coin.LogoURI = s3URL
	slog.Debug("Successfully processed logo image",
		"coin", coin.Symbol,
		"address", coin.Address,
		"s3URL", s3URL)
}

// processLogoURLs processes multiple coins' logo URLs in parallel
func (s *Service) processLogoURLs(ctx context.Context, coins []model.Coin) {
	// Skip if imageProxy is not configured
	if s.imageProxy == nil {
		return
	}

	// Process each coin's logo
	// Note: We process synchronously for now to avoid overwhelming the system
	// In the future, we can add goroutines with a worker pool
	for i := range coins {
		s.processLogoURL(ctx, &coins[i])
	}
}

