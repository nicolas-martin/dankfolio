package coin

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockJupiterClient is a mock for the Jupiter client
type MockJupiterClient struct {
	mock.Mock
}

func (m *MockJupiterClient) GetCoinInfo(ctx context.Context, mintAddress string) (*jupiter.TokenInfo, error) {
	args := m.Called(ctx, mintAddress)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.TokenInfo), args.Error(1)
}

func (m *MockJupiterClient) GetCoinPrices(ctx context.Context, mintAddresses []string) (map[string]float64, error) {
	args := m.Called(ctx, mintAddresses)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]float64), args.Error(1)
}

// MockSolanaClient is a mock for the Solana client
type MockSolanaClient struct {
	mock.Mock
}

func (m *MockSolanaClient) GetMetadataAccount(ctx context.Context, mintAddress string) (*solana.TokenMetadata, error) {
	args := m.Called(ctx, mintAddress)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*solana.TokenMetadata), args.Error(1)
}

// MockOffchainClient is a mock for the Offchain client
type MockOffchainClient struct {
	mock.Mock
}

func (m *MockOffchainClient) FetchMetadata(uri string) (map[string]any, error) {
	args := m.Called(uri)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]any), args.Error(1)
}

func newTestService(cfg *Config, jupiterClient jupiter.Client, solanaClient solana.Client, offchainClient offchain.Client) *Service {
	// For tests, we don't need a real store if not testing DB interactions.
	// If store interactions become part of what's tested here, a mock store would be needed.
	return NewService(cfg, &http.Client{}, jupiterClient, nil, solanaClient, offchainClient)
}

func TestMain(m *testing.M) {
	// Disable slog output for cleaner test logs
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError + 10})))
	os.Exit(m.Run())
}

func TestEnrichCoinData_NonIPFSIconURI(t *testing.T) {
	mockJupiter := new(MockJupiterClient)
	mockSolana := new(MockSolanaClient)
	mockOffchain := new(MockOffchainClient)

	cfg := &Config{
		// IPFSNodeAPIAddress and IPFSPublicGatewayURL / PreferredGatewayForCIDv0 are no longer part of coin.Config
	}
	service := newTestService(cfg, mockJupiter, mockSolana, mockOffchain)

	mintAddress := "testmint1"
	httpIconURL := "http://example.com/icon.png"

	mockJupiter.On("GetCoinInfo", mock.Anything, mintAddress).Return(&jupiter.TokenInfo{Name: "Test Coin", Symbol: "TST"}, nil)
	mockJupiter.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil)
	mockSolana.On("GetMetadataAccount", mock.Anything, mintAddress).Return(&solana.TokenMetadata{Data: solana.MetadataData{Uri: "http://example.com/metadata.json"}}, nil)
	mockOffchain.On("FetchMetadata", "http://example.com/metadata.json").Return(map[string]any{"image": httpIconURL}, nil)

	coin, err := service.EnrichCoinData(context.Background(), mintAddress, "", "", 0)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, httpIconURL, coin.IconUrl)
	assert.Empty(t, coin.ResolvedIconUrl, "ResolvedIconUrl should be empty for non-IPFS URIs")

	mockJupiter.AssertExpectations(t)
	mockSolana.AssertExpectations(t)
	mockOffchain.AssertExpectations(t)
}

