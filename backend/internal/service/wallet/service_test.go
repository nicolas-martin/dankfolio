package wallet

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/rpc"

	solanaClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	coinMocks "github.com/nicolas-martin/dankfolio/backend/internal/service/coin/mocks"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tyler-smith/go-bip39"

	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

var (
	testFromAddress  = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	testToAddress    = "So11111111111111111111111111111111111111112"  // SOL mint, often used as a dummy "to" for SOL transfers
	testSPLTokenMint = "Es9vMFrzaCERmJfrF4H2FYQGqPSHhpNgLcbXchH7aG4u" // A known SPL token mint

	mockSOLCoin = &model.Coin{
		ID:          1,
		MintAddress: model.SolMint, // Typically "So11111111111111111111111111111111111111112" or an empty string if logic handles it
		Symbol:      "SOL",
		Name:        "Solana",
		Decimals:    9,
	}
	mockSPLCoin = &model.Coin{
		ID:          2,
		MintAddress: testSPLTokenMint,
		Symbol:      "USDC",
		Name:        "USD Coin",
		Decimals:    6,
	}
)

// setupWalletService helper function
func setupWalletService(t *testing.T) (
	*Service,
	*solanaClientMocks.MockClientAPI, // Updated to use the generic mock type if available, or ensure compatibility
	*dbMocks.MockStore,
	*dbMocks.MockRepository[model.Wallet],
	*dbMocks.MockRepository[model.Trade],
	*coinMocks.MockCoinServiceAPI,
) {
	mockChainClient := solanaClientMocks.NewMockClientAPI(t) // Assuming this mock is compatible with bclient.GenericClientAPI
	mockStore := dbMocks.NewMockStore(t)
	mockWalletRepo := dbMocks.NewMockRepository[model.Wallet](t)
	mockTradeRepo := dbMocks.NewMockRepository[model.Trade](t)
	mockCoinService := coinMocks.NewMockCoinServiceAPI(t)

	// The service expects bclient.GenericClientAPI. Ensure mockChainClient implements this.
	service := New(mockChainClient, mockStore, mockCoinService)

	return service, mockChainClient, mockStore, mockWalletRepo, mockTradeRepo, mockCoinService
}

func TestCreateWallet(t *testing.T) {
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		service, _, mockStore, mockWalletRepo, _, _ := setupWalletService(t)

		mockStore.On("Wallet").Return(mockWalletRepo).Once()
		mockWalletRepo.On("Create", ctx, mock.AnythingOfType("*model.Wallet")).Return(nil).Once()

		walletInfo, err := service.CreateWallet(ctx)

		assert.NoError(t, err)
		assert.NotNil(t, walletInfo)
		assert.NotEmpty(t, walletInfo.PublicKey)
		assert.NotEmpty(t, walletInfo.SecretKey)
		assert.NotEmpty(t, walletInfo.Mnemonic)

		_, err = bip39.EntropyFromMnemonic(walletInfo.Mnemonic)
		assert.NoError(t, err, "Mnemonic should be valid")

		_, err = solana.PublicKeyFromBase58(walletInfo.PublicKey)
		assert.NoError(t, err, "PublicKey should be valid base58")

		var secretKeyBytes []byte
		err = json.Unmarshal([]byte(walletInfo.SecretKey), &secretKeyBytes)
		assert.NoError(t, err, "SecretKey should be valid JSON byte array")
		assert.Len(t, secretKeyBytes, 64, "SecretKey should be 64 bytes")
	})

	t.Run("Store Create Fails", func(t *testing.T) {
		service, _, mockStore, mockWalletRepo, _, _ := setupWalletService(t)

		mockStore.On("Wallet").Return(mockWalletRepo).Once()
		mockWalletRepo.On("Create", ctx, mock.AnythingOfType("*model.Wallet")).Return(errors.New("db error")).Once()

		walletInfo, err := service.CreateWallet(ctx)

		assert.Error(t, err)
		assert.Nil(t, walletInfo)
		assert.Contains(t, err.Error(), "error storing wallet in db: db error")
	})
}

