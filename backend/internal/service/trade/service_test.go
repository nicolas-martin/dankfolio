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
	mockFromCoin = &model.Coin{MintAddress: "fromCoinID", Symbol: "FROM", Decimals: 6, Name: "From Coin"}
	mockToCoin   = &model.Coin{MintAddress: "toCoinID", Symbol: "TO", Decimals: 9, Name: "To Coin"}
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

	// mockStore.On("Trades").Return(mockTradeRepo) // Removed: Add this expectation only in tests that use it.

	service := NewService(mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore)
	return service, mockSolanaClient, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo
}

func TestGetSwapQuote(t *testing.T) {
	ctx := context.Background()
	fromCoinID := "fromCoinID"
	toCoinID := "toCoinID"
	inputAmount := "1000000"
	slippageBps := "50"

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, _, _ := setupService(t)

		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()

		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterQuote := &jupiter.QuoteResponse{
			InputMint:      fromCoinID,
			OutputMint:     toCoinID,
			InAmount:       inputAmount,
			OutAmount:      "2000000000",
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{Label: "FROM -> TO", FeeMint: "feeCoinID", FeeAmount: "1000"}}},
			PriceImpactPct: "0.1",
			RawPayload:     rawQuotePayload,
		}
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(mockJupiterQuote, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(map[string]float64{"feeCoinID": 0.5}, nil).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, slippageBps)

		assert.NoError(t, err)
		assert.NotNil(t, quote)
		assert.Equal(t, "2.000000", quote.EstimatedAmount)
		assert.Equal(t, "0.000000500", quote.Fee)
		assert.Equal(t, "0.1", quote.PriceImpact)
		assert.Equal(t, string(rawQuotePayload), string(quote.Raw)) // Compare as strings
	})

	t.Run("Error fromCoinService GetCoinByID fromCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get from coin: coin error")
	})

	t.Run("Error fromCoinService GetCoinByID toCoin", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(nil, errors.New("coin error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get to coin: coin error")
	})

	t.Run("Error jupiterClient GetQuote", func(t *testing.T) {
		service, _, mockCoinService, _, mockJupiterClient, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(nil, errors.New("jupiter error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get Jupiter quote: jupiter error")
	})

	t.Run("Error priceService GetCoinPrices", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InAmount:       inputAmount,
			OutAmount:      "2000000000",
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: "feeCoinID"}}},
			PriceImpactPct: "0.1",
		}, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(nil, errors.New("price error")).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, slippageBps)
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "failed to get token prices: price error")
	})

	t.Run("Invalid slippageBps", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t)
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()

		quote, err := service.GetSwapQuote(ctx, fromCoinID, toCoinID, inputAmount, "invalid_bps")
		assert.Error(t, err)
		assert.Nil(t, quote)
		assert.Contains(t, err.Error(), "invalid slippage value")
	})
}

func TestPrepareSwap(t *testing.T) {
	ctx := context.Background()
	fromCoinID := "fromCoinID"
	toCoinID := "toCoinID"
	inputAmountStr := "1000000"
	slippageBps := "50"
	fromAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // Valid address

	testUserPubKey, _ := solanago.PublicKeyFromBase58(fromAddress)

	t.Run("Success", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()
		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InputMint:      fromCoinID,
			OutputMint:     toCoinID,
			InAmount:       inputAmountStr,
			OutAmount:      "2000000000",
			RoutePlan:      []jupiter.RoutePlan{{SwapInfo: jupiter.SwapInfo{FeeMint: "feeCoinID", FeeAmount: "1000"}}},
			PriceImpactPct: "0.1",
			RawPayload:     rawQuotePayload,
		}, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, []string{"feeCoinID"}).Return(map[string]float64{"feeCoinID": 0.5}, nil).Once()
		expectedUnsignedTx := "unsigned_transaction_string"
		mockJupiterClient.On("CreateSwapTransaction", ctx, mock.IsType([]byte{}), testUserPubKey).Return(expectedUnsignedTx, nil).Once()
		mockTradeRepo.On("Create", ctx, mock.AnythingOfType("*model.Trade")).Return(nil).Once()

		unsignedTx, err := service.PrepareSwap(ctx, fromCoinID, toCoinID, inputAmountStr, slippageBps, fromAddress)

		assert.NoError(t, err)
		assert.Equal(t, expectedUnsignedTx, unsignedTx)
	})

	t.Run("Invalid fromAddress", func(t *testing.T) {
		service, _, _, _, _, _, _ := setupService(t) // No db interaction expected
		_, err := service.PrepareSwap(ctx, fromCoinID, toCoinID, inputAmountStr, slippageBps, "invalid-address")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid from address")
	})

	t.Run("GetSwapQuote Fails", func(t *testing.T) {
		service, _, mockCoinService, _, _, _, _ := setupService(t) // No db interaction expected
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(nil, errors.New("coin error")).Once()

		_, err := service.PrepareSwap(ctx, fromCoinID, toCoinID, inputAmountStr, slippageBps, fromAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get trade quote")
	})

	t.Run("CreateSwapTransaction Fails", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, _, _ := setupService(t) // No db interaction expected
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()
		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InAmount: inputAmountStr, OutAmount: "1", PriceImpactPct: "0", RawPayload: rawQuotePayload, RoutePlan: []jupiter.RoutePlan{},
		}, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, mock.Anything).Return(map[string]float64{}, nil).Once()
		mockJupiterClient.On("CreateSwapTransaction", ctx, mock.IsType([]byte{}), testUserPubKey).Return("", errors.New("jupiter tx error")).Once()

		_, err := service.PrepareSwap(ctx, fromCoinID, toCoinID, inputAmountStr, slippageBps, fromAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to create swap transaction: jupiter tx error")
	})

	t.Run("Trade Repo Create Fails", func(t *testing.T) {
		service, _, mockCoinService, mockPriceService, mockJupiterClient, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockCoinService.On("GetCoinByID", ctx, fromCoinID).Return(mockFromCoin, nil).Once()
		mockCoinService.On("GetCoinByID", ctx, toCoinID).Return(mockToCoin, nil).Once()
		rawQuotePayload := json.RawMessage(`{"raw": "payload"}`)
		mockJupiterClient.On("GetQuote", ctx, mock.AnythingOfType("jupiter.QuoteParams")).Return(&jupiter.QuoteResponse{
			InAmount: inputAmountStr, OutAmount: "1", PriceImpactPct: "0", RawPayload: rawQuotePayload, RoutePlan: []jupiter.RoutePlan{},
		}, nil).Once()
		mockPriceService.On("GetCoinPrices", ctx, mock.Anything).Return(map[string]float64{}, nil).Once()
		mockJupiterClient.On("CreateSwapTransaction", ctx, mock.IsType([]byte{}), testUserPubKey).Return("unsigned_tx", nil).Once()
		mockTradeRepo.On("Create", ctx, mock.AnythingOfType("*model.Trade")).Return(errors.New("db error")).Once()

		_, err := service.PrepareSwap(ctx, fromCoinID, toCoinID, inputAmountStr, slippageBps, fromAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to create trade record: db error")
	})
}

