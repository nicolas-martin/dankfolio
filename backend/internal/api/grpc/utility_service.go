package grpc

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/patrickmn/go-cache"

	// Corrected import path for base proto definitions
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	// Import connect-go generated code
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
	// Import db for store interface
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	// Import the image service package for the interface
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"
)

// Ensure Service implements the connect-go handler interface.
var _ dankfoliov1connect.UtilityServiceHandler = (*Service)(nil)

// CachedImageData stores the fetched image data and its content type.
// (Keeping this struct within the api package for now)
type CachedImageData struct {
	Data        []byte
	ContentType string
}

// Service implements the dankfoliov1connect.UtilityServiceHandler interface.
type Service struct {
	dankfoliov1connect.UnimplementedUtilityServiceHandler                             // Embed connect-go unimplemented handler
	fetcher                                               imageservice.RawDataFetcher // Use interface from image service package
	cache                                                 *cache.Cache                // In-memory cache for proxied images
	store                                                 db.Store                    // Store for database operations
}

// NewService creates a new instance of the image proxy Service.
// It requires a RawDataFetcher implementation (like an adapter for offchain.Client).
func NewService(fetcher imageservice.RawDataFetcher, store db.Store) *Service {
	// Create a cache with a default expiration of 7 days (approx), and purge expired items every hour.
	// Use cache.NoExpiration for non-expiring cache if desired, but periodic cleanup is still good.
	cacheDuration := 7 * 24 * time.Hour
	cleanupInterval := 1 * time.Hour
	c := cache.New(cacheDuration, cleanupInterval)

	return &Service{
		fetcher: fetcher,
		cache:   c,
		store:   store,
	}
}

// GetProxiedImage fetches an image from an external URL via the backend proxy,
// using an in-memory cache.
func (s *Service) GetProxiedImage(ctx context.Context, req *connect.Request[dankfoliov1.GetProxiedImageRequest]) (*connect.Response[dankfoliov1.GetProxiedImageResponse], error) {
	imageURL := req.Msg.GetImageUrl()

	if imageURL == "" {
		slog.Error("GetProxiedImage received empty image_url")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("image_url cannot be empty"))
	}

	slog.Debug("Processing GetProxiedImage request", "url", imageURL)

	// 1. Check cache
	if cached, found := s.cache.Get(imageURL); found {
		if cachedData, ok := cached.(*CachedImageData); ok {
			slog.Debug("Cache hit for GetProxiedImage", "url", imageURL)
			resp := &dankfoliov1.GetProxiedImageResponse{
				ImageData:   cachedData.Data,
				ContentType: cachedData.ContentType,
			}
			return connect.NewResponse(resp), nil
		} else {
			slog.Warn("Cache item had unexpected type", "url", imageURL, "type", fmt.Sprintf("%T", cached))
		}
	}

	slog.Debug("Cache miss for GetProxiedImage, fetching from source", "url", imageURL)

	// 2. Fetch from source using the injected fetcher
	data, contentType, err := s.fetcher.FetchRawData(ctx, imageURL)
	if err != nil {
		slog.Error("Failed to fetch image data", "url", imageURL, "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch image from %s: %w", imageURL, err))
	}

	slog.Debug("Successfully fetched image data",
		"url", imageURL,
		"bytes", len(data),
		"content_type", contentType)

	// 3. Store in cache
	cacheItem := &CachedImageData{
		Data:        data,
		ContentType: contentType,
	}
	s.cache.Set(imageURL, cacheItem, cache.DefaultExpiration)

	// 4. Return response
	resp := &dankfoliov1.GetProxiedImageResponse{
		ImageData:   data,
		ContentType: contentType,
	}
	return connect.NewResponse(resp), nil
}

// DeleteAccount deletes all user data associated with the authenticated user.
// This satisfies App Store Guideline 5.1.1(v) requirement for account deletion.
func (s *Service) DeleteAccount(ctx context.Context, req *connect.Request[dankfoliov1.DeleteAccountRequest]) (*connect.Response[dankfoliov1.DeleteAccountResponse], error) {
	walletPublicKey := req.Msg.GetWalletPublicKey()
	confirmation := req.Msg.GetConfirmation()

	// Validate inputs
	if walletPublicKey == "" {
		slog.Error("DeleteAccount received empty wallet_public_key")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("wallet_public_key cannot be empty"))
	}

	if confirmation != "DELETE" {
		slog.Error("DeleteAccount received invalid confirmation", "confirmation", confirmation)
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("confirmation must be 'DELETE' to proceed"))
	}

	slog.Info("Processing DeleteAccount request", "wallet", walletPublicKey)

	// Use the store's DeleteAccount method which handles the transaction
	if err := s.store.DeleteAccount(ctx, walletPublicKey); err != nil {
		slog.Error("Failed to delete account", "wallet", walletPublicKey, "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to delete account: %w", err))
	}

	resp := &dankfoliov1.DeleteAccountResponse{
		Success: true,
		Message: fmt.Sprintf("Account for wallet %s has been successfully deleted", walletPublicKey),
	}

	return connect.NewResponse(resp), nil
}