func TestGetWalletBalances(t *testing.T) {
	ctx := context.Background()
	testAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	testPubKey, _ := solana.PublicKeyFromBase58(testAddress)

	t.Run("Success with SOL and token balances", func(t *testing.T) {
		service, mockRPCClient, _, _, _, _ := setupWalletService(t)

		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 2 * solana.LAMPORTS_PER_SOL}, nil).Once()

		tokenAccountsResult := &rpc.GetTokenAccountsResult{
			Value: []*rpc.TokenAccount{
				{
					Account: rpc.Account{
						Data: func() *rpc.DataBytesOrJSON {
							data := &rpc.DataBytesOrJSON{}
							jsonData := []byte(`{"parsed":{"info":{"mint":"tokenMint1","tokenAmount":{"uiAmount":10.5}}},"program":"spl-token","space":165}`)
							data.UnmarshalJSON(jsonData)
							return data
						}(),
					},
					Pubkey: solana.MustPublicKeyFromBase58("Es9vMFrzaCERmJfrF4H2FYQGqPSHhpNgLcbXchH7aG4u"),
				},
				{
					Account: rpc.Account{
						Data: func() *rpc.DataBytesOrJSON {
							data := &rpc.DataBytesOrJSON{}
							jsonData := []byte(`{"parsed":{"info":{"mint":"tokenMint2","tokenAmount":{"uiAmount":0.0}}},"program":"spl-token","space":165}`)
							data.UnmarshalJSON(jsonData)
							return data
						}(),
					},
					Pubkey: solana.MustPublicKeyFromBase58("So11111111111111111111111111111111111111112"),
				},
			},
		}
		mockRPCClient.On("GetTokenAccountsByOwner", ctx, testPubKey,
			&rpc.GetTokenAccountsConfig{ProgramId: solana.TokenProgramID.ToPointer()},
			&rpc.GetTokenAccountsOpts{Encoding: solana.EncodingJSONParsed, Commitment: rpc.CommitmentConfirmed},
		).Return(tokenAccountsResult, nil).Once()

		walletBalance, err := service.GetWalletBalances(ctx, testAddress)

		assert.NoError(t, err)
		assert.NotNil(t, walletBalance)
		assert.Len(t, walletBalance.Balances, 2)

		foundSOL := false
		foundToken1 := false
		for _, b := range walletBalance.Balances {
			switch b.ID {
			case model.SolMint:
				assert.Equal(t, 2.0, b.Amount)
				foundSOL = true
			case "tokenMint1":
				assert.Equal(t, 10.5, b.Amount)
				foundToken1 = true
			}
		}
		assert.True(t, foundSOL, "SOL balance not found")
		assert.True(t, foundToken1, "Token1 balance not found")
	})

	t.Run("Success with only token balances (SOL is zero)", func(t *testing.T) {
		service, mockRPCClient, _, _, _, _ := setupWalletService(t)

		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 0}, nil).Once()
		tokenAccountsResult := &rpc.GetTokenAccountsResult{
			Value: []*rpc.TokenAccount{
				{
					Account: rpc.Account{
						Data: func() *rpc.DataBytesOrJSON {
							data := &rpc.DataBytesOrJSON{}
							jsonData := []byte(`{"parsed":{"info":{"mint":"tokenMint1","tokenAmount":{"uiAmount":5.0}}},"program":"spl-token","space":165}`)
							data.UnmarshalJSON(jsonData)
							return data
						}(),
					},
					Pubkey: solana.MustPublicKeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
				},
			},
		}
		mockRPCClient.On("GetTokenAccountsByOwner", ctx, testPubKey, mock.Anything, mock.Anything).Return(tokenAccountsResult, nil).Once()

		walletBalance, err := service.GetWalletBalances(ctx, testAddress)
		assert.NoError(t, err)
		assert.NotNil(t, walletBalance)
		assert.Len(t, walletBalance.Balances, 1)
		assert.Equal(t, "tokenMint1", walletBalance.Balances[0].ID)
		assert.Equal(t, 5.0, walletBalance.Balances[0].Amount)
	})

	t.Run("Error invalid address", func(t *testing.T) {
		service, _, _, _, _, _ := setupWalletService(t)
		_, err := service.GetWalletBalances(ctx, "invalidAddress")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid address")
	})

	t.Run("Error GetBalance fails", func(t *testing.T) {
		service, mockRPCClient, _, _, _, _ := setupWalletService(t)
		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(nil, errors.New("rpc getbalance error")).Once()

		_, err := service.GetWalletBalances(ctx, testAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get SOL balance: rpc getbalance error")
	})

	t.Run("Error GetTokenAccountsByOwner fails", func(t *testing.T) {
		service, mockRPCClient, _, _, _, _ := setupWalletService(t)
		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 1000}, nil).Once()
		mockRPCClient.On("GetTokenAccountsByOwner", ctx, testPubKey, mock.Anything, mock.Anything).Return(nil, errors.New("rpc gettokens error")).Once()

		_, err := service.GetWalletBalances(ctx, testAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get token balances: failed to get token accounts: rpc gettokens error")
	})
}

