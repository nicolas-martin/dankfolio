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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var (
	mockFromCoin = &model.Coin{ID: 1, MintAddress: "fromCoinMint", Symbol: "FROM", Decimals: 6, Name: "From Coin"}
	mockToCoin   = &model.Coin{ID: 2, MintAddress: "toCoinMint", Symbol: "TO", Decimals: 9, Name: "To Coin"}
)

// Helper function for creating pointers, useful for ListOptions
func Pint(i int) *int       { return &i }
func Pbool(b bool) *bool   { return &b }
func Pstring(s string) *string { return &s }


func setupService(t *testing.T) (
	*Service,
	*solanaClientMocks.MockClientAPI,
	*coinServiceMocks.MockCoinServiceAPI,
	*priceServiceMocks.MockPriceServiceAPI,
	*jupiterclientmocks.MockClientAPI,
	*dbDataStoreMocks.MockStore,
	*dbDataStoreMocks.MockRepository[model.Trade],
) {
	mockSolanaClient := solanaClientMocks.NewMockClientAPI(t)
	mockCoinService := coinServiceMocks.NewMockCoinServiceAPI(t) // This is CoinServiceAPI
	mockPriceService := priceServiceMocks.NewMockPriceServiceAPI(t)
	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockStore := dbDataStoreMocks.NewMockStore(t)
	mockTradeRepo := dbDataStoreMocks.NewMockRepository[model.Trade](t)

	service := NewService(mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore)
	return service, mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo
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

		// Ensure mockFromCoin and mockToCoin have IDs as they are used in PrepareSwap
		mockFromCoinWithID := &model.Coin{ID: 1, MintAddress: fromCoinMintAddress, Symbol: "FROM", Decimals: 6, Name: "From Coin"}
		mockToCoinWithID := &model.Coin{ID: 2, MintAddress: toCoinMintAddress, Symbol: "TO", Decimals: 9, Name: "To Coin"}

		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoinWithID, nil).Once()
		mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoinWithID, nil).Once()

		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterQuote := &jupiter.QuoteResponse{
			InputMint:      fromCoinMintAddress,
			OutputMint:     toCoinMintAddress,
			InAmount:       inputAmount,
			OutAmount:      "2000000000", // 2 * 10^9 (mockToCoin.Decimals)
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{Label: "FROM -> TO", FeeMint: "feeCoinID", FeeAmount: "1000"}}},
			PriceImpactPct: "0.1",
			RawPayload:     rawQuotePayload,
		}
		mockJupiterClient.On("GetQuote", ctx, mock.MatchedBy(func(params jupiter.QuoteParams) bool {
			return params.InputMint == fromCoinMintAddress && params.OutputMint == toCoinMintAddress
		})).Return(mockJupiterQuote, nil).Once()
		// Assuming feeCoinID has 6 decimals for fee calculation example
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(map[string]float64{"feeCoinID": 0.5}, nil).Once()


		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)

		assert.NoError(t, err)
		assert.NotNil(t, quote)
		assert.Equal(t, "2.000000", quote.EstimatedAmount) // 2000000000 / 10^9
		// Fee: 1000 (fee amount) * 0.5 (price in USD) = 500.
		// Original code: totalFeeInUSD / math.Pow10(9) -> 500 / 10^9 = 0.000000500
		// Updated code (fee in output coin currency or scaled USD): totalFeeInUSD / toCoin.Price (if available) or scaled USD
		// If toCoin.Price is, for example, 25 USD, then 500 USD / 25 USD/TO = 20 TO tokens.
		// If toCoin.Price is 0, it uses scaled USD: 500 / 10^6 = 0.000500
		// This assertion depends on the fee calculation logic in GetSwapQuote's implementation for totalFeeInCoinCurrency
		// For now, let's assume the test matched the original simple scaled USD logic or was updated accordingly.
		// Given the current service code, if toCoin.Price is not >0, it divides by 10^6.
		// Let's ensure mockToCoin has a Price for predictable fee calculation in TO currency.
		// mockToCoinWithID.Price = 25.0 // Example price in USD
		// Then fee in TO would be (1000 * 0.5) / 25.0 = 20. Truncated to 9 decimals: "20.000000000"
		// If mockToCoin.Price is 0 (default for struct), then 500 / 10^6 = 0.0005. Truncated: "0.000500000"
		assert.Equal(t, "0.000500000", quote.Fee) 
		assert.Equal(t, "0.100000", quote.PriceImpact) // truncateDecimals(0.1, 6)
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

	// Ensure mock coins have IDs
	mockFromCoinWithID := &model.Coin{ID: 1, MintAddress: fromCoinMintAddress, Symbol: "FROM", Decimals: 6, Name: "From Coin"}
	mockToCoinWithID := &model.Coin{ID: 2, MintAddress: toCoinMintAddress, Symbol: "TO", Decimals: 9, Name: "To Coin"}


	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		mockCoinService.On("GetCoinByMintAddress", ctx, fromCoinMintAddress).Return(mockFromCoinWithID, nil).Once()
		mockCoinService.On("GetCoinByMintAddress", ctx, toCoinMintAddress).Return(mockToCoinWithID, nil).Once()
		
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
		mockJupiterClient.On("CreateSwapTransaction", ctx, mock.IsType([]byte{}), testUserPubKey).Return(expectedUnsignedTx, nil).Once()
		
		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.FromCoinMintAddress == fromCoinMintAddress &&
				trade.ToCoinMintAddress == toCoinMintAddress &&
				trade.FromCoinPKID == mockFromCoinWithID.ID && // Check PKID
				trade.ToCoinPKID == mockToCoinWithID.ID &&   // Check PKID
				trade.UserID == fromAddress &&
				trade.CoinSymbol == mockFromCoinWithID.Symbol &&
				trade.Type == "swap" &&
				trade.Status == "prepared" &&
				trade.UnsignedTransaction == expectedUnsignedTx
		})).Return(nil).Once()

		unsignedTx, err := service.PrepareSwap(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmountStr, slippageBps, fromAddress)

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

		_, err := service.PrepareSwap(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmountStr, slippageBps, fromAddress)
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
		FromCoinMintAddress: mockFromCoin.MintAddress, // Use updated field name
		ToCoinMintAddress:   mockToCoin.MintAddress,   // Use updated field name
		Amount:              1.0,
		UnsignedTransaction: unsignedTx,
		SignedTransaction:   signedTx,
	}

	existingTrade := &model.Trade{
		ID:                  "trade123",
		UnsignedTransaction: unsignedTx,
		FromCoinMintAddress: mockFromCoin.MintAddress, // Ensure existing trade also uses new fields
		ToCoinMintAddress:   mockToCoin.MintAddress,
		FromCoinPKID:        mockFromCoin.ID,
		ToCoinPKID:          mockToCoin.ID,
		Status:              "prepared",
	}

	t.Run("Success - No Debug", func(t *testing.T) {
		service, mockSolanaClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2) 

		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(existingTrade, nil).Once()
		mockSolanaClient.On("ExecuteTrade", ctx, existingTrade, signedTx).Return(expectedTxHash, nil).Once()
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.ID == existingTrade.ID && trade.Status == "submitted" && trade.TransactionHash == expectedTxHash
		})).Return(nil).Once()

		trade, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		assert.Equal(t, "submitted", trade.Status)
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
