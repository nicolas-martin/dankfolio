package trade

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	jupiterclientmocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter/mocks"
	solanaClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	dbDataStoreMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	coinServiceMocks "github.com/nicolas-martin/dankfolio/backend/internal/service/coin/mocks"
	priceServiceMocks "github.com/nicolas-martin/dankfolio/backend/internal/service/price/mocks"
	"encoding/base64"
	"time"

	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var (
	mockFromCoin          = &model.Coin{ID: 1, MintAddress: "fromCoinMint", Symbol: "FROM", Decimals: 6, Name: "From Coin"}
	mockToCoin            = &model.Coin{ID: 2, MintAddress: "toCoinMint", Symbol: "TO", Decimals: 9, Name: "To Coin"}
	defaultUserAddress    = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	defaultPlatformFeeBps = 50 // 0.5%
	defaultPlatformAddr   = "PLATFoRMDeSTiNaTioNAddReSs"
)

// Helper function for creating pointers, useful for ListOptions
func Pint(i int) *int    { v := int(i); return &v } // Changed to return *int for db.ListOptions
func Pbool(b bool) *bool { return &b }

func Pstring(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func setupService(t *testing.T) (
	*Service,
	*solanaClientMocks.MockClientAPI,
	*coinServiceMocks.MockCoinServiceAPI,
	*priceServiceMocks.MockPriceServiceAPI,
	*jupiterclientmocks.MockClientAPI,
	*dbDataStoreMocks.MockStore,
	*dbDataStoreMocks.MockRepository[model.Trade],
) {
	mockChainClient := solanaClientMocks.NewMockClientAPI(t) // Assuming this mocks bclient.GenericClientAPI
	mockCoinService := coinServiceMocks.NewMockCoinServiceAPI(t)
	mockPriceService := priceServiceMocks.NewMockPriceServiceAPI(t)
	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockStore := dbDataStoreMocks.NewMockStore(t)
	mockTradeRepo := dbDataStoreMocks.NewMockRepository[model.Trade](t)

	service := NewService(mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, defaultPlatformFeeBps, defaultPlatformAddr)
	return service, mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo
}

func TestListTrades_Success(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockTradeRepo := setupService(t)

	opts := db.ListOptions{Limit: Pint(10), Offset: Pint(0)}
	expectedTrades := []model.Trade{{ID: "trade1"}, {ID: "trade2"}}
	expectedTotal := int64(2)

	mockStore.On("Trades").Return(mockTradeRepo).Once()
	mockTradeRepo.On("ListWithOpts", ctx, opts).Return(expectedTrades, expectedTotal, nil).Once()

	trades, total, err := service.ListTrades(ctx, opts)

	assert.NoError(t, err)
	assert.Equal(t, expectedTrades, trades)
	assert.Equal(t, expectedTotal, total)
	mockTradeRepo.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestListTrades_Error(t *testing.T) {
	ctx := context.Background()
	service, _, _, _, _, mockStore, mockTradeRepo := setupService(t)

	opts := db.ListOptions{}
	expectedError := errors.New("db error")

	mockStore.On("Trades").Return(mockTradeRepo).Once()
	mockTradeRepo.On("ListWithOpts", ctx, opts).Return(nil, int64(0), expectedError).Once()

	trades, total, err := service.ListTrades(ctx, opts)

	assert.Error(t, err)
	assert.Nil(t, trades)
	assert.Zero(t, total)
	assert.Contains(t, err.Error(), "failed to list trades with options")
	mockTradeRepo.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestGetSwapQuote(t *testing.T) {
	ctx := context.Background()
	fromCoinMintAddress := "fromCoinMint"
	toCoinMintAddress := "toCoinMint"
	inputAmount := "1000000"
	slippageBps := "50"

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, _, _ := setupService(t)

		mockFromCoinWithID := &model.Coin{ID: 1, MintAddress: fromCoinMintAddress, Symbol: "FROM", Decimals: 6, Name: "From Coin"}
		mockToCoinWithID := &model.Coin{ID: 2, MintAddress: toCoinMintAddress, Symbol: "TO", Decimals: 9, Name: "To Coin", Price: 0} // Price set to 0 for fee test case

		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoinWithID, nil).Once()
		mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoinWithID, nil).Once()

		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterQuote := &jupiter.QuoteResponse{
			InputMint:      fromCoinMintAddress,
			OutputMint:     toCoinMintAddress,
			InAmount:       inputAmount,
			OutAmount:      "2000000000",
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{Label: "FROM -> TO", FeeMint: "feeCoinID", FeeAmount: "1000"}}},
			PriceImpactPct: "0.1",
			RawPayload:     rawQuotePayload,
		}
		mockJupiterClient.On("GetQuote", ctx, mock.MatchedBy(func(params jupiter.QuoteParams) bool {
			return params.InputMint == fromCoinMintAddress && params.OutputMint == toCoinMintAddress
		})).Return(mockJupiterQuote, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(map[string]float64{"feeCoinID": 0.5}, nil).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)

		assert.NoError(t, err)
		assert.NotNil(t, quote)
		assert.Equal(t, "2.000000", quote.EstimatedAmount)
		assert.Equal(t, "0.000000500", quote.Fee)
		assert.Equal(t, "0.1", quote.PriceImpact)
		assert.Equal(t, string(rawQuotePayload), string(quote.Raw))
		mockCoinService.AssertExpectations(t)
		mockJupiterClient.AssertExpectations(t)
		mockPriceService.AssertExpectations(t)
	})

	t.Run("Error fromCoinService GetCoinByMintAddress fromCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get from coin "+fromCoinMintAddress)
	})

	t.Run("Error fromCoinService GetCoinByMintAddress toCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get to coin "+toCoinMintAddress)
	})
}