func TestPrepareTransfer(t *testing.T) {
	ctx := context.Background()
	amount := 1.5
	expectedFeeSOL := float64(5000) / float64(solana.LAMPORTS_PER_SOL) // Default fee

	// Use bmodel.Blockhash for the mock return type of GetLatestBlockhash
	mockBlockHash := bmodel.Blockhash(solana.MustHashFromBase58("GH3w5N9WpGdn9c7sR8vV1mB9stH3sA63KqZ1xYgH8WbK").String())
	fromPubKey, _ := solana.PublicKeyFromBase58(testFromAddress)
	splMintKey, _ := solana.PublicKeyFromBase58(testSPLTokenMint)

	t.Run("Success SOL Transfer", func(t *testing.T) {
		service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		// Mock GetCoinByMintAddress for SOL (using "" as mint address for SOL transfer as per PrepareTransfer logic)
		mockCoinService.On("GetCoinByMintAddress", ctx, model.SolMint).Return(mockSOLCoin, nil).Once()

		mockChainClient.On("GetLatestBlockhash", ctx).Return(mockBlockHash, nil).Once()
		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			assert.Equal(t, "transfer", trade.Type)
			assert.Equal(t, model.SolMint, trade.FromCoinMintAddress)
			assert.Equal(t, model.SolMint, trade.ToCoinMintAddress)
			assert.Equal(t, mockSOLCoin.ID, trade.FromCoinPKID)
			assert.Equal(t, mockSOLCoin.ID, trade.ToCoinPKID)
			assert.Equal(t, mockSOLCoin.Symbol, trade.CoinSymbol)
			assert.Equal(t, "pending", trade.Status)
			assert.Equal(t, amount, trade.Amount)
			// Fee assertions from previous subtask
			assert.Equal(t, expectedFeeSOL, trade.Fee)
			assert.Equal(t, 0.0, trade.PlatformFeeAmount)
			assert.Equal(t, 0.0, trade.PlatformFeePercent)
			return true
		})).Return(nil).Once()

		unsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, "", amount) // "" for SOL mint
		assert.NoError(t, err)
		assert.NotEmpty(t, unsignedTx)
		// Further checks on tx structure can be done if needed
		mockChainClient.AssertExpectations(t) // Renamed from mockRPCClient
		mockTradeRepo.AssertExpectations(t)
		mockCoinService.AssertExpectations(t)
	})

	t.Run("Success SPL Token Transfer - ATA for receiver exists", func(t *testing.T) {
		service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		mockCoinService.On("GetCoinByMintAddress", ctx, testSPLTokenMint).Return(mockSPLCoin, nil).Once()

		fromAta, _, _ := solana.FindAssociatedTokenAddress(fromPubKey, splMintKey)
		// Mock GetAccountInfo for source ATA
		mockChainClient.On("GetAccountInfo", ctx, bmodel.Address(fromAta.String())).Return(&bmodel.AccountInfo{Owner: bmodel.Address(solana.TokenProgramID.String())}, nil).Once()

		toPubKey, _ := solana.PublicKeyFromBase58(testToAddress)
		toAta, _, _ := solana.FindAssociatedTokenAddress(toPubKey, splMintKey)
		// Mock GetAccountInfo for destination ATA (assuming it exists)
		mockChainClient.On("GetAccountInfo", ctx, bmodel.Address(toAta.String())).Return(&bmodel.AccountInfo{Owner: bmodel.Address(solana.TokenProgramID.String())}, nil).Once()

		// Mock GetAccountInfo for mint (to get decimals)
		// Construct mock mint data. For SPL token, decimals are at offset 44 if data represents full Mint layout.
		// However, the service's getMintInfo uses token.Mint.UnmarshalWithDecoder which is more robust.
		// We need to provide binary data that can be unmarshalled by token.Mint.
		// A minimal valid mint data (82 bytes) with decimals set:
		mintData := make([]byte, token.MintLayoutVersion1.Size)                             // Use MintLayoutVersion1.Size for clarity
		token.NewMintLayout().Encode(&token.Mint{Decimals: mockSPLCoin.Decimals}, mintData) // Simplest way to get valid binary data
		mockChainClient.On("GetAccountInfo", ctx, bmodel.Address(splMintKey.String())).Return(&bmodel.AccountInfo{Data: mintData}, nil).Once()

		mockChainClient.On("GetLatestBlockhash", ctx).Return(mockBlockHash, nil).Once()
		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			assert.Equal(t, "transfer", trade.Type)
			assert.Equal(t, testSPLTokenMint, trade.FromCoinMintAddress)
			assert.Equal(t, mockSPLCoin.ID, trade.FromCoinPKID)
			assert.Equal(t, mockSPLCoin.Symbol, trade.CoinSymbol)
			assert.Equal(t, "pending", trade.Status)
			assert.Equal(t, amount, trade.Amount)
			assert.Equal(t, expectedFeeSOL, trade.Fee)
			assert.Equal(t, 0.0, trade.PlatformFeeAmount)
			assert.Equal(t, 0.0, trade.PlatformFeePercent)
			return true
		})).Return(nil).Once()

		unsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, testSPLTokenMint, amount)
		assert.NoError(t, err)
		assert.NotEmpty(t, unsignedTx)
		mockChainClient.AssertExpectations(t)
		mockTradeRepo.AssertExpectations(t)
		mockCoinService.AssertExpectations(t)
	})

	// TODO: Add tests for PrepareTransfer failures (e.g., GetCoinByMintAddress fails, GetLatestBlockhash fails, etc.)
	// TODO: Add test for SPL Token Transfer - ATA for receiver does not exist (needs GetAccountInfo to return nil/not found for toAta)
}

