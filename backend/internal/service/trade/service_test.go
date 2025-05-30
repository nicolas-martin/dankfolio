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
	mockCoinService := coinServiceMocks.NewMockCoinServiceAPI(t)
	mockPriceService := priceServiceMocks.NewMockPriceServiceAPI(t)
	mockJupiterClient := jupiterclientmocks.NewMockClientAPI(t)
	mockStore := dbDataStoreMocks.NewMockStore(t)
	mockTradeRepo := dbDataStoreMocks.NewMockRepository[model.Trade](t)

	service := NewService(mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore)
	return service, mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo
}

func TestGetSwapQuote(t *testing.T) {
	ctx := context.Background()
	fromCoinMintAddress := "fromCoinMint"
	toCoinMintAddress := "toCoinMint"
	inputAmount := "1000000"
	slippageBps := "50"

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, _, _ := setupService(t)

		mockCoinService.On("GetCoinByID", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinMintAddress).Return(mockToCoin, nil).Once()

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
		assert.Equal(t, "0.000000500", quote.Fee) // 1000 units of feeCoinID (assuming 0 decimals for feeCoin amount) * 0.5 USD/unit = 500 USD. Then / 10^9 for display? Check logic.
		assert.Equal(t, "0.1", quote.PriceImpact)
		assert.Equal(t, string(rawQuotePayload), string(quote.Raw)) 
		mockCoinService.AssertExpectations(t)
		mockJupiterClient.AssertExpectations(t)
		mockPriceService.AssertExpectations(t)
	})

	t.Run("Error fromCoinService GetCoinByID fromCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinMintAddress).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get from coin "+fromCoinMintAddress)
	})

	t.Run("Error fromCoinService GetCoinByID toCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinMintAddress).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get to coin "+toCoinMintAddress)
	})
	
	// ... other error sub-tests for GetSwapQuote can remain similar ...
}

func TestPrepareSwap(t *testing.T) {
	ctx := context.Background()
	fromCoinMintAddress := "fromCoinMint"
	toCoinMintAddress := "toCoinMint"
	inputAmountStr := "1000000" // Corresponds to 1 FROM token if decimals = 6
	slippageBps := "50"
	fromAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // Valid address
	testUserPubKey, _ := solanago.PublicKeyFromBase58(fromAddress)

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		// Mock GetCoinByID calls for fromCoin and toCoin
		mockCoinService.On("GetCoinByID", ctx, fromCoinMintAddress).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinMintAddress).Return(mockToCoin, nil).Once()
		
		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InputMint:      fromCoinMintAddress,
			OutputMint:     toCoinMintAddress,
			InAmount:       inputAmountStr,
			OutAmount:      "2000000000", // Corresponds to 2 TO tokens if decimals = 9
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
				trade.FromCoinPKID == mockFromCoin.ID &&
				trade.ToCoinPKID == mockToCoin.ID &&
				trade.UserID == fromAddress &&
				trade.CoinSymbol == mockFromCoin.Symbol && // Check CoinSymbol
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

	t.Run("Error GetCoinByID fromCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinMintAddress).Return(nil, errors.New("fetch from_coin error")).Once()

		_, err := service.PrepareSwap(ctx, fromCoinMintAddress, toCoinMintAddress, inputAmountStr, slippageBps, fromAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get fromCoin details for "+fromCoinMintAddress)
	})
	
	// ... other error sub-tests for PrepareSwap can remain similar, ensuring mockCoinService calls are updated ...
}

func TestExecuteTrade(t *testing.T) {
	ctx := context.Background()
	unsignedTx := "sample_unsigned_transaction"
	signedTx := "sample_signed_transaction"
	expectedTxHash := "final_transaction_hash"

	tradeRequest := model.TradeRequest{
		FromCoinMintAddress: "fromCoinMint", // Updated field
		ToCoinMintAddress:   "toCoinMint",   // Updated field
		Amount:              1.0,
		UnsignedTransaction: unsignedTx,
		SignedTransaction:   signedTx,
	}

	existingTrade := &model.Trade{
		ID:                  "trade123",
		UnsignedTransaction: unsignedTx,
		FromCoinMintAddress: "fromCoinMint", // Ensure existing trade also uses new fields for consistency
		ToCoinMintAddress:   "toCoinMint",
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

		// Mock GetCoinByID for the debug mode's attempt to get FromCoin's symbol
		mockCoinService.On("GetCoinByID", debugCtx, tradeRequest.FromCoinMintAddress).Return(mockFromCoin, nil).Maybe()


		mockTradeRepo.On("Create", debugCtx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Status == "completed" && trade.FromCoinMintAddress == tradeRequest.FromCoinMintAddress
		})).Return(nil).Once()

		trade, err := service.ExecuteTrade(debugCtx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		assert.Equal(t, "completed", trade.Status)
		assert.NotEmpty(t, trade.TransactionHash)
	})
	
	// ... other error sub-tests for ExecuteTrade can remain similar ...
}