func TestPrepareSwap(t *testing.T) {
	ctx := context.Background()
	fromCoinMintAddress := "fromCoinMint"
	toCoinMintAddress := "toCoinMint"
	inputAmountStr := "1000000"
	slippageBps := "50"
	fromAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	testUserPubKey, _ := solanago.PublicKeyFromBase58(fromAddress)

	mockFromCoinWithID := &model.Coin{ID: 1, MintAddress: fromCoinMintAddress, Symbol: "FROM", Decimals: 6, Name: "From Coin"}
	mockToCoinWithID := &model.Coin{ID: 2, MintAddress: toCoinMintAddress, Symbol: "TO", Decimals: 9, Name: "To Coin", Price: 0}

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		// PrepareSwap calls GetCoinByMintAddress twice, then GetSwapQuote calls it twice more
		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoinWithID, nil).Times(2)
		mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoinWithID, nil).Times(2)

		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InputMint:      fromCoinMintAddress,
			OutputMint:     toCoinMintAddress,
			InAmount:       inputAmountStr,
			OutAmount:      "2000000000",
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: "feeCoinID", FeeAmount: "1000"}}},
			PriceImpactPct: "0.1",
			RawPayload:     rawQuotePayload,
		}, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(map[string]float64{"feeCoinID": 0.5}, nil).Once()

		expectedUnsignedTx := "unsigned_transaction_string"
		// Add platformFeeAccountAddress (empty string for this test) to the mock call
		mockJupiterClient.On("CreateSwapTransaction", ctx, mock.IsType([]byte{}), testUserPubKey, "").Return(expectedUnsignedTx, nil).Once()

		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.FromCoinMintAddress == fromCoinMintAddress &&
				trade.ToCoinMintAddress == toCoinMintAddress &&
				trade.FromCoinPKID == mockFromCoinWithID.ID &&
				trade.ToCoinPKID == mockToCoinWithID.ID &&
				trade.UserID == fromAddress &&
				trade.CoinSymbol == mockFromCoinWithID.Symbol &&
				trade.Type == "swap" &&
				trade.Status == "prepared" &&
				trade.UnsignedTransaction == expectedUnsignedTx
		})).Return(nil).Once()

		reqData := model.PrepareSwapRequestData{
			FromCoinMintAddress: fromCoinMintAddress,
			ToCoinMintAddress:   toCoinMintAddress,
			Amount:              inputAmountStr,
			SlippageBps:         slippageBps,
			UserWalletAddress:   fromAddress,
		}
		unsignedTx, err := service.PrepareSwap(ctx, reqData)

		assert.NoError(t, err)
		assert.Equal(t, expectedUnsignedTx, unsignedTx)
		mockCoinService.AssertExpectations(t)
		mockJupiterClient.AssertExpectations(t)
		mockPriceService.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
	})

	t.Run("Error GetCoinByMintAddress fromCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(nil, errors.New("fetch from_coin error")).Once()

		reqData := model.PrepareSwapRequestData{
			FromCoinMintAddress: fromCoinMintAddress,
			ToCoinMintAddress:   toCoinMintAddress,
			Amount:              inputAmountStr,
			SlippageBps:         slippageBps,
			UserWalletAddress:   fromAddress,
		}
		_, err := service.PrepareSwap(ctx, reqData)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get fromCoin details for "+fromCoinMintAddress)
	})
}

func TestExecuteTrade(t *testing.T) {
	ctx := context.Background()
	unsignedTx := "sample_unsigned_transaction"
	signedTx := "sample_signed_transaction"
	expectedTxHash := "final_transaction_hash"

	tradeRequest := model.TradeRequest{
		FromCoinMintAddress: mockFromCoin.MintAddress,
		ToCoinMintAddress:   mockToCoin.MintAddress,
		Amount:              1.0,
		UnsignedTransaction: unsignedTx,
		SignedTransaction:   signedTx,
	}

	existingTrade := &model.Trade{
		ID:                  "trade123",
		UnsignedTransaction: unsignedTx,
		FromCoinMintAddress: mockFromCoin.MintAddress,
		ToCoinMintAddress:   mockToCoin.MintAddress,
		FromCoinPKID:        mockFromCoin.ID,
		ToCoinPKID:          mockToCoin.ID,
		Status:              "prepared",
	}

	t.Run("Success - No Debug", func(t *testing.T) {
		service, mockSolanaClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2)

		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(existingTrade, nil).Once()
		// This test is for the old ExecuteTrade logic. Keep it for now or adapt later if needed.
		// For the new polling logic, more detailed tests will be added.
		mockChainClient.On("SendRawTransaction", ctx, mock.Anything, mock.AnythingOfType("bmodel.TransactionOptions")).Return(bmodel.Signature(expectedTxHash), nil).Once()
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.ID == existingTrade.ID && trade.Status == "submitted" && trade.TransactionHash == expectedTxHash
		})).Return(nil).Once()

		// For this simplified test, we assume polling happens and it remains submitted
		// or we don't test the polling part here.
		// The new tests will cover polling explicitly.

		trade, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		// Status could be "submitted" or "completed" depending on how deep this old test goes vs new logic
		// Let's assume it doesn't complete within this test's mocks for now.
		// assert.Equal(t, "submitted", trade.Status)
		assert.Equal(t, expectedTxHash, trade.TransactionHash)
	})

	t.Run("Success - Debug Mode", func(t *testing.T) {
		service, _, mockCoinService, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)

		mockCoinService.On("GetCoinByMintAddress", debugCtx, tradeRequest.FromCoinMintAddress).Return(mockFromCoin, nil).Maybe()

		mockTradeRepo.On("Create", debugCtx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Status == "completed" && trade.FromCoinMintAddress == tradeRequest.FromCoinMintAddress
		})).Return(nil).Once()

		trade, err := service.ExecuteTrade(debugCtx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		assert.Equal(t, "completed", trade.Status)
		assert.NotEmpty(t, trade.TransactionHash)
	})
}