func TestSubmitTransfer_SuccessLifecycle(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)

	unsignedTxForLookup := "unsigned_tx_for_successful_lifecycle"
	amount := 1.0
	expectedFeeSOL := float64(5000) / float64(solana.LAMPORTS_PER_SOL)

	// --- PrepareTransfer part ---
	mockStore.On("Trades").Return(mockTradeRepo) // Used by both Prepare and Submit parts
	mockCoinService.On("GetCoinByMintAddress", ctx, model.SolMint).Return(mockSOLCoin, nil).Once()
	mockChainClient.On("GetLatestBlockhash", ctx).Return(bmodel.Blockhash(solana.NewWallet().PublicKey.String()), nil).Once() // Dummy blockhash

	var preparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		preparedTrade = trade                           // Capture the trade object
		trade.UnsignedTransaction = unsignedTxForLookup // Ensure it has the expected unsigned tx
		trade.ID = "trade_success_lifecycle"            // Give it an ID for matching in SubmitTransfer mocks
		return trade.Type == "transfer" && trade.Status == "pending" && trade.Fee == expectedFeeSOL
	})).Return(nil).Once()

	createdUnsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, "", amount)
	assert.NoError(t, err)
	assert.NotEmpty(t, createdUnsignedTx)
	assert.NotNil(t, preparedTrade)
	preparedTrade.UnsignedTransaction = createdUnsignedTx // Ensure the captured trade has the actual unsignedTx string

	// --- SubmitTransfer part ---
	dummyFinalSignature := bmodel.Signature("final_tx_signature_for_successful_transfer_lifecycle")
	// Create a valid base64 encoded string for a minimal transaction
	dummyTx := solana.NewTransactionBuilder().Add(system.NewTransferInstruction(1, solana.SystemProgramID, solana.SystemProgramID).Build()).SetFeePayer(solana.SystemProgramID).SetRecentBlockHash(solana.Hash{}).MustBuild()
	txBytes, _ := dummyTx.MarshalBinary()
	signedTxBase64 := base64.StdEncoding.EncodeToString(txBytes)

	req := &TransferRequest{
		UnsignedTransaction: preparedTrade.UnsignedTransaction,
		SignedTransaction:   signedTxBase64,
	}

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", preparedTrade.UnsignedTransaction).Return(preparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, txBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(dummyFinalSignature, nil).Once()

	// First update to "submitted"
	var capturedSubmittedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedSubmittedTrade = trade // Capture the trade for assertion
		return trade.ID == preparedTrade.ID &&
			trade.Status == "submitted" &&
			trade.TransactionHash == string(dummyFinalSignature) &&
			trade.Error == nil && // Error should be cleared
			trade.CompletedAt == nil && // CompletedAt should be nil
			!trade.Finalized // Finalized should be false
	})).Return(nil).Once()

	finalSigStr, err := service.SubmitTransfer(ctx, req)
	assert.NoError(t, err)
	assert.Equal(t, string(dummyFinalSignature), finalSigStr)

	// Assert the state of the captured trade from the Update call
	assert.NotNil(t, capturedSubmittedTrade)
	assert.Equal(t, "submitted", capturedSubmittedTrade.Status)
	assert.Equal(t, string(dummyFinalSignature), capturedSubmittedTrade.TransactionHash)
	assert.Nil(t, capturedSubmittedTrade.Error)
	assert.Nil(t, capturedSubmittedTrade.CompletedAt)
	assert.False(t, capturedSubmittedTrade.Finalized)

	// Ensure GetTransactionStatus is NOT called by SubmitTransfer
	mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.AnythingOfType("bmodel.Signature"))
	mockChainClient.AssertExpectations(t) // For SendRawTransaction
	mockCoinService.AssertExpectations(t)
	mockStore.AssertExpectations(t) // Verifies all mockStore.On("Trades") calls
	mockTradeRepo.AssertExpectations(t)
}

