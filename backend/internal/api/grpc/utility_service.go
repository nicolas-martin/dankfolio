package grpc

import (
	"context"
	"fmt"
	"log"
	"time"

	"connectrpc.com/connect"
	"github.com/patrickmn/go-cache"

	// Corrected import path for base proto definitions
	dankfoliov1 "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1"
	// Import connect-go generated code
	dankfoliov1connect "github.com/nicolas-martin/dankfolio/backend/gen/proto/go/dankfolio/v1/v1connect"
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
}

// NewService creates a new instance of the image proxy Service.
// It requires a RawDataFetcher implementation (like an adapter for offchain.Client).
func NewService(fetcher imageservice.RawDataFetcher) *Service {
	// Create a cache with a default expiration of 5 minutes, and purge expired items every 10 minutes.
	c := cache.New(5*time.Minute, 10*time.Minute)

	return &Service{
		fetcher: fetcher,
		cache:   c,
	}
}

// GetProxiedImage fetches an image from an external URL via the backend proxy,
// using an in-memory cache.
// Corrected signature to use dankfoliov1 types inside connect types
func (s *Service) GetProxiedImage(ctx context.Context, req *connect.Request[dankfoliov1.GetProxiedImageRequest]) (*connect.Response[dankfoliov1.GetProxiedImageResponse], error) {
	imageURL := req.Msg.GetImageUrl()
	if imageURL == "" {
		log.Printf("❌ GetProxiedImage: Empty image_url received")
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("image_url cannot be empty"))
	}

	log.Printf("🔄 GetProxiedImage: Processing request for URL: %s", imageURL)

	// 1. Check cache
	if cached, found := s.cache.Get(imageURL); found {
		if cachedData, ok := cached.(*CachedImageData); ok {
			log.Printf("✅ GetProxiedImage: Cache hit for URL: %s", imageURL)
			// Corrected response type creation
			resp := &dankfoliov1.GetProxiedImageResponse{
				ImageData:   cachedData.Data,
				ContentType: cachedData.ContentType,
			}
			return connect.NewResponse(resp), nil
		} else {
			// Item was in cache but not the expected type, log warning and continue to fetch
			log.Printf("⚠️ GetProxiedImage: Cache item for %s had unexpected type: %T", imageURL, cached)
		}
	}

	log.Printf("🔍 GetProxiedImage: Cache miss for URL: %s. Fetching from source...", imageURL)

	// 2. Fetch from source using the injected fetcher
	data, contentType, err := s.fetcher.FetchRawData(ctx, imageURL)
	if err != nil {
		log.Printf("❌ GetProxiedImage: Failed to fetch raw data for %s: %v", imageURL, err)
		// Consider mapping specific fetch errors to gRPC/Connect status codes
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch image from %s: %w", imageURL, err))
	}

	log.Printf("💾 GetProxiedImage: Successfully fetched %d bytes (%s) for %s. Storing in cache...", len(data), contentType, imageURL)

	// 3. Store in cache
	cacheItem := &CachedImageData{
		Data:        data,
		ContentType: contentType,
	}
	s.cache.Set(imageURL, cacheItem, cache.DefaultExpiration)

	// 4. Return response
	// Corrected response type creation
	resp := &dankfoliov1.GetProxiedImageResponse{
		ImageData:   data,
		ContentType: contentType,
	}
	return connect.NewResponse(resp), nil
}