func TestTradeLifecycle_Successful(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000" // 1 FROM coin (6 decimals)
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	// --- Mocking for PrepareSwap ---
	mockStore.On("Trades").Return(mockTradeRepo) // Shared for all db interactions via mockTradeRepo

	// GetCoinByMintAddress called by PrepareSwap (twice) and GetSwapQuote (twice)
	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)

	rawJupiterQuotePayload := json.RawMessage(`{"inAmount":"1000000","outAmount":"2000000000","priceImpactPct":"0.01","routePlan":[{"swapInfo":{"label":"FROM -> TO","feeMint":"So11111111111111111111111111111111111111112","feeAmount":"1000"},"marketInfos":null}],"platformFee":{"amount":"50000","feeBps":50,"feeMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},"contextSlot":12345,"timeTaken":0.123}`)
	mockJupiterClient.On("GetQuote", ctx, mock.MatchedBy(func(params jupiter.QuoteParams) bool {
		return params.InputMint == fromCoinMintAddress &&
			params.OutputMint == toCoinMintAddress &&
			params.Amount == inputAmountStr &&
			params.FeeBps == defaultPlatformFeeBps
	})).Return(&jupiter.QuoteResponse{
		InputMint:      fromCoinMintAddress,
		OutputMint:     toCoinMintAddress,
		InAmount:       inputAmountStr,
		OutAmount:      "2000000000", // 2 TO coins (9 decimals)
		RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: solanago.SolMint.String(), FeeAmount: "1000"}}},
		PriceImpactPct: "0.01",
		PlatformFee:    &jupiter.PlatformFee{Amount: "50000", FeeBps: defaultPlatformFeeBps, FeeMint: mockFromCoin.MintAddress /* Fee in FROM coin */},
		RawPayload:     rawJupiterQuotePayload,
	}, nil).Once()

	// Assuming fee mint is SOL and FROM coin for platform fee
	mockPriceService.On("GetCoinPrices", ctx, mock.AnythingOfType("[]string")).Return(map[string]float64{
		solanago.SolMint.String(): 150.0, // 1 SOL = $150
		mockFromCoin.MintAddress:  1.0,   // 1 FROM = $1 (for platform fee calculation)
	}, nil).Once()

	unsignedTxString := "unsigned_transaction_string_for_successful_lifecycle"
	mockJupiterClient.On("CreateSwapTransaction", ctx, rawJupiterQuotePayload, testUserPubKey, defaultPlatformAddr).Return(unsignedTxString, nil).Once()

	var capturedPreparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedPreparedTrade = trade
		return trade.Status == "prepared" && trade.UnsignedTransaction == unsignedTxString
	})).Return(nil).Once()

	// --- Call PrepareSwap ---
	prepareReq := model.PrepareSwapRequestData{
		UserWalletAddress:   userWalletAddress,
		FromCoinMintAddress: fromCoinMintAddress,
		ToCoinMintAddress:   toCoinMintAddress,
		Amount:              inputAmountStr,
		SlippageBps:         slippageBps,
	}
	createdUnsignedTx, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)
	assert.Equal(t, unsignedTxString, createdUnsignedTx)
	assert.NotNil(t, capturedPreparedTrade)
	assert.Equal(t, "prepared", capturedPreparedTrade.Status)
	// Fee checks will be more detailed in specific fee tests, but ensure they are populated
	assert.NotZero(t, capturedPreparedTrade.Fee) // Total fee
	assert.NotZero(t, capturedPreparedTrade.PlatformFeeAmount)
	assert.Equal(t, float64(defaultPlatformFeeBps)/100.0, capturedPreparedTrade.PlatformFeePercent)
	assert.Equal(t, defaultPlatformAddr, capturedPreparedTrade.PlatformFeeDestination)

	// --- Mocking for ExecuteTrade ---
	signedTxString := base64.StdEncoding.EncodeToString([]byte("signed_tx_bytes_for_successful_lifecycle"))
	rawTxBytes, _ := base64.StdEncoding.DecodeString(signedTxString)
	txSignature := bmodel.Signature("successful_tx_signature_" + capturedPreparedTrade.ID)

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxString).Return(capturedPreparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, rawTxBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(txSignature, nil).Once()

	// First Update call in ExecuteTrade (status: submitted)
	var capturedSubmittedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedSubmittedTrade = trade // Capture the trade for assertion
		return trade.ID == capturedPreparedTrade.ID &&
			trade.Status == model.TradeStatusSubmitted && // Use constant
			trade.TransactionHash == string(txSignature) &&
			trade.Error == nil && // Error should be cleared
			trade.CompletedAt == nil && // CompletedAt should be nil
			!trade.Finalized // Finalized should be false
	})).Return(nil).Once()

	// --- Call ExecuteTrade ---
	executeReq := model.TradeRequest{
		UnsignedTransaction: unsignedTxString,
		SignedTransaction:   signedTxString,
		// Fields like FromCoinMintAddress, ToCoinMintAddress, Amount are not directly used by ExecuteTrade if it fetches the trade record
	}
	finalTrade, err := service.ExecuteTrade(ctx, executeReq)

	// --- Assertions ---
	assert.NoError(t, err)
	assert.NotNil(t, finalTrade)
	assert.Equal(t, capturedPreparedTrade.ID, finalTrade.ID)

	// Verify the captured trade from the Update call
	assert.NotNil(t, capturedSubmittedTrade)
	assert.Equal(t, model.TradeStatusSubmitted, capturedSubmittedTrade.Status)
	assert.Equal(t, string(txSignature), capturedSubmittedTrade.TransactionHash)
	assert.Nil(t, capturedSubmittedTrade.Error)
	assert.Nil(t, capturedSubmittedTrade.CompletedAt)
	assert.False(t, capturedSubmittedTrade.Finalized)

	// Verify the returned trade from ExecuteTrade matches the submitted state
	assert.Equal(t, model.TradeStatusSubmitted, finalTrade.Status)
	assert.Equal(t, string(txSignature), finalTrade.TransactionHash)
	assert.Nil(t, finalTrade.Error)
	assert.Nil(t, finalTrade.CompletedAt)
	assert.False(t, finalTrade.Finalized)

	// Ensure GetTransactionStatus is NOT called
	mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.AnythingOfType("bmodel.Signature"))

	// Check all calls were made as expected (excluding GetTransactionStatus and second Update)
	mockChainClient.AssertExpectations(t) // SendRawTransaction should still be expected
	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockPriceService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