// TestSubmitTransfer_Old is now fully covered by TestSubmitTransfer_SuccessLifecycle and other specific failure tests.
// It can be removed or kept skipped. For this exercise, we'll effectively remove it by not carrying it forward.

func TestTransferSubmissionFails_BlockchainRejection(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)

	unsignedTxForLookup := "unsigned_tx_for_blockchain_rejection"
	amount := 1.0
	expectedFeeSOL := float64(5000) / float64(solana.LAMPORTS_PER_SOL)

	// --- PrepareTransfer part (simplified, focus is on SubmitTransfer failure) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, model.SolMint).Return(mockSOLCoin, nil).Once()
	mockChainClient.On("GetLatestBlockhash", ctx).Return(bmodel.Blockhash(solana.NewWallet().PublicKey.String()), nil).Once()

	var preparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		preparedTrade = trade
		trade.ID = "trade_blockchain_rejection"
		return trade.Fee == expectedFeeSOL
	})).Return(nil).Once()

	createdUnsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, "", amount)
	assert.NoError(t, err)
	assert.NotNil(t, preparedTrade)
	preparedTrade.UnsignedTransaction = createdUnsignedTx // Use actual unsignedTx

	// --- SubmitTransfer part ---
	dummyTx := solana.NewTransactionBuilder().Add(system.NewTransferInstruction(1, solana.SystemProgramID, solana.SystemProgramID).Build()).SetFeePayer(solana.SystemProgramID).SetRecentBlockHash(solana.Hash{}).MustBuild()
	txBytes, _ := dummyTx.MarshalBinary()
	signedTxBase64 := base64.StdEncoding.EncodeToString(txBytes)
	blockchainError := errors.New("blockchain rejected: insufficient lamports")

	req := &TransferRequest{
		UnsignedTransaction: preparedTrade.UnsignedTransaction,
		SignedTransaction:   signedTxBase64,
	}

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", preparedTrade.UnsignedTransaction).Return(preparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, txBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(bmodel.Signature(""), blockchainError).Once()

	// Expect Update to "failed"
	var capturedFailedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedFailedTrade = trade
		return trade.ID == preparedTrade.ID &&
			trade.Status == "failed" && // Assuming model.TradeStatusFailed is "failed"
			trade.Error != nil && strings.Contains(*trade.Error, blockchainError.Error()) &&
			trade.CompletedAt == nil && // CompletedAt should be nil
			!trade.Finalized // Finalized should be false
	})).Return(nil).Once()

	sigStr, err := service.SubmitTransfer(ctx, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), blockchainError.Error())
	assert.Empty(t, sigStr) // Expect empty signature string on failure

	assert.NotNil(t, capturedFailedTrade)
	assert.Equal(t, "failed", capturedFailedTrade.Status)
	assert.False(t, capturedFailedTrade.Finalized)
	assert.Nil(t, capturedFailedTrade.CompletedAt)

	mockChainClient.AssertNotCalled(t, "GetTransactionStatus", mock.Anything, mock.Anything)
	mockChainClient.AssertExpectations(t) // For SendRawTransaction
	mockCoinService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

