package coin

import (
	"context"
	"errors"
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

func (m *MockJupiterClient) GetNewCoins(ctx context.Context, params *jupiter.NewCoinsParams) ([]*jupiter.NewTokenInfo, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	// Ensure the type assertion matches the new return type
	return args.Get(0).([]*jupiter.NewTokenInfo), args.Error(1)
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

func newTestService(cfg *Config, jupiterClient jupiter.ClientAPI, solanaClient *MockSolanaClient, offchainClient *MockOffchainClient) *Service {
	// Create a service with the provided mock clients
	service := &Service{
		config:         cfg,
		jupiterClient:  jupiterClient,
		chainClient:    solanaClient, // Corrected: use chainClient interface, assign MockSolanaClient
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

	cfg := &Config{}
	service := newTestService(cfg, mockJupiter, mockSolana, mockOffchain)

	mintAddress := "testmint1"
	httpIconURL := "http://example.com/icon.png"
	initialNameFromBirdeye := "Birdeye Name"
	initialSymbolFromBirdeye := "BIRD"
	initialPriceFromBirdeye := 1.5
	initialVolumeFromBirdeye := 1500.0
	initialMarketCapFromBirdeye := 150000.0
	initialTagsFromBirdeye := []string{"birdeye-tag"}

	// Jupiter GetCoinInfo: Called if initial name, symbol, or decimals are missing/empty.
	// For this test, assume Birdeye provides name and symbol, but decimals might be missing.
	// If EnrichCoinData initializes coin.Decimals to 0, this will be called.
	mockJupiter.On("GetCoinInfo", mock.Anything, mintAddress).Return(&jupiter.CoinListInfo{Name: "Jupiter Name", Symbol: "JUP", Decimals: 6, LogoURI: "http://jupiter.com/logo.png"}, nil).Maybe()
	// Jupiter GetCoinPrices: Called if initialPrice is 0. Here it's 1.5, so this might not be called.
	mockJupiter.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: 1.0}, nil).Maybe()

	mockSolana.On("GetMetadataAccount", mock.Anything, mintAddress).Return(&token_metadata.Metadata{Data: token_metadata.Data{Uri: "http://example.com/metadata.json"}}, nil)
	mockOffchain.On("FetchMetadata", "http://example.com/metadata.json").Return(map[string]any{"image": httpIconURL, "description": "Test Description"}, nil)

	coin, err := service.EnrichCoinData(
		context.Background(),
		mintAddress,
		initialNameFromBirdeye,
		initialSymbolFromBirdeye,
		"", // initialIconURL is empty, offchain will provide "image"
		initialPriceFromBirdeye,
		initialVolumeFromBirdeye,
		initialMarketCapFromBirdeye,
		initialTagsFromBirdeye,
	)

	assert.NoError(t, err)
	assert.NotNil(t, coin)
	assert.Equal(t, httpIconURL, coin.IconUrl) // Icon comes from offchain metadata
	assert.Equal(t, httpIconURL, coin.ResolvedIconUrl)
	assert.Equal(t, initialNameFromBirdeye, coin.Name) // Name from Birdeye
	assert.Equal(t, initialSymbolFromBirdeye, coin.Symbol) // Symbol from Birdeye
	assert.Equal(t, initialPriceFromBirdeye, coin.Price) // Price from Birdeye
	assert.Equal(t, initialVolumeFromBirdeye, coin.Volume24h)
	assert.Equal(t, initialMarketCapFromBirdeye, coin.MarketCap)
	assert.Equal(t, initialTagsFromBirdeye, coin.Tags)
	// Decimals will be from Jupiter if GetCoinInfo was called and provided them, otherwise from Solana metadata if mocked, else 0.
	// If GetCoinInfo provided 6, then it should be 6.
	if strings.Contains(tt.name, "Jupiter Name") { // A bit of a hack to check if GetCoinInfo was expected for name/symbol
		assert.Equal(t, 6, coin.Decimals)
	}


	mockJupiter.AssertExpectations(t)
	mockSolana.AssertExpectations(t)
	mockOffchain.AssertExpectations(t)
}

func TestEnrichCoinData_StandardizeURL(t *testing.T) {
	tests := []struct {
		name                    string
		inputIconUrl            string // Represents icon from offchain metadata if initialIconUrl & Jupiter logo are empty
		expectedResolvedIconUrl string
		mockOffchainError       error
		mockJupiterLogoURI      string // Jupiter's icon (takes precedence over initialIconUrl & offchain)
		initialIconUrl          string // Icon passed to EnrichCoinData (takes precedence over offchain)
	}{
		{name: "Non-IPFS URL from initialIconUrl", initialIconUrl: "https://example.com/image.png", expectedResolvedIconUrl: "https://example.com/image.png"},
		{name: "IPFS CIDv0 from initialIconUrl", initialIconUrl: "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X", expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X"},
		{name: "Jupiter provides non-IPFS, initial is IPFS", initialIconUrl: "ipfs://Qm...", mockJupiterLogoURI: "https://jup.com/logo.png", expectedResolvedIconUrl: "https://jup.com/logo.png"},
		{name: "Jupiter provides IPFS, initial is non-IPFS", initialIconUrl: "https://init.com/logo.png", mockJupiterLogoURI: "ipfs://QmJ...", expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmJ..."},
		{name: "Offchain provides icon, initial & Jupiter empty", inputIconUrl: "https://offchain.com/icon.png", expectedResolvedIconUrl: "https://offchain.com/icon.png"},
		{name: "Offchain provides IPFS, initial & Jupiter empty", inputIconUrl: "ipfs://QmOff...", expectedResolvedIconUrl: "https://gateway.pinata.cloud/ipfs/QmOff..."},
		{name: "Empty initialIconUrl, no Jupiter/Offchain icon", initialIconUrl: "", expectedResolvedIconUrl: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockJup := new(MockJupiterClient)
			mockSol := new(MockSolanaClient)
			mockOff := new(MockOffchainClient)

			cfg := &Config{}
			service := newTestService(cfg, mockJup, mockSol, mockOff)
			mintAddress := "testmint_" + strings.ReplaceAll(tt.name, " ", "_")

			jupiterTokenInfo := &jupiter.CoinListInfo{Name: "Test Coin", Symbol: "TST", Decimals: 6}
			if tt.mockJupiterLogoURI != "" {
				jupiterTokenInfo.LogoURI = tt.mockJupiterLogoURI
			}
			mockJup.On("GetCoinInfo", mock.Anything, mintAddress).Return(jupiterTokenInfo, nil).Maybe() // Called if initial Symbol/Name/Decimals are insufficient

			offchainReturn := map[string]any{"description": "Test Desc"}
			if tt.inputIconUrl != "" { // tt.inputIconUrl represents the icon from offchain metadata's "image" field
				offchainReturn["image"] = tt.inputIconUrl
			}
			mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(&token_metadata.Metadata{Data: token_metadata.Data{Uri: "http://example.com/metadata.json"}}, nil)
			if tt.mockOffchainError != nil {
				mockOff.On("FetchMetadata", "http://example.com/metadata.json").Return(nil, tt.mockOffchainError)
			} else {
				mockOff.On("FetchMetadata", "http://example.com/metadata.json").Return(offchainReturn, nil)
			}

			const defaultName = "Test Coin"
			const defaultSymbol = "TST"
			const defaultPrice = 1.0
			const defaultVolume = 1000.0
			const defaultMarketCap = 100000.0
			var defaultTags = []string{"test-tag"}

			mockJup.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(map[string]float64{mintAddress: defaultPrice}, nil).Maybe() // Called if initialPrice is 0

			coin, err := service.EnrichCoinData(
				context.Background(),
				mintAddress,
				defaultName,
				defaultSymbol,
				tt.initialIconUrl, // This is the icon URL being tested for standardization logic
				defaultPrice,
				defaultVolume,
				defaultMarketCap,
				defaultTags,
			)

			if tt.mockOffchainError != nil {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, coin)
				assert.Equal(t, tt.expectedResolvedIconUrl, coin.ResolvedIconUrl, "Mismatch in ResolvedIconUrl")

				expectedIconUrl := ""
				if tt.mockJupiterLogoURI != "" { // Jupiter takes first precedence
					expectedIconUrl = tt.mockJupiterLogoURI
				} else if tt.initialIconUrl != "" { // Then initialIconUrl passed to EnrichCoinData
					expectedIconUrl = tt.initialIconUrl
				} else if tt.inputIconUrl != "" { // Then offchain metadata's "image"
					expectedIconUrl = tt.inputIconUrl
				}
				assert.Equal(t, expectedIconUrl, coin.IconUrl, "Mismatch in IconUrl based on precedence")
			}

			mockJup.AssertExpectations(t)
			mockSol.AssertExpectations(t)
			mockOff.AssertExpectations(t)
		})
	}
}

func TestEnrichCoinData_WithBirdeyeData(t *testing.T) {
	mintAddress := "testMintForBirdeye"
	defaultSolanaMetadataURI := "http://example.com/solanametadata.json"
	defaultOffchainMetadata := map[string]any{"description": "Offchain description"} // Standard offchain response

	tests := []struct {
		name                 string
		initialName          string
		initialSymbol        string
		initialIconURL       string
		initialPrice         float64
		initialVolume        float64
		initialMarketCap     float64
		initialTags          []string
		// initialDecimals is not a direct parameter to EnrichCoinData.
		// Its effect is tested by whether GetCoinInfo is called when name/symbol are present but decimals might be 0.
		mockJupiterGetCoinInfoCalled bool
		jupiterCoinInfo              *jupiter.CoinListInfo // Data Jupiter GetCoinInfo returns
		jupiterGetCoinInfoErr        error
		mockJupiterGetPricesCalled   bool
		jupiterPrices                map[string]float64 // Data Jupiter GetCoinPrices returns
		jupiterGetPricesErr          error
		// Mocking for Solana/Offchain (can be common for many tests unless specific failure is tested)
		solanaMetadataErr    error
		offchainMetadata     map[string]any
		offchainMetadataErr  error
		expectedCoinName     string
		expectedCoinSymbol   string
		expectedCoinDecimals int
		expectedCoinIconUrl  string
		expectedCoinPrice    float64
		expectedCoinVolume   float64
		expectedCoinMarketCap float64
		expectedCoinTags     []string
		expectedDescription  string
		expectError          bool
	}{
		{
			name:                 "All data from Birdeye (initial params), Decimals known",
			initialName:          "Birdeye Coin", initialSymbol: "BIRD", initialIconURL: "http://birdeye.com/logo.png",
			initialPrice: 2.5, initialVolume: 20000.0, initialMarketCap: 2000000.0, initialTags: []string{"birdeye-tag"},
			mockJupiterGetCoinInfoCalled: false, // Not called if name, symbol are present and we assume decimals are also "known" (e.g. pre-filled in coin object if >0)
			mockJupiterGetPricesCalled:   false, // Not called because price is provided
			offchainMetadata:             map[string]any{"description": "Birdeye Full Desc"},
			expectedCoinName: "Birdeye Coin", expectedCoinSymbol: "BIRD", expectedCoinDecimals: 0, // Decimals 0 if GetCoinInfo not called & Solana meta doesn't provide
			expectedCoinIconUrl: "http://birdeye.com/logo.png", expectedCoinPrice: 2.5, expectedCoinVolume: 20000.0,
			expectedCoinMarketCap: 2000000.0, expectedCoinTags: []string{"birdeye-tag"}, expectedDescription: "Birdeye Full Desc",
		},
		{
			name:                 "Partial Birdeye - missing price, needs Jupiter price",
			initialName:          "Partial Price", initialSymbol: "PPR", initialIconURL: "http://partial.png",
			initialPrice: 0, initialVolume: 15000.0, initialMarketCap: 1500000.0, initialTags: []string{},
			mockJupiterGetCoinInfoCalled: false, // Name, symbol provided
			mockJupiterGetPricesCalled:   true,  // Called because initialPrice is 0
			jupiterPrices:                map[string]float64{mintAddress: 3.0},
			offchainMetadata:             defaultOffchainMetadata,
			expectedCoinName: "Partial Price", expectedCoinSymbol: "PPR", expectedCoinDecimals: 0,
			expectedCoinIconUrl: "http://partial.png", expectedCoinPrice: 3.0, expectedCoinVolume: 15000.0,
			expectedCoinMarketCap: 1500000.0, expectedCoinTags: []string{}, expectedDescription: "Offchain description",
		},
		{
			name:                 "Partial Birdeye - missing symbol, needs Jupiter GetCoinInfo for Symbol & Decimals",
			initialName:          "Partial Symbol", initialSymbol: "", initialIconURL: "http://partialsymbol.png",
			initialPrice: 5.0, initialVolume: 5000.0, initialMarketCap: 500000.0, initialTags: []string{"tag2"},
			mockJupiterGetCoinInfoCalled: true, // Called because symbol missing
			jupiterCoinInfo:              &jupiter.CoinListInfo{Name: "Jupiter Name", Symbol: "JUP", Decimals: 9}, // Jupiter provides symbol & decimals
			mockJupiterGetPricesCalled:   false, // Price provided
			offchainMetadata:             defaultOffchainMetadata,
			expectedCoinName: "Partial Symbol", expectedCoinSymbol: "JUP", expectedCoinDecimals: 9, // Symbol & Decimals from Jupiter
			expectedCoinIconUrl: "http://partialsymbol.png", expectedCoinPrice: 5.0, expectedCoinVolume: 5000.0,
			expectedCoinMarketCap: 500000.0, expectedCoinTags: []string{"tag2"}, expectedDescription: "Offchain description",
		},
		{
			name:                 "Jupiter GetCoinInfo provides better Icon and Tags",
			initialName:          "Birdeye Main", initialSymbol: "BMAIN", initialIconURL: "", initialPrice: 2.5,
			initialVolume: 20000.0, initialMarketCap: 2000000.0, initialTags: []string{},
			mockJupiterGetCoinInfoCalled: true, // Called because initial Icon/Tags are empty, and potentially for decimals
			jupiterCoinInfo:              &jupiter.CoinListInfo{Name: "Jupiter Name", Symbol: "JUPITER", Decimals: 6, LogoURI: "http://jupiter.com/logo.png", Tags: []string{"jupiter-tag"}},
			mockJupiterGetPricesCalled:   false,
			offchainMetadata:             defaultOffchainMetadata,
			expectedCoinName: "Birdeye Main", expectedCoinSymbol: "BMAIN", expectedCoinDecimals: 6, // Name/Symbol from Birdeye preferred
			expectedCoinIconUrl: "http://jupiter.com/logo.png", expectedCoinPrice: 2.5, expectedCoinVolume: 20000.0, // Icon from Jupiter
			expectedCoinMarketCap: 2000000.0, expectedCoinTags: []string{"jupiter-tag"}, expectedDescription: "Offchain description", // Tags from Jupiter
		},
		{
			name: "No Birdeye data, all from Jupiter and chain",
			initialName: "", initialSymbol: "", initialIconURL: "", initialPrice: 0, initialVolume: 0, initialMarketCap: 0, initialTags: []string{},
			mockJupiterGetCoinInfoCalled: true,
			jupiterCoinInfo:              &jupiter.CoinListInfo{Name: "Full Jupiter", Symbol: "FJUP", Decimals: 8, LogoURI: "http://jupiter.com/full.png", DailyVolume: 300.0, Tags: []string{"fjup-tag"}},
			mockJupiterGetPricesCalled:   true,
			jupiterPrices:                map[string]float64{mintAddress: 10.0},
			offchainMetadata:             defaultOffchainMetadata,
			expectedCoinName: "Full Jupiter", expectedCoinSymbol: "FJUP", expectedCoinDecimals: 8,
			expectedCoinIconUrl: "http://jupiter.com/full.png", expectedCoinPrice: 10.0, expectedCoinVolume: 300.0,
			expectedCoinMarketCap: 0, expectedCoinTags: []string{"fjup-tag"}, expectedDescription: "Offchain description", // MarketCap not from Jupiter GetCoinInfo
		},
		{
			name: "Error from Jupiter GetCoinInfo, fallback to minimal",
			initialName: "", initialSymbol: "", initialIconURL: "icon.png", initialPrice: 1, initialVolume: 100, initialMarketCap: 1000, initialTags: []string{},
			mockJupiterGetCoinInfoCalled: true,
			jupiterGetCoinInfoErr:        errors.New("jupiter GetCoinInfo failed"),
			mockJupiterGetPricesCalled:   false, // Price is provided
			offchainMetadata:             defaultOffchainMetadata,
			expectedCoinName: "", expectedCoinSymbol: "", expectedCoinDecimals: 0, // Fallback due to error
			expectedCoinIconUrl: "icon.png", expectedCoinPrice: 1, expectedCoinVolume: 100,
			expectedCoinMarketCap: 1000, expectedCoinTags: []string{}, expectedDescription: "Offchain description",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockJup := new(MockJupiterClient)
			mockSol := new(MockSolanaClient)
			mockOff := new(MockOffchainClient)

			cfg := &Config{}
			service := newTestService(cfg, mockJup, mockSol, mockOff)

			if tt.mockJupiterGetCoinInfoCalled {
				mockJup.On("GetCoinInfo", mock.Anything, mintAddress).Return(tt.jupiterCoinInfo, tt.jupiterGetCoinInfoErr).Once()
			}
			if tt.mockJupiterGetPricesCalled {
				mockJup.On("GetCoinPrices", mock.Anything, []string{mintAddress}).Return(tt.jupiterPrices, tt.jupiterGetPricesErr).Once()
			}

			// Mock Solana and Offchain unless specific error is tested for them
			if tt.solanaMetadataErr != nil {
				mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(nil, tt.solanaMetadataErr)
			} else {
				uri := defaultSolanaMetadataURI
				if tt.offchainMetadataErr != nil && tt.offchainMetadata == nil { // if offchain is meant to fail and no specific URI from solana, metadata might be nil
					uri = "" // Or some indicator that FetchMetadata shouldn't be called / will fail
				}
				mockSol.On("GetMetadataAccount", mock.Anything, mintAddress).Return(&token_metadata.Metadata{Data: token_metadata.Data{Uri: uri}}, nil)

				effectiveOffchainMeta := defaultOffchainMetadata
				if tt.offchainMetadata != nil {
					effectiveOffchainMeta = tt.offchainMetadata
				}
				mockOff.On("FetchMetadata", uri).Return(effectiveOffchainMeta, tt.offchainMetadataErr).Maybe() // Maybe if solana URI is empty

			}


			coin, err := service.EnrichCoinData(
				context.Background(),
				mintAddress,
				tt.initialName, tt.initialSymbol, tt.initialIconURL,
				tt.initialPrice, tt.initialVolume, tt.initialMarketCap, tt.initialTags,
			)

			if tt.expectError { // This field is not used in current table, error is inferred from Jupiter/Solana/Offchain errors
				assert.Error(t, err)
			} else if tt.jupiterGetCoinInfoErr != nil && (tt.initialName == "" || tt.initialSymbol == "" ) && tt.jupiterCoinInfo == nil && tt.solanaMetadataErr == nil && tt.offchainMetadataErr != nil {
				// If Jupiter fails AND offchain fails, and data was missing, then error.
				assert.Error(t, err)
			} else if tt.solanaMetadataErr != nil && tt.jupiterCoinInfo == nil && tt.jupiterPrices == nil {
                 // If solana meta fails AND we had no prior jupiter data, it's an error.
                 assert.Error(t, err)
            } else if tt.offchainMetadataErr != nil && tt.jupiterCoinInfo == nil && tt.jupiterPrices == nil && tt.solanaMetadataErr == nil {
				// If offchain fails and we had no prior Jupiter data, it's an error.
				assert.Error(t, err)
			}else {
				assert.NoError(t, err)
				assert.NotNil(t, coin)
				assert.Equal(t, tt.expectedCoinName, coin.Name)
				assert.Equal(t, tt.expectedCoinSymbol, coin.Symbol)
				assert.Equal(t, tt.expectedCoinDecimals, coin.Decimals)
				assert.Equal(t, tt.expectedCoinIconUrl, coin.IconUrl)
				assert.Equal(t, tt.expectedCoinIconUrl, coin.ResolvedIconUrl) // Assuming Resolved is same as IconUrl if not IPFS
				assert.InDelta(t, tt.expectedCoinPrice, coin.Price, 0.0001)
				assert.InDelta(t, tt.expectedCoinVolume, coin.Volume24h, 0.0001)
				assert.InDelta(t, tt.expectedCoinMarketCap, coin.MarketCap, 0.0001)
				assert.ElementsMatch(t, tt.expectedCoinTags, coin.Tags)
				assert.Equal(t, tt.expectedDescription, coin.Description)
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