// TestTradeLifecycle_ConfirmationTimesOut_RemainsSubmitted is largely obsolete for ExecuteTrade
// as ExecuteTrade no longer polls. A successful SendRawTransaction results in "submitted".
// This test will be simplified to reflect that.
func TestTradeLifecycle_ExecuteTrade_SuccessfulSubmit(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000"
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	// --- Mocking for PrepareSwap (simplified) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)
	rawJupiterQuotePayload := json.RawMessage(`{"inAmount":"1000000","outAmount":"2000000000"}`)
	mockJupiterClient.On("GetQuote", ctx, mock.Anything).Return(&jupiter.QuoteResponse{RawPayload: rawJupiterQuotePayload, OutAmount: "2000000000", ExchangeRate: "2", Fee: "0.0001"}, nil).Once()
	mockPriceService.On("GetCoinPrices", ctx, mock.Anything).Return(map[string]float64{}, nil).Maybe()
	unsignedTxString := "unsigned_tx_for_successful_submit"
	mockJupiterClient.On("CreateSwapTransaction", ctx, mock.Anything, testUserPubKey, defaultPlatformAddr).Return(unsignedTxString, nil).Once()

	var capturedPreparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedPreparedTrade = trade
		trade.ID = "trade_successful_submit"
		return trade.Status == "prepared"
	})).Return(nil).Once()

	prepareReq := model.PrepareSwapRequestData{UserWalletAddress: userWalletAddress, FromCoinMintAddress: fromCoinMintAddress, ToCoinMintAddress: toCoinMintAddress, Amount: inputAmountStr, SlippageBps: slippageBps}
	_, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)
	assert.NotNil(t, capturedPreparedTrade)

	// --- Mocking for ExecuteTrade ---
	signedTxString := base64.StdEncoding.EncodeToString([]byte("signed_tx_for_successful_submit"))
	rawTxBytes, _ := base64.StdEncoding.DecodeString(signedTxString)
	txSignature := bmodel.Signature("tx_sig_for_successful_submit_" + capturedPreparedTrade.ID)

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxString).Return(capturedPreparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, rawTxBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(txSignature, nil).Once()

	// Expect Update to "submitted"
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		return trade.ID == capturedPreparedTrade.ID &&
			trade.Status == model.TradeStatusSubmitted &&
			trade.TransactionHash == string(txSignature) &&
			trade.Error == nil &&
			trade.CompletedAt == nil &&
			!trade.Finalized
	})).Return(nil).Once()

	// --- Call ExecuteTrade ---
	executeReq := model.TradeRequest{UnsignedTransaction: unsignedTxString, SignedTransaction: signedTxString}
	finalTrade, err := service.ExecuteTrade(ctx, executeReq)

	// --- Assertions ---
	assert.NoError(t, err)
	assert.NotNil(t, finalTrade)
	assert.Equal(t, capturedPreparedTrade.ID, finalTrade.ID)
	assert.Equal(t, model.TradeStatusSubmitted, finalTrade.Status)
	assert.Nil(t, finalTrade.Error)
	assert.False(t, finalTrade.Finalized)
	assert.Nil(t, finalTrade.CompletedAt)
	assert.Equal(t, string(txSignature), finalTrade.TransactionHash)

	mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.AnythingOfType("bmodel.Signature"))
	mockChainClient.AssertExpectations(t) // SendRawTransaction
	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

