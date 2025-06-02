package coin

import (
	"context"
	"fmt" // Added for fmt.Errorf
	"log/slog"
	"os"
	"strings"
	"testing"

	"github.com/blocto/solana-go-sdk/program/metaplex/token_metadata"
	solanago "github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockJupiterClient is a mock for the Jupiter client
type MockJupiterClient struct {
	mock.Mock
}

func (m *MockJupiterClient) GetCoinInfo(ctx context.Context, mintAddress string) (*jupiter.CoinListInfo, error) {
	args := m.Called(ctx, mintAddress)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.CoinListInfo), args.Error(1)
}

func (m *MockJupiterClient) GetCoinPrices(ctx context.Context, mintAddresses []string) (map[string]float64, error) {
	args := m.Called(ctx, mintAddresses)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]float64), args.Error(1)
}

func (m *MockJupiterClient) GetQuote(ctx context.Context, params jupiter.QuoteParams) (*jupiter.QuoteResponse, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.QuoteResponse), args.Error(1)
}

func (m *MockJupiterClient) GetAllCoins(ctx context.Context) (*jupiter.CoinListResponse, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.CoinListResponse), args.Error(1)
}

func (m *MockJupiterClient) GetNewCoins(ctx context.Context, params *jupiter.NewCoinsParams) (*jupiter.CoinListResponse, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jupiter.CoinListResponse), args.Error(1)
}

func (m *MockJupiterClient) CreateSwapTransaction(ctx context.Context, quoteResp []byte, userPublicKey solanago.PublicKey, destinationTokenAccount string) (string, error) {
	args := m.Called(ctx, quoteResp, userPublicKey, destinationTokenAccount)
	if args.Get(0) == nil {
		return "", args.Error(1)
	}
	return args.Get(0).(string), args.Error(1)
}

// MockSolanaClient is a mock for the Solana client
type MockSolanaClient struct {
	mock.Mock
}

func (m *MockSolanaClient) GetMetadataAccount(ctx context.Context, mintAddress string) (*token_metadata.Metadata, error) {
	args := m.Called(ctx, mintAddress)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*token_metadata.Metadata), args.Error(1)
}

func (m *MockSolanaClient) GetRpcConnection() *rpc.Client {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*rpc.Client)
}

func (m *MockSolanaClient) ExecuteTrade(ctx context.Context, trade *model.Trade, signedTx string) (string, error) {
	args := m.Called(ctx, trade, signedTx)
	return args.String(0), args.Error(1)
}

func (m *MockSolanaClient) ExecuteSignedTransaction(ctx context.Context, signedTx string) (solanago.Signature, error) {
	args := m.Called(ctx, signedTx)
	return args.Get(0).(solanago.Signature), args.Error(1)
}

func (m *MockSolanaClient) GetTransactionConfirmationStatus(ctx context.Context, sigStr string) (*rpc.GetSignatureStatusesResult, error) {
	args := m.Called(ctx, sigStr)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*rpc.GetSignatureStatusesResult), args.Error(1)
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

func (m *MockOffchainClient) FetchRawData(ctx context.Context, uri string) (data []byte, contentType string, err error) {
	args := m.Called(ctx, uri)
	if args.Get(0) == nil {
		return nil, args.String(1), args.Error(2)
	}
	return args.Get(0).([]byte), args.String(1), args.Error(2)
}

func (m *MockOffchainClient) VerifyDirectImageAccess(ctx context.Context, url string) (bool, string, error) {
	ret := m.Called(ctx, url)

	var r0 bool
	var r1 string
	var r2 error

	if rf, ok := ret.Get(0).(func(context.Context, string) (bool, string, error)); ok {
		return rf(ctx, url)
	}

	if rf, ok := ret.Get(0).(func(context.Context, string) bool); ok {
		r0 = rf(ctx, url)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(bool)
		} else {
			// Handle case where nothing is returned for r0, assign default (false)
			// Or let it panic if that's desired for strict tests where return isn't optional
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, string) string); ok {
		r1 = rf(ctx, url)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(string)
		} else {
			// Handle case where nothing is returned for r1, assign default ("")
		}
	}

	if rf, ok := ret.Get(2).(func(context.Context, string) error); ok {
		r2 = rf(ctx, url)
	} else {
		r2 = ret.Error(2) // Error(n) returns nil if not set, or the error
	}

	return r0, r1, r2
}