func TestExecuteTrade(t *testing.T) {
	ctx := context.Background()
	unsignedTx := "sample_unsigned_transaction"
	signedTx := "sample_signed_transaction"
	expectedTxHash := "final_transaction_hash"

	tradeRequest := model.TradeRequest{
		FromCoinID:          "fromCoinID",
		ToCoinID:            "toCoinID",
		Amount:              1.0,
		UnsignedTransaction: unsignedTx,
		SignedTransaction:   signedTx,
	}

	existingTrade := &model.Trade{
		ID:                  "trade123",
		UnsignedTransaction: unsignedTx,
		Status:              "prepared",
	}

	t.Run("Success - No Debug", func(t *testing.T) {
		service, mockSolanaClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2) // GetByField and Update

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
		service, _, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once() // For Create
		debugCtx := context.WithValue(ctx, model.DebugModeKey, true)

		mockTradeRepo.On("Create", debugCtx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Status == "completed" && trade.FromCoinID == tradeRequest.FromCoinID
		})).Return(nil).Once()

		trade, err := service.ExecuteTrade(debugCtx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		assert.Equal(t, "completed", trade.Status)
		assert.NotEmpty(t, trade.TransactionHash)
	})

	t.Run("Error GetByField Fails (Trade Not Found)", func(t *testing.T) {
		service, _, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(nil, db.ErrNotFound).Once()

		_, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to find existing trade record: record not found")
	})

	t.Run("Error GetByField Returns nil trade without error", func(t *testing.T) {
		service, _, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()
		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(nil, nil).Once()

		_, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no trade record found for the given transaction")
	})

	t.Run("Error SolanaClient ExecuteTrade Fails", func(t *testing.T) {
		service, mockSolanaClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2) // GetByField and Update

		mockSolanaErr := errors.New("solana error")
		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(existingTrade, nil).Once()
		mockSolanaClient.On("ExecuteTrade", ctx, existingTrade, signedTx).Return("", mockSolanaErr).Once()
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Status == "failed" && trade.Error != nil && *trade.Error == "solana error"
		})).Return(nil).Once()

		_, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.Error(t, err)

		unwrappedErr := errors.Unwrap(err)
		assert.NotNil(t, unwrappedErr, "Error should be wrapped, unwrapped error should not be nil")
		if unwrappedErr != nil {
			assert.Equal(t, mockSolanaErr.Error(), unwrappedErr.Error(), "Unwrapped error message should match original mock error")
		}
		// Check the prefix of the wrapped error
		assert.Contains(t, err.Error(), "failed to execute trade on blockchain:", "Error message should contain prefix")
	})

	t.Run("Error Update Fails after successful ExecuteTrade", func(t *testing.T) {
		service, mockSolanaClient, _, _, _, mockStore, mockTradeRepo := setupService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2) // GetByField and Update

		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTx).Return(existingTrade, nil).Once()
		mockSolanaClient.On("ExecuteTrade", ctx, existingTrade, signedTx).Return(expectedTxHash, nil).Once()
		mockTradeRepo.On("Update", ctx, mock.AnythingOfType("*model.Trade")).Return(errors.New("db update error")).Once()

		trade, err := service.ExecuteTrade(ctx, tradeRequest)
		assert.NoError(t, err)
		assert.NotNil(t, trade)
		assert.Equal(t, "submitted", trade.Status)
	})
}

// func TestCalculateTradeFee(t *testing.T) { // Commented out
//     amount := 100.0
//     rate := 0.01
//     expectedFee := 1.0
//     assert.Equal(t, expectedFee, CalculateTradeFee(amount, rate))
// }