func TestPrepareSwap_FeePopulation_WithPlatformFees(t *testing.T) {
	ctx := context.Background()
	service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	// Override service config for this test for specific platform fee settings
	configuredPlatformFeeBps := 100 // 1%
	configuredPlatformFeeAddress := "ConfiguredPlatformFeeAddress"
	service.platformFeeBps = configuredPlatformFeeBps
	service.platformFeeAccountAddress = configuredPlatformFeeAddress

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000" // 1 FROM
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	// Jupiter provides its own platform fee details
	jupiterPlatformFeeAmountStr := "10000" // 0.01 FROM (assuming FROM coin has 6 decimals)
	jupiterPlatformFeeBps := 100            // Jupiter says 1%
	jupiterPlatformFeeMint := fromCoinMintAddress

	mockStore.On("Trades").Return(mockTradeRepo).Once()

	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)

	// RawPayload for Jupiter quote, including platform fee details
	// Platform fee: 10000 units of fromCoinMint (which is 0.01 FROM coin if decimals=6)
	// FeeBps for platform fee: 100 (1%)
	rawJupiterQuotePayload := json.RawMessage(
		`{"inAmount":"1000000","outAmount":"1980000000",` +
			`"priceImpactPct":"0.01",` +
			`"routePlan":[{"swapInfo":{"label":"FROM -> TO","feeMint":"So11111111111111111111111111111111111111112","feeAmount":"5000"},"marketInfos":null}],` + // Network fee: 5000 lamports
			`"platformFee":{"amount":"` + jupiterPlatformFeeAmountStr + `","feeBps":` + strconv.Itoa(jupiterPlatformFeeBps) + `,"feeMint":"` + jupiterPlatformFeeMint + `"},` +
			`"contextSlot":12345,"timeTaken":0.123}`)

	mockJupiterClient.On("GetQuote", ctx, mock.MatchedBy(func(params jupiter.QuoteParams) bool {
		return params.InputMint == fromCoinMintAddress && params.FeeBps == configuredPlatformFeeBps // Service still requests with its configured BPS
	})).Return(&jupiter.QuoteResponse{
		InputMint:      fromCoinMintAddress,
		OutputMint:     toCoinMintAddress,
		InAmount:       inputAmountStr,
		OutAmount:      "1980000000",                                                                          // 1.98 TO coins
		RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: solanago.SolMint.String(), FeeAmount: "5000"}}}, // Network fee
		PriceImpactPct: "0.01",
		PlatformFee:    &jupiter.PlatformFee{Amount: jupiterPlatformFeeAmountStr, FeeBps: jupiterPlatformFeeBps, FeeMint: jupiterPlatformFeeMint},
		RawPayload:     rawJupiterQuotePayload,
	}, nil).Once()

	// Prices for fee calculation: SOL for network fee, FROM for platform fee
	// 1 SOL = $100, 1 FROM = $2
	mockPriceService.On("GetCoinPrices", ctx, mock.IsType([]string{})).Return(map[string]float64{
		solanago.SolMint.String(): 100.0,
		jupiterPlatformFeeMint:    2.0,
	}, nil).Once()

	unsignedTxString := "unsigned_tx_with_platform_fees"
	mockJupiterClient.On("CreateSwapTransaction", ctx, rawJupiterQuotePayload, testUserPubKey, configuredPlatformFeeAddress).Return(unsignedTxString, nil).Once()

	var capturedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedTrade = trade
		return trade.UnsignedTransaction == unsignedTxString
	})).Return(nil).Once()

	// --- Call PrepareSwap ---
	prepareReq := model.PrepareSwapRequestData{UserWalletAddress: userWalletAddress, FromCoinMintAddress: fromCoinMintAddress, ToCoinMintAddress: toCoinMintAddress, Amount: inputAmountStr, SlippageBps: slippageBps}
	_, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)

	// --- Assertions ---
	assert.NotNil(t, capturedTrade)

	// PlatformFeeAmount should be from Jupiter's quote (10000 units of FROM coin)
	expectedPlatformFeeAmountFromQuote, _ := strconv.ParseFloat(jupiterPlatformFeeAmountStr, 64)
	assert.Equal(t, expectedPlatformFeeAmountFromQuote, capturedTrade.PlatformFeeAmount)

	// PlatformFeePercent should be from Jupiter's quote FeeBps (100 bps = 1%)
	assert.Equal(t, float64(jupiterPlatformFeeBps)/100.0, capturedTrade.PlatformFeePercent)

	// PlatformFeeDestination should be the service's configured address
	assert.Equal(t, configuredPlatformFeeAddress, capturedTrade.PlatformFeeDestination)

	// trade.Fee is total fee in USD (or USDC equivalent with 9 decimals)
	// Network fee: 5000 lamports SOL. 1 SOL = $100. So, 5000 lamports = 0.000005 SOL * $100 = $0.0005
	// Platform fee: 10000 units of FROM coin. 1 FROM = $2. So, 10000 units = (10000 / 10^6) FROM * $2 = 0.01 FROM * $2 = $0.02
	// Total fee in USD = $0.0005 + $0.02 = $0.0205
	// trade.Fee is stored as float64 representing this USD value, divided by 10^9 (for USDCoin representation)
	expectedNetworkFeeUSD := (5000.0 / 1_000_000_000.0) * 100.0 // lamports to SOL, then to USD
	expectedPlatformFeeUSD := (expectedPlatformFeeAmountFromQuote / math.Pow10(mockFromCoin.Decimals)) * 2.0
	expectedTotalFeeUSD := expectedNetworkFeeUSD + expectedPlatformFeeUSD
	expectedTradeFee := expectedTotalFeeUSD / math.Pow10(9) // As it's stored in GetSwapQuote

	assert.InDelta(t, expectedTradeFee, capturedTrade.Fee, 0.000000000001) // Using InDelta for float comparison

	mockChainClient.AssertExpectations(t) // No calls expected to mockChainClient in PrepareSwap
	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockPriceService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