// TestEnrichCoinData_StandardizeURL tests the standardizeIpfsUrl logic via EnrichCoinData
func TestEnrichCoinData_StandardizeURL(t *testing.T) {
	tests := []struct {
		name         string
		inputIconUrl string
		// preferredGatewayForCIDv0 string, // This field is removed
		expectedResolvedIconUrl string
		mockOffchainError       error
		mockJupiterLogoURI      string // To simulate Jupiter providing an icon URL
		initialIconUrl          string // To simulate an icon URL already present on the coin
	}{
		// Scenario 1: Non-IPFS URL
		{
			name:                    "Non-IPFS URL",
			inputIconUrl:            "https://example.com/image.png",
			expectedResolvedIconUrl: "https://example.com/image.png",
		},
		// Scenario 2: IPFS Gateway URL with CIDv0
		{
			name:                    "IPFS Gateway URL with CIDv0",
			inputIconUrl:            "https://othergateway.com/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Scenario 3: IPFS Gateway URL with CIDv1
		{
			name:                    "IPFS Gateway URL with CIDv1",
			inputIconUrl:            "https://othergateway.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expectedResolvedIconUrl: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/",
		},
		// Scenario 4: IPFS Gateway URL with CIDv0 and Sub-path
		{
			name:                    "IPFS Gateway URL with CIDv0 and Sub-path",
			inputIconUrl:            "https://othergateway.com/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png",
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png", // Uses hardcoded default
		},
		// Scenario 5: IPFS Gateway URL with CIDv1 and Sub-path
		{
			name:                    "IPFS Gateway URL with CIDv1 and Sub-path",
			inputIconUrl:            "https://othergateway.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png",
			expectedResolvedIconUrl: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/images/logo.png",
		},
		// Scenario 6: Raw ipfs://CIDv0 URI
		{
			name:                    "Raw ipfs://CIDv0 URI",
			inputIconUrl:            "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Scenario 7: Raw ipfs://CIDv1 URI
		{
			name:                    "Raw ipfs://CIDv1 URI",
			inputIconUrl:            "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expectedResolvedIconUrl: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/",
		},
		// Scenario 8: Raw ipfs://CIDv0 URI with Sub-path
		{
			name:                    "Raw ipfs://CIDv0 URI with Sub-path",
			inputIconUrl:            "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png",
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png", // Uses hardcoded default
		},
		// Scenario 9: Raw ipfs://CIDv1 URI with Sub-path
		{
			name:                    "Raw ipfs://CIDv1 URI with Sub-path",
			inputIconUrl:            "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png",
			expectedResolvedIconUrl: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/images/logo.png",
		},
		// Scenario 10: Empty or Malformed Input iconUrl
		{name: "Empty inputIconUrl", inputIconUrl: "", expectedResolvedIconUrl: ""},
		{name: "Malformed httpz", inputIconUrl: "httpz://blah", expectedResolvedIconUrl: "httpz://blah"},
		{name: "Malformed /ipfs/", inputIconUrl: "/ipfs/", expectedResolvedIconUrl: "/ipfs/"},
		// Scenario 11: (Removed - PreferredGatewayForCIDv0 empty in config is no longer applicable)
		// Test Jupiter Precedence for IconUrl
		{
			name:                    "Jupiter provides non-IPFS IconUrl, metadata has IPFS IconUrl",
			inputIconUrl:            "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // from offchainMeta
			mockJupiterLogoURI:      "https://example.com/jupiter_icon.png",
			expectedResolvedIconUrl: "https://example.com/jupiter_icon.png", // Standardize will run on Jupiter's URL
		},
		{
			name:                    "Jupiter provides IPFS CIDv0 IconUrl",
			inputIconUrl:            "http://someother.com/image.png", // from offchainMeta (but Jupiter will override)
			mockJupiterLogoURI:      "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Test initialIconUrl passed to EnrichCoinData
		{
			name:                    "InitialIconUrl is IPFS CIDv0",
			initialIconUrl:          "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",               // Passed to EnrichCoinData
			inputIconUrl:            "",                                                                    // No metadata or jupiter icon
			expectedResolvedIconUrl: "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockJup := new(MockJupiterClient)
			mockSol := new(MockSolanaClient)
			mockOff := new(MockOffchainClient)

			// Config struct for coin service is now empty or has unrelated fields.
			// PreferredGatewayForCIDv0 is no longer configured here.
			cfg := &Config{}
			service := newTestService(cfg, mockJup, mockSol, mockOff)
			mintAddress := "testmint_" + tt.name

			// Setup mocks
			// Jupiter GetCoinInfo (used for IconUrl if LogoURI is present)
			jupiterTokenInfo := &jupiter.TokenInfo{Name: "Test Coin", Symbol: "TST"}
			if tt.mockJupiterLogoURI != "" {
				jupiterTokenInfo.LogoURI = tt.mockJupiterLogoURI
			}
			mockJup.On("GetCoinInfo", mock.Anything, mintAddress).Return(jupiterTokenInfo, nil)
			mockJup.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil)

			// Solana GetMetadataAccount (always needed to proceed to offchain)
			mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(
				&solana.TokenMetadata{Data: solana.MetadataData{Uri: "http://example.com/metadata.json"}}, nil,
			)

			// Offchain FetchMetadata (used for IconUrl if Jupiter doesn't provide one and tt.inputIconUrl is set)
			offchainReturn := map[string]any{}
			if tt.inputIconUrl != "" && tt.mockJupiterLogoURI == "" && tt.initialIconUrl == "" { // Only use offchain if jupiter/initial didn't provide
				offchainReturn["image"] = tt.inputIconUrl
			} else if tt.inputIconUrl != "" && tt.mockJupiterLogoURI == "" && tt.initialIconUrl != "" && tt.inputIconUrl != tt.initialIconUrl {
				// This case is tricky: if initial is set, and offchain is also set, populateIconFromMetadata gives precedence to initial if not empty.
				// To test offchain inputIconUrl when initialIconUrl is also present, ensure initialIconUrl is what standardize operates on,
				// or ensure populateIconFromMetadata's logic is what's being tested.
				// For these tests, we assume inputIconUrl is what we want to see processed by standardize,
				// so ensure it's the one that makes it to coin.IconUrl before standardize is called.
				// If initialIconUrl is set, it will be used. If Jupiter is set, it will be used.
				// This setup prioritizes: Jupiter > Initial > Offchain for coin.IconUrl before standardization.
				// So, if testing offchain's inputIconUrl, ensure Jupiter and Initial are blank.
				offchainReturn["image"] = tt.inputIconUrl
			}

			if tt.mockOffchainError != nil {
				mockOff.On("FetchMetadata", "http://example.com/metadata.json").Return(nil, tt.mockOffchainError)
			} else {
				mockOff.On("FetchMetadata", "http://example.com/metadata.json").Return(offchainReturn, nil)
			}

			initialIconForEnrich := tt.initialIconUrl
			if initialIconForEnrich == "" && tt.inputIconUrl != "" && tt.mockJupiterLogoURI == "" {
				// If we want to test offchain metadata as the primary source of inputIconUrl for standardization,
				// and there's no Jupiter/Initial override, then initialIconURL for EnrichCoinData should be empty.
				// The tt.inputIconUrl will be injected via offchainReturn["image"].
			}

			coin, err := service.EnrichCoinData(context.Background(), mintAddress, "Test Coin", initialIconForEnrich, 0)

			assert.NoError(t, err)
			assert.NotNil(t, coin)
			assert.Equal(t, tt.expectedResolvedIconUrl, coin.ResolvedIconUrl)

			mockJup.AssertExpectations(t)
			mockSol.AssertExpectations(t)
			mockOff.AssertExpectations(t)
		})
	}
}

// stripHttp removes http:// or https:// prefix
func stripHttp(url string) string {
	if url == "" {
		return ""
	}
	if strings.HasPrefix(url, "http://") {
		return strings.TrimPrefix(url, "http://")
	}
	if strings.HasPrefix(url, "https://") {
		return strings.TrimPrefix(url, "https://")
	}
	return url
}