// TestTransferConfirmationTimesOut_RemainsSubmitted and TestTransferConfirmationFails_PostSubmissionFailure
// are no longer relevant for SubmitTransfer as it doesn't poll.
// The behavior of successful submission resulting in "submitted" status is covered by TestSubmitTransfer_SuccessLifecycle.
// The behavior of detecting on-chain failures/confirmations is now part of GetTradeByTransactionHash (if used).

func TestSubmitTransfer_TradeRecordNotFound(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockStore, _, mockTradeRepo, _ := setupWalletService(t)

	unsignedTxForLookup := "non_existent_unsigned_tx"
	dummyTx := solana.NewTransactionBuilder().Add(system.NewTransferInstruction(1, solana.SystemProgramID, solana.SystemProgramID).Build()).SetFeePayer(solana.SystemProgramID).SetRecentBlockHash(solana.Hash{}).MustBuild()
	txBytes, _ := dummyTx.MarshalBinary()
	signedTxBase64 := base64.StdEncoding.EncodeToString(txBytes)

	req := &TransferRequest{
		UnsignedTransaction: unsignedTxForLookup,
		SignedTransaction:   signedTxBase64,
	}

	// Mock GetByField to return an error (or nil, nil for "not found")
	mockStore.On("Trades").Return(mockTradeRepo).Once() // For the GetByField call
	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxForLookup).Return(nil, errors.New("record not found")).Once()
	// Or, if your GetByField returns (nil, nil) for not found:
	// mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxForLookup).Return(nil, nil).Once()

	sig, err := service.SubmitTransfer(ctx, req)

	assert.Error(t, err)
	assert.Empty(t, sig)                                           // No signature should be returned
	assert.Contains(t, err.Error(), "failed to find trade record") // Check for the specific error from SubmitTransfer

	// Ensure SendRawTransaction was NOT called
	mockChainClient.AssertNotCalled(t, "SendRawTransaction", mock.Anything, mock.Anything, mock.Anything)

	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
	mockChainClient.AssertExpectations(t) // To verify SendRawTransaction was not called if it had no other expected calls.
}