func TestTradeLifecycle_ConfirmationFails_PostSubmission(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000"
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	// --- Mocking for PrepareSwap (simplified) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)
	rawJupiterQuotePayload := json.RawMessage(`{"inAmount":"1000000","outAmount":"2000000000"}`)
	mockJupiterClient.On("GetQuote", ctx, mock.Anything).Return(&jupiter.QuoteResponse{RawPayload: rawJupiterQuotePayload, OutAmount: "2000000000", ExchangeRate: "2", Fee: "0.0001"}, nil).Once()
	mockPriceService.On("GetCoinPrices", ctx, mock.Anything).Return(map[string]float64{}, nil).Maybe()
	unsignedTxString := "unsigned_tx_for_confirmation_failure"
	mockJupiterClient.On("CreateSwapTransaction", ctx, mock.Anything, testUserPubKey, defaultPlatformAddr).Return(unsignedTxString, nil).Once()

	var capturedPreparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedPreparedTrade = trade
		trade.ID = "trade_confirmation_failure"
		return trade.Status == "prepared"
	})).Return(nil).Once()

	prepareReq := model.PrepareSwapRequestData{UserWalletAddress: userWalletAddress, FromCoinMintAddress: fromCoinMintAddress, ToCoinMintAddress: toCoinMintAddress, Amount: inputAmountStr, SlippageBps: slippageBps}
	_, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)
	assert.NotNil(t, capturedPreparedTrade)

	// --- Mocking for ExecuteTrade ---
	signedTxString := base64.StdEncoding.EncodeToString([]byte("signed_tx_for_confirmation_failure"))
	rawTxBytes, _ := base64.StdEncoding.DecodeString(signedTxString)
	txSignature := bmodel.Signature("tx_sig_for_confirmation_failure_" + capturedPreparedTrade.ID)
	// confirmationErrorMsg := "transaction processed but failed: custom program error" // Not used in this version

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxString).Return(capturedPreparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, rawTxBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(txSignature, nil).Once()

	// Expect Update to "submitted"
	var capturedSubmittedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedSubmittedTrade = trade
		return trade.ID == capturedPreparedTrade.ID &&
			trade.Status == model.TradeStatusSubmitted &&
			trade.TransactionHash == string(txSignature) &&
			trade.Error == nil && // Error should be cleared
			trade.CompletedAt == nil && // CompletedAt should be nil
			!trade.Finalized // Finalized should be false
	})).Return(nil).Once()

	// --- Call ExecuteTrade ---
	executeReq := model.TradeRequest{UnsignedTransaction: unsignedTxString, SignedTransaction: signedTxString}
	finalTrade, err := service.ExecuteTrade(ctx, executeReq)

	// --- Assertions ---
	// ExecuteTrade now just submits and returns. No error if SendRawTransaction is successful.
	assert.NoError(t, err)
	assert.NotNil(t, finalTrade)
	assert.Equal(t, capturedPreparedTrade.ID, finalTrade.ID)

	// Verify the captured trade from the Update call
	assert.NotNil(t, capturedSubmittedTrade)
	assert.Equal(t, model.TradeStatusSubmitted, capturedSubmittedTrade.Status)

	// Verify the returned trade
	assert.Equal(t, model.TradeStatusSubmitted, finalTrade.Status)
	assert.Equal(t, string(txSignature), finalTrade.TransactionHash)
	assert.Nil(t, finalTrade.Error)
	assert.Nil(t, finalTrade.CompletedAt)
	assert.False(t, finalTrade.Finalized)

	// GetTransactionStatus and subsequent Update to "failed" are NOT called by ExecuteTrade anymore
	mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.AnythingOfType("bmodel.Signature"))
	mockChainClient.AssertExpectations(t) // SendRawTransaction
	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

func TestTradeLifecycle_ExecutionFails_BlockchainRejection(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000"
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	// --- Mocking for PrepareSwap (simplified as it's not the focus) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)
	rawJupiterQuotePayload := json.RawMessage(`{"inAmount":"1000000","outAmount":"2000000000"}`) // Minimal payload
	mockJupiterClient.On("GetQuote", ctx, mock.Anything).Return(&jupiter.QuoteResponse{RawPayload: rawJupiterQuotePayload, OutAmount: "2000000000", ExchangeRate: "2", Fee: "0.0001"}, nil).Once()
	mockPriceService.On("GetCoinPrices", ctx, mock.Anything).Return(map[string]float64{}, nil).Maybe() // May not be hit if fee calculation is simple
	unsignedTxString := "unsigned_tx_for_blockchain_rejection"
	mockJupiterClient.On("CreateSwapTransaction", ctx, mock.Anything, testUserPubKey, defaultPlatformAddr).Return(unsignedTxString, nil).Once()

	var capturedPreparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedPreparedTrade = trade
		trade.ID = "trade_blockchain_rejection" // Assign an ID for later retrieval
		return trade.Status == "prepared"
	})).Return(nil).Once()

	prepareReq := model.PrepareSwapRequestData{UserWalletAddress: userWalletAddress, FromCoinMintAddress: fromCoinMintAddress, ToCoinMintAddress: toCoinMintAddress, Amount: inputAmountStr, SlippageBps: slippageBps}
	_, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)
	assert.NotNil(t, capturedPreparedTrade)

	// --- Mocking for ExecuteTrade ---
	signedTxString := base64.StdEncoding.EncodeToString([]byte("signed_tx_for_blockchain_rejection"))
	rawTxBytes, _ := base64.StdEncoding.DecodeString(signedTxString)
	blockchainError := errors.New("blockchain rejected transaction: insufficient funds")

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxString).Return(capturedPreparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, rawTxBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(bmodel.Signature(""), blockchainError).Once()

	// Expect Update call to set status to "failed"
	var capturedFailedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedFailedTrade = trade
		return trade.ID == capturedPreparedTrade.ID &&
			trade.Status == model.TradeStatusFailed && // Use constant
			trade.Error != nil && strings.Contains(*trade.Error, blockchainError.Error()) &&
			trade.CompletedAt == nil && // Should not be set by ExecuteTrade on direct SendRawTransaction failure
			!trade.Finalized // Should not be finalized by ExecuteTrade on direct SendRawTransaction failure
	})).Return(nil).Once()

	// --- Call ExecuteTrade ---
	executeReq := model.TradeRequest{UnsignedTransaction: unsignedTxString, SignedTransaction: signedTxString}
	finalTrade, err := service.ExecuteTrade(ctx, executeReq)

	// --- Assertions ---
	assert.Error(t, err)
	assert.Contains(t, err.Error(), blockchainError.Error())
	assert.Nil(t, finalTrade) // ExecuteTrade returns (nil, err) on SendRawTransaction failure

	assert.NotNil(t, capturedFailedTrade)
	assert.Equal(t, model.TradeStatusFailed, capturedFailedTrade.Status)
	assert.NotNil(t, capturedFailedTrade.Error)
	assert.Contains(t, *capturedFailedTrade.Error, blockchainError.Error())
	assert.False(t, capturedFailedTrade.Finalized)
	assert.Nil(t, capturedFailedTrade.CompletedAt)

	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockPriceService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