func newTestService(cfg *Config, jupiterClient jupiter.ClientAPI, solanaClient *MockSolanaClient, offchainClient *MockOffchainClient) *Service {
	// Create a service with the provided mock clients
	service := &Service{
		config:         cfg,
		jupiterClient:  jupiterClient,
		solanaClient:   solanaClient,
		offchainClient: offchainClient,
		store:          nil, // No store needed for these tests
	}
	return service
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

	mockJupiter.On("GetCoinInfo", mock.Anything, mintAddress).Return(&jupiter.CoinListInfo{Name: "Test Coin", Symbol: "TST"}, nil)
	mockJupiter.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil)
	mockSolana.On("GetMetadataAccount", mock.Anything, mintAddress).Return(&token_metadata.Metadata{Data: token_metadata.Data{Uri: "http://example.com/metadata.json"}}, nil)
	mockOffchain.On("FetchMetadata", "http://example.com/metadata.json").Return(map[string]any{"image": httpIconURL}, nil)
	// Expect VerifyDirectImageAccess to be called and return success for this non-IPFS URL
	mockOffchain.On("VerifyDirectImageAccess", mock.Anything, httpIconURL).Return(true, httpIconURL, nil).Once()


	coin, err := service.EnrichCoinData(context.Background(), mintAddress, "", "", 0)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, httpIconURL, coin.IconUrl)
	assert.Equal(t, httpIconURL, coin.ResolvedIconUrl, "ResolvedIconUrl should equal IconUrl for non-IPFS URIs")

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
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Scenario 3: IPFS Gateway URL with CIDv1
		{
			name:                    "IPFS Gateway URL with CIDv1",
			inputIconUrl:            "https://othergateway.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", // Updated to new CIDv1 gateway logic
		},
		// Scenario 4: IPFS Gateway URL with CIDv0 and Sub-path
		{
			name:                    "IPFS Gateway URL with CIDv0 and Sub-path",
			inputIconUrl:            "https://othergateway.com/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png", // Uses hardcoded default
		},
		// Scenario 5: IPFS Gateway URL with CIDv1 and Sub-path
		{
			name:                    "IPFS Gateway URL with CIDv1 and Sub-path",
			inputIconUrl:            "https://othergateway.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png", // Updated to new CIDv1 gateway logic
		},
		// Scenario 6: Raw ipfs://CIDv0 URI
		{
			name:                    "Raw ipfs://CIDv0 URI",
			inputIconUrl:            "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Scenario 7: Raw ipfs://CIDv1 URI
		{
			name:                    "Raw ipfs://CIDv1 URI",
			inputIconUrl:            "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", // Updated to new CIDv1 gateway logic
		},
		// Scenario 8: Raw ipfs://CIDv0 URI with Sub-path
		{
			name:                    "Raw ipfs://CIDv0 URI with Sub-path",
			inputIconUrl:            "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/images/logo.png", // Uses hardcoded default
		},
		// Scenario 9: Raw ipfs://CIDv1 URI with Sub-path
		{
			name:                    "Raw ipfs://CIDv1 URI with Sub-path",
			inputIconUrl:            "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png",
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/images/logo.png", // Updated to new CIDv1 gateway logic
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
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
		},
		// Test initialIconUrl passed to EnrichCoinData
		{
			name:                    "InitialIconUrl is IPFS CIDv0",
			initialIconUrl:          "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",               // Passed to EnrichCoinData
			inputIconUrl:            "",                                                                    // No metadata or jupiter icon
			expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", // Uses hardcoded default
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

			// Setup general mocks for VerifyDirectImageAccess for TestEnrichCoinData_StandardizeURL
			// If called with a non-empty string (and not "ipfs://" which becomes empty), mock a successful validation.
			mockOff.On("VerifyDirectImageAccess", mock.Anything, mock.MatchedBy(func(url string) bool { return url != "" && url != "ipfs://" })).
				Return(func(ctx context.Context, url string) (bool, string, error) { // Single function for RunAndReturn style
					return true, url, nil
				}).Maybe()
			// Fallback for empty string call (though EnrichCoinData should prevent this if standardize returns empty)
			mockOff.On("VerifyDirectImageAccess", mock.Anything, "").
				Return(false, "request_creation_failed", fmt.Errorf("empty url for validation")).
				Maybe()

			// Jupiter GetCoinInfo (used for IconUrl if LogoURI is present)
			jupiterTokenInfo := &jupiter.CoinListInfo{Name: "Test Coin", Symbol: "TST"}
			if tt.mockJupiterLogoURI != "" {
				jupiterTokenInfo.LogoURI = tt.mockJupiterLogoURI
			}
			mockJup.On("GetCoinInfo", mock.Anything, mintAddress).Return(jupiterTokenInfo, nil)
			mockJup.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil)

			// Solana GetMetadataAccount (always needed to proceed to offchain)
			mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(
				&token_metadata.Metadata{Data: token_metadata.Data{Uri: "http://example.com/metadata.json"}}, nil,
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
	// If tt.expectedResolvedIconUrl is not empty, VerifyDirectImageAccess should have been called with it
	// and returned it, making it the coin.ResolvedIconUrl.
	// If tt.expectedResolvedIconUrl is empty, coin.ResolvedIconUrl should also be empty (and VerifyDirectImageAccess not called or called with empty).
			assert.Equal(t, tt.expectedResolvedIconUrl, coin.ResolvedIconUrl)
	if tt.expectedResolvedIconUrl == "" {
		// If standardization was expected to fail (empty ResolvedIconUrl),
		// the main EnrichCoinData logic should also clear the original IconUrl.
		assert.Equal(t, "", coin.IconUrl, "Original IconUrl should be cleared if standardization results in empty or icon is discarded.")
	}

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

func TestEnrichCoinData_IconValidation(t *testing.T) {
	// Shared test data and mocks
	mintAddress := "testmint_icon_validation"
	defaultMetadataURI := "http://example.com/metadata.json"
	defaultJupiterInfo := &jupiter.CoinListInfo{Name: "Test Coin", Symbol: "TST", LogoURI: ""} // No Jupiter icon by default
	defaultJupiterPrices := map[string]float64{mintAddress: 1.0}
	defaultSolanaMetadata := &token_metadata.Metadata{Data: token_metadata.Data{Uri: defaultMetadataURI}}

	// Test cases
	tests := []struct {
		name                       string
		initialIconUrl             string
		standardizedUrl            string // Expected input to VerifyDirectImageAccess
		mockVerifyIsValid          bool
		mockVerifyReasonOrURL      string
		mockVerifyError            error
		expectedFinalIconUrl       string // Expected coin.IconUrl
		expectedFinalResolvedIconUrl string // Expected coin.ResolvedIconUrl
		isIPFSScenario             bool   // Helper to know if we should expect IPFS fallback logic
	}{
		{
			name:                       "Valid non-IPFS HTTP Icon",
			initialIconUrl:             "https://example.com/image.png",
			standardizedUrl:            "https://example.com/image.png",
			mockVerifyIsValid:          true,
			mockVerifyReasonOrURL:      "https://example.com/image.png",
			mockVerifyError:            nil,
			expectedFinalIconUrl:       "https://example.com/image.png",
			expectedFinalResolvedIconUrl: "https://example.com/image.png",
			isIPFSScenario:             false,
		},
		{
			name:                       "Invalid non-IPFS HTTP Icon - non_image_content_type",
			initialIconUrl:             "https://example.com/not_an_image.html",
			standardizedUrl:            "https://example.com/not_an_image.html",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "non_image_content_type",
			mockVerifyError:            fmt.Errorf("content type is text/html"),
			expectedFinalIconUrl:       "", // Discarded
			expectedFinalResolvedIconUrl: "", // Discarded
			isIPFSScenario:             false,
		},
		{
			name:                       "Valid IPFS Icon (standardized, VerifyDirectAccess returns true)",
			initialIconUrl:             "ipfs://QmValidCIDForImage",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmValidCIDForImage",
			mockVerifyIsValid:          true,
			mockVerifyReasonOrURL:      "https://gateway.pinata.cloud/ipfs/QmValidCIDForImage",
			mockVerifyError:            nil,
			expectedFinalIconUrl:       "ipfs://QmValidCIDForImage", // Original remains
			expectedFinalResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmValidCIDForImage",
			isIPFSScenario:             true,
		},
		{
			name:                       "IPFS Icon with Gateway Error (network_error) - Fallback",
			initialIconUrl:             "ipfs://QmGatewayErrorCID",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmGatewayErrorCID",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "network_error",
			mockVerifyError:            fmt.Errorf("simulated network error"),
			expectedFinalIconUrl:       "ipfs://QmGatewayErrorCID", // Original remains
			expectedFinalResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmGatewayErrorCID", // Fallback to standardized
			isIPFSScenario:             true,
		},
		{
			name:                       "IPFS Icon with Gateway Error (429 status) - Fallback",
			initialIconUrl:             "ipfs://QmRateLimitedCID",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmRateLimitedCID",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "non_200_status",
			mockVerifyError:            fmt.Errorf("failed with status 429"),
			expectedFinalIconUrl:       "ipfs://QmRateLimitedCID", // Original remains
			expectedFinalResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmRateLimitedCID", // Fallback to standardized
			isIPFSScenario:             true,
		},
		{
			name:                       "IPFS Icon with Redirect - Fallback",
			initialIconUrl:             "ipfs://QmRedirectCID",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmRedirectCID",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "redirect_attempted",
			mockVerifyError:            fmt.Errorf("redirected"),
			expectedFinalIconUrl:       "ipfs://QmRedirectCID", // Original remains
			expectedFinalResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmRedirectCID", // Fallback to standardized
			isIPFSScenario:             true,
		},
		{
			name:                       "IPFS Icon with Definitive Bad Content (non_image_content_type) - Discarded",
			initialIconUrl:             "ipfs://QmNotAnImageCID",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmNotAnImageCID",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "non_image_content_type",
			mockVerifyError:            fmt.Errorf("content type is application/json"),
			expectedFinalIconUrl:       "", // Discarded
			expectedFinalResolvedIconUrl: "", // Discarded
			isIPFSScenario:             true,
		},
		{
			name:                       "coin.IconUrl is initially empty",
			initialIconUrl:             "",
			standardizedUrl:            "", // Not called
			expectedFinalIconUrl:       "",
			expectedFinalResolvedIconUrl: "",
			isIPFSScenario:             false,
		},
		{
			name:                       "standardizeIpfsUrl results in an empty string",
			initialIconUrl:             "ipfs://", // Example that might cause standardize to return empty
			standardizedUrl:            "",        // Mocking that standardizeIpfsUrl returns empty
			// VerifyDirectImageAccess should not be called if standardizedUrl is empty
			expectedFinalIconUrl:       "", // Discarded
			expectedFinalResolvedIconUrl: "", // Discarded
			isIPFSScenario:             true, // It was initially IPFS
		},
		{
			name:                       "IPFS Icon with non-gateway/non-redirect error - Discarded",
			initialIconUrl:             "ipfs://QmOtherErrorCID",
			standardizedUrl:            "https://gateway.pinata.cloud/ipfs/QmOtherErrorCID",
			mockVerifyIsValid:          false,
			mockVerifyReasonOrURL:      "some_other_reason", // Not a gateway error or redirect
			mockVerifyError:            fmt.Errorf("some other specific error"),
			expectedFinalIconUrl:       "", // Discarded
			expectedFinalResolvedIconUrl: "", // Discarded
			isIPFSScenario:             true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockJup := new(MockJupiterClient)
			mockSol := new(MockSolanaClient)
			mockOff := new(MockOffchainClient)

			cfg := &Config{}
			service := newTestService(cfg, mockJup, mockSol, mockOff)

			// Setup general mocks for EnrichCoinData to run
			mockJup.On("GetCoinInfo", mock.Anything, mintAddress).Return(defaultJupiterInfo, nil)
			mockJup.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(defaultJupiterPrices, nil)
			mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(defaultSolanaMetadata, nil)
			// Offchain FetchMetadata returns the initialIconUrl (if not empty) to simulate it coming from metadata
			offchainMetaReturn := map[string]any{}
			if tt.initialIconUrl != "" {
				offchainMetaReturn["image"] = tt.initialIconUrl
			}
			mockOff.On("FetchMetadata", defaultMetadataURI).Return(offchainMetaReturn, nil)

			// Setup mock for VerifyDirectImageAccess based on test case
			if tt.initialIconUrl != "" && tt.standardizedUrl != "" { // Only expect call if there's a URL to validate
				mockOff.On("VerifyDirectImageAccess", mock.Anything, tt.standardizedUrl).Return(tt.mockVerifyIsValid, tt.mockVerifyReasonOrURL, tt.mockVerifyError).Once()
			} else if tt.initialIconUrl != "" && tt.name == "standardizeIpfsUrl results in an empty string" {
				// In this specific case, VerifyDirectImageAccess is not called.
				// We are testing the logic path where standardizeIpfsUrl returns empty.
			}


			coin, err := service.EnrichCoinData(context.Background(), mintAddress, "Test Coin", "", 0) // Pass "" for initialIconURL to EnrichCoinData, rely on offchainMeta

			assert.NoError(t, err)
			assert.NotNil(t, coin)

			assert.Equal(t, tt.expectedFinalIconUrl, coin.IconUrl, "Mismatch in final coin.IconUrl")
			assert.Equal(t, tt.expectedFinalResolvedIconUrl, coin.ResolvedIconUrl, "Mismatch in final coin.ResolvedIconUrl")

			mockJup.AssertExpectations(t)
			mockSol.AssertExpectations(t)
			mockOff.AssertExpectations(t) // This will also check VerifyDirectImageAccess calls
		})
	}
}