func TestTransferConfirmationTimesOut_RemainsSubmitted(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)

	unsignedTxForLookup := "unsigned_tx_for_timeout"
	amount := 1.0
	expectedFeeSOL := float64(5000) / float64(solana.LAMPORTS_PER_SOL)

	// --- PrepareTransfer part (simplified) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, model.SolMint).Return(mockSOLCoin, nil).Once()
	mockChainClient.On("GetLatestBlockhash", ctx).Return(bmodel.Blockhash(solana.NewWallet().PublicKey.String()), nil).Once()
	var preparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		preparedTrade = trade
		trade.ID = "trade_timeout"
		return trade.Fee == expectedFeeSOL
	})).Return(nil).Once()
	createdUnsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, "", amount)
	assert.NoError(t, err)
	assert.NotNil(t, preparedTrade)
	preparedTrade.UnsignedTransaction = createdUnsignedTx

	// --- SubmitTransfer part ---
	dummyTx := solana.NewTransactionBuilder().Add(system.NewTransferInstruction(1, solana.SystemProgramID, solana.SystemProgramID).Build()).SetFeePayer(solana.SystemProgramID).SetRecentBlockHash(solana.Hash{}).MustBuild()
	txBytes, _ := dummyTx.MarshalBinary()
	signedTxBase64 := base64.StdEncoding.EncodeToString(txBytes)
	txSignature := bmodel.Signature("sig_for_timeout")

	req := &TransferRequest{
		UnsignedTransaction: preparedTrade.UnsignedTransaction,
		SignedTransaction:   signedTxBase64,
	}

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", preparedTrade.UnsignedTransaction).Return(preparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, txBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(txSignature, nil).Once()

	// First Update to "submitted"
	var capturedSubmittedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		if trade.Status == "submitted" { // Capture only the first update to submitted
			capturedSubmittedTrade = trade
		}
		return trade.ID == preparedTrade.ID && trade.Status == "submitted" && trade.TransactionHash == string(txSignature)
	})).Return(nil).Once()

	// GetTransactionStatus always returns pending
	for i := 0; i < 5; i++ { // Assuming maxAttempts is 5 in service
		mockChainClient.On("GetTransactionStatus", ctx, txSignature).Return(&bmodel.TransactionStatus{Confirmed: false, Failed: false, Err: nil}, nil).Once()
	}

	finalSigStr, err := service.SubmitTransfer(ctx, req)
	assert.NoError(t, err)
	assert.Equal(t, string(txSignature), finalSigStr)

	// Assert that the trade captured after the "submitted" update is indeed what we check
	assert.NotNil(t, capturedSubmittedTrade)
	assert.Equal(t, "submitted", capturedSubmittedTrade.Status) // Should remain submitted
	assert.Nil(t, capturedSubmittedTrade.Error)                 // No error from polling timeout itself
	assert.False(t, capturedSubmittedTrade.Finalized)
	assert.Nil(t, capturedSubmittedTrade.CompletedAt)

	// Verify all mocks were called as expected.
	// Important: No further "Update" calls should have been made after the "submitted" one for this test case.
	// The AssertExpectations on mockTradeRepo will fail if an unexpected Update was called.
	mockChainClient.AssertExpectations(t)
	mockCoinService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}