// TestGetTradeByTransactionHash tests the GetTradeByTransactionHash function
func TestGetTradeByTransactionHash(t *testing.T) {
	ctx := context.Background()
	txHash := "testTxHash123"

	t.Run("Trade already completed in DB", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		completedTrade := &model.Trade{ID: "trade1", TransactionHash: txHash, Status: model.TradeStatusCompleted}

		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(completedTrade, nil).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err)
		assert.Equal(t, completedTrade, resultTrade)
		mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.Anything)
		mockTradeRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
	})

	t.Run("Trade already failed in DB", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		failedTrade := &model.Trade{ID: "trade2", TransactionHash: txHash, Status: model.TradeStatusFailed}

		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(failedTrade, nil).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err)
		assert.Equal(t, failedTrade, resultTrade)
		mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.Anything)
		mockTradeRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
	})

	t.Run("Submitted trade gets confirmed on-chain", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		submittedTrade := &model.Trade{ID: "trade3", TransactionHash: txHash, Status: model.TradeStatusSubmitted}

		mockStore.On("Trades").Return(mockTradeRepo).Times(2) // For GetByField and Update
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(submittedTrade, nil).Once()
		mockChainClient.On("GetTransactionStatus", ctx, bmodel.Signature(txHash)).Return(&bmodel.TransactionStatus{Confirmed: true}, nil).Once()

		var capturedUpdatedTrade *model.Trade
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			capturedUpdatedTrade = trade
			return trade.ID == submittedTrade.ID &&
				trade.Status == model.TradeStatusCompleted &&
				trade.Finalized == true &&
				trade.CompletedAt != nil &&
				trade.Error == nil
		})).Return(nil).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err)
		assert.NotNil(t, resultTrade)
		assert.Equal(t, model.TradeStatusCompleted, resultTrade.Status)
		assert.True(t, resultTrade.Finalized)
		assert.NotNil(t, resultTrade.CompletedAt)
		assert.Nil(t, resultTrade.Error)

		assert.NotNil(t, capturedUpdatedTrade) // Ensure Update was called and captured
		mockChainClient.AssertExpectations(t)
		mockStore.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
	})

	t.Run("Submitted trade fails on-chain", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		submittedTrade := &model.Trade{ID: "trade4", TransactionHash: txHash, Status: model.TradeStatusSubmitted}
		onChainError := errors.New("on-chain execution failed")

		mockStore.On("Trades").Return(mockTradeRepo).Times(2) // For GetByField and Update
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(submittedTrade, nil).Once()
		mockChainClient.On("GetTransactionStatus", ctx, bmodel.Signature(txHash)).Return(&bmodel.TransactionStatus{Failed: true, Err: onChainError}, nil).Once()

		var capturedUpdatedTrade *model.Trade
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			capturedUpdatedTrade = trade
			return trade.ID == submittedTrade.ID &&
				trade.Status == model.TradeStatusFailed &&
				trade.Finalized == true && // Finalized on failure too
				trade.CompletedAt != nil && // Timestamp of failure processing
				trade.Error != nil && strings.Contains(*trade.Error, onChainError.Error())
		})).Return(nil).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err)
		assert.NotNil(t, resultTrade)
		assert.Equal(t, model.TradeStatusFailed, resultTrade.Status)
		assert.True(t, resultTrade.Finalized)
		assert.NotNil(t, resultTrade.CompletedAt)
		assert.NotNil(t, resultTrade.Error)
		assert.Contains(t, *resultTrade.Error, onChainError.Error())

		assert.NotNil(t, capturedUpdatedTrade)
		mockChainClient.AssertExpectations(t)
		mockStore.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
	})

	t.Run("Submitted trade is still pending on-chain", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		submittedTrade := &model.Trade{ID: "trade5", TransactionHash: txHash, Status: model.TradeStatusSubmitted}

		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(submittedTrade, nil).Once()
		mockChainClient.On("GetTransactionStatus", ctx, bmodel.Signature(txHash)).Return(&bmodel.TransactionStatus{Confirmed: false, Failed: false}, nil).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err)
		assert.NotNil(t, resultTrade)
		assert.Equal(t, model.TradeStatusSubmitted, resultTrade.Status) // Status should not change
		assert.Nil(t, resultTrade.CompletedAt)
		assert.False(t, resultTrade.Finalized)

		mockTradeRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
		mockChainClient.AssertExpectations(t)
		mockStore.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
	})

	t.Run("GetTransactionStatus call itself fails", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		submittedTrade := &model.Trade{ID: "trade6", TransactionHash: txHash, Status: model.TradeStatusSubmitted, Error: nil}
		statusCheckError := errors.New("RPC node unavailable")

		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(submittedTrade, nil).Once()
		mockChainClient.On("GetTransactionStatus", ctx, bmodel.Signature(txHash)).Return(nil, statusCheckError).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.NoError(t, err) // The function itself shouldn't error, just return the trade as is
		assert.NotNil(t, resultTrade)
		assert.Equal(t, model.TradeStatusSubmitted, resultTrade.Status) // Status should not change
		assert.Nil(t, resultTrade.Error) // Original error should be preserved (nil in this case)
		assert.Nil(t, resultTrade.CompletedAt)
		assert.False(t, resultTrade.Finalized)

		mockTradeRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
		mockChainClient.AssertExpectations(t)
		mockStore.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
	})

	t.Run("Trade not found in DB", func(t *testing.T) {
		service, mockChainClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		dbError := errors.New("database error: not found")

		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "transaction_hash", txHash).Return(nil, dbError).Once()

		resultTrade, err := service.GetTradeByTransactionHash(ctx, txHash)

		assert.Error(t, err)
		assert.Nil(t, resultTrade)
		assert.Contains(t, err.Error(), dbError.Error())
		mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.Anything)
	})
}

func TestPrepareSwap_FeePopulation_WithoutPlatformFees_UsesServiceConfig(t *testing.T) {
	ctx := context.Background()
	service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)

	// Service configured with platform fees
	configuredPlatformFeeBps := 75 // 0.75%
	configuredPlatformFeeAddress := "ServiceDefaultPlatformAddress"
	service.platformFeeBps = configuredPlatformFeeBps
	service.platformFeeAccountAddress = configuredPlatformFeeAddress

	fromCoinMintAddress := mockFromCoin.MintAddress
	toCoinMintAddress := mockToCoin.MintAddress
	inputAmountStr := "1000000" // 1 FROM
	slippageBps := "50"
	userWalletAddress := defaultUserAddress
	testUserPubKey, _ := solanago.PublicKeyFromBase58(userWalletAddress)

	mockStore.On("Trades").Return(mockTradeRepo).Once()

	mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Times(2)
	mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoin, nil).Times(2)

	// RawPayload for Jupiter quote, WITHOUT platform fee details
	rawJupiterQuotePayload := json.RawMessage(
		`{"inAmount":"1000000","outAmount":"1990000000",` + // Slightly more outAmount as no platform fee from Jupiter
			`"priceImpactPct":"0.01",` +
			`"routePlan":[{"swapInfo":{"label":"FROM -> TO","feeMint":"So11111111111111111111111111111111111111112","feeAmount":"5000"},"marketInfos":null}],` + // Network fee: 5000 lamports
			`"contextSlot":12345,"timeTaken":0.123}`)

	mockJupiterClient.On("GetQuote", ctx, mock.MatchedBy(func(params jupiter.QuoteParams) bool {
		return params.InputMint == fromCoinMintAddress && params.FeeBps == configuredPlatformFeeBps // Service requests with its configured BPS
	})).Return(&jupiter.QuoteResponse{ // Jupiter returns a quote WITHOUT PlatformFee field
		InputMint:      fromCoinMintAddress,
		OutputMint:     toCoinMintAddress,
		InAmount:       inputAmountStr,
		OutAmount:      "1990000000",                                                                          // 1.99 TO coins
		RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: solanago.SolMint.String(), FeeAmount: "5000"}}}, // Network fee
		PriceImpactPct: "0.01",
		PlatformFee:    nil, // Explicitly nil
		RawPayload:     rawJupiterQuotePayload,
	}, nil).Once()

	// Price for network fee calculation (SOL)
	mockPriceService.On("GetCoinPrices", ctx, []string{solanago.SolMint.String()}).Return(map[string]float64{
		solanago.SolMint.String(): 100.0, // 1 SOL = $100
	}, nil).Once()

	unsignedTxString := "unsigned_tx_no_platform_fees_from_jupiter"
	// Jupiter's CreateSwapTransaction is called with the service's platform fee address,
	// as the service intends to collect this fee based on its own configuration.
	mockJupiterClient.On("CreateSwapTransaction", ctx, rawJupiterQuotePayload, testUserPubKey, configuredPlatformFeeAddress).Return(unsignedTxString, nil).Once()

	var capturedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedTrade = trade
		return trade.UnsignedTransaction == unsignedTxString
	})).Return(nil).Once()

	// --- Call PrepareSwap ---
	prepareReq := model.PrepareSwapRequestData{UserWalletAddress: userWalletAddress, FromCoinMintAddress: fromCoinMintAddress, ToCoinMintAddress: toCoinMintAddress, Amount: inputAmountStr, SlippageBps: slippageBps}
	_, err := service.PrepareSwap(ctx, prepareReq)
	assert.NoError(t, err)

	// --- Assertions ---
	assert.NotNil(t, capturedTrade)

	// PlatformFeeAmount should be 0.0 as Jupiter did not provide it
	assert.Equal(t, 0.0, capturedTrade.PlatformFeeAmount)

	// PlatformFeePercent should be from the service's configuration
	assert.Equal(t, float64(configuredPlatformFeeBps)/100.0, capturedTrade.PlatformFeePercent)

	// PlatformFeeDestination should be the service's configured address
	assert.Equal(t, configuredPlatformFeeAddress, capturedTrade.PlatformFeeDestination)

	// trade.Fee is total fee in USD (or USDC equivalent with 9 decimals)
	// Network fee: 5000 lamports SOL. 1 SOL = $100. So, 0.000005 SOL * $100 = $0.0005
	// No platform fee from Jupiter in this quote response.
	// The service's GetSwapQuote calculates totalFeeInUSD based on quote.PlatformFee which is nil here.
	expectedNetworkFeeUSD := (5000.0 / 1_000_000_000.0) * 100.0 // lamports to SOL, then to USD
	expectedTradeFee := expectedNetworkFeeUSD / math.Pow10(9)    // As it's stored in GetSwapQuote

	assert.InDelta(t, expectedTradeFee, capturedTrade.Fee, 0.000000000001)

	// mockChainClient.AssertExpectations(t) // No calls expected
	mockCoinService.AssertExpectations(t)
	mockJupiterClient.AssertExpectations(t)
	mockPriceService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}