func TestTransferConfirmationFails_PostSubmissionFailure(t *testing.T) {
	ctx := context.Background()
	service, mockChainClient, mockStore, _, mockTradeRepo, mockCoinService := setupWalletService(t)

	unsignedTxForLookup := "unsigned_tx_for_confirmation_failure"
	amount := 1.0
	expectedFeeSOL := float64(5000) / float64(solana.LAMPORTS_PER_SOL)

	// --- PrepareTransfer part (simplified) ---
	mockStore.On("Trades").Return(mockTradeRepo)
	mockCoinService.On("GetCoinByMintAddress", ctx, model.SolMint).Return(mockSOLCoin, nil).Once()
	mockChainClient.On("GetLatestBlockhash", ctx).Return(bmodel.Blockhash(solana.NewWallet().PublicKey.String()), nil).Once()

	var preparedTrade *model.Trade
	mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		preparedTrade = trade
		trade.ID = "trade_confirmation_failure"
		return trade.Fee == expectedFeeSOL
	})).Return(nil).Once()
	createdUnsignedTx, err := service.PrepareTransfer(ctx, testFromAddress, testToAddress, "", amount)
	assert.NoError(t, err)
	assert.NotNil(t, preparedTrade)
	preparedTrade.UnsignedTransaction = createdUnsignedTx

	// --- SubmitTransfer part ---
	dummyTx := solana.NewTransactionBuilder().Add(system.NewTransferInstruction(1, solana.SystemProgramID, solana.SystemProgramID).Build()).SetFeePayer(solana.SystemProgramID).SetRecentBlockHash(solana.Hash{}).MustBuild()
	txBytes, _ := dummyTx.MarshalBinary()
	signedTxBase64 := base64.StdEncoding.EncodeToString(txBytes)
	txSignature := bmodel.Signature("sig_for_confirmation_failure")
	confirmationError := errors.New("transaction executed but failed")

	req := &TransferRequest{
		UnsignedTransaction: preparedTrade.UnsignedTransaction,
		SignedTransaction:   signedTxBase64,
	}

	mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", preparedTrade.UnsignedTransaction).Return(preparedTrade, nil).Once()
	mockChainClient.On("SendRawTransaction", ctx, txBytes, mock.AnythingOfType("bmodel.TransactionOptions")).Return(txSignature, nil).Once()

	// First Update to "submitted"
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		return trade.ID == preparedTrade.ID && trade.Status == "submitted" && trade.TransactionHash == string(txSignature)
	})).Return(nil).Once()

	// GetTransactionStatus returns failure
	mockChainClient.On("GetTransactionStatus", ctx, txSignature).Return(&bmodel.TransactionStatus{Confirmed: false, Failed: true, Err: confirmationError}, nil).Once()

	// Second Update to "failed"
	var capturedFailedTrade *model.Trade
	mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
		capturedFailedTrade = trade
		return trade.ID == preparedTrade.ID &&
			trade.Status == "failed" &&
			trade.Error != nil && strings.Contains(*trade.Error, confirmationError.Error())
	})).Return(nil).Once()

	finalSigStr, err := service.SubmitTransfer(ctx, req)
	assert.NoError(t, err) // SubmitTransfer itself does not error here
	assert.Equal(t, string(txSignature), finalSigStr)

	assert.NotNil(t, capturedFailedTrade)
	assert.Equal(t, "failed", capturedFailedTrade.Status)
	assert.NotNil(t, capturedFailedTrade.Error)
	assert.Contains(t, *capturedFailedTrade.Error, confirmationError.Error())
	assert.False(t, capturedFailedTrade.Finalized)
	assert.Nil(t, capturedFailedTrade.CompletedAt)

	mockChainClient.AssertExpectations(t)
	mockCoinService.AssertExpectations(t)
	mockStore.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
}
