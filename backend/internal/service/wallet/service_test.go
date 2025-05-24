package wallet

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/rpc"
	solanaClientMocks "github.com/nicolas-martin/dankfolio/backend/internal/clients/solana/mocks"
	dbMocks "github.com/nicolas-martin/dankfolio/backend/internal/db/mocks"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tyler-smith/go-bip39"
)

// setupWalletService helper function
func setupWalletService(t *testing.T) (
	*Service,
	*solanaClientMocks.SolanaRPCClientAPI,
	*dbMocks.MockStore,
	*dbMocks.MockRepository[model.Wallet],
	*dbMocks.MockRepository[model.Trade],
) {
	mockRPCClient := solanaClientMocks.NewSolanaRPCClientAPI(t)
	mockStore := dbMocks.NewMockStore(t)
	mockWalletRepo := dbMocks.NewMockRepository[model.Wallet](t)
	mockTradeRepo := dbMocks.NewMockRepository[model.Trade](t)

	service := New(mockRPCClient, mockStore)

	return service, mockRPCClient, mockStore, mockWalletRepo, mockTradeRepo
}

func TestCreateWallet(t *testing.T) {
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		service, _, mockStore, mockWalletRepo, _ := setupWalletService(t)

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
		service, _, mockStore, mockWalletRepo, _ := setupWalletService(t)

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
		service, mockRPCClient, _, _, _ := setupWalletService(t)

		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 2 * solana.LAMPORTS_PER_SOL}, nil).Once()

		tokenAccountsResult := &rpc.GetTokenAccountsResult{
			Value: []*rpc.TokenAccount{
				{
					Account: rpc.Account{
						Data: rpc.DataJSON(json.RawMessage(`{"parsed":{"info":{"mint":"tokenMint1","tokenAmount":{"uiAmount":10.5}}},"program":"spl-token","space":165}`)),
					},
					Pubkey: solana.MustPublicKeyFromBase58("ataForTokenMint1"),
				},
				{
					Account: rpc.Account{
						Data: rpc.DataJSON(json.RawMessage(`{"parsed":{"info":{"mint":"tokenMint2","tokenAmount":{"uiAmount":0.0}}},"program":"spl-token","space":165}`)),
					},
					Pubkey: solana.MustPublicKeyFromBase58("ataForTokenMint2"),
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
			if b.ID == model.SolMint {
				assert.Equal(t, 2.0, b.Amount)
				foundSOL = true
			} else if b.ID == "tokenMint1" {
				assert.Equal(t, 10.5, b.Amount)
				foundToken1 = true
			}
		}
		assert.True(t, foundSOL, "SOL balance not found")
		assert.True(t, foundToken1, "Token1 balance not found")
	})

	t.Run("Success with only token balances (SOL is zero)", func(t *testing.T) {
		service, mockRPCClient, _, _, _ := setupWalletService(t)

		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 0}, nil).Once()
		tokenAccountsResult := &rpc.GetTokenAccountsResult{
			Value: []*rpc.TokenAccount{
				{Account: rpc.Account{Data: rpc.DataJSON(json.RawMessage(`{"parsed":{"info":{"mint":"tokenMint1","tokenAmount":{"uiAmount":5.0}}},"program":"spl-token","space":165}`))}, Pubkey: solana.MustPublicKeyFromBase58("ata1")},
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
		service, _, _, _, _ := setupWalletService(t)
		_, err := service.GetWalletBalances(ctx, "invalidAddress")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid address")
	})

	t.Run("Error GetBalance fails", func(t *testing.T) {
		service, mockRPCClient, _, _, _ := setupWalletService(t)
		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(nil, errors.New("rpc getbalance error")).Once()

		_, err := service.GetWalletBalances(ctx, testAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get SOL balance: rpc getbalance error")
	})

	t.Run("Error GetTokenAccountsByOwner fails", func(t *testing.T) {
		service, mockRPCClient, _, _, _ := setupWalletService(t)
		mockRPCClient.On("GetBalance", ctx, testPubKey, rpc.CommitmentConfirmed).Return(&rpc.GetBalanceResult{Value: 1000}, nil).Once()
		mockRPCClient.On("GetTokenAccountsByOwner", ctx, testPubKey, mock.Anything, mock.Anything).Return(nil, errors.New("rpc gettokens error")).Once()

		_, err := service.GetWalletBalances(ctx, testAddress)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get token balances: rpc gettokens error")
	})
}

func TestPrepareTransfer(t *testing.T) {
	ctx := context.Background()
	fromAddress := "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	toAddress := "So11111111111111111111111111111111111111112"
	coinMintSOL := ""
	splTokenMint := "Es9vMFrzaCERmJfrF4H2FYQGqPSHhpNgLcbXchH7aG4u"
	amount := 1.5

	latestBlockhashResult := &rpc.GetLatestBlockhashResult{Value: rpc.BlockhashResult{Blockhash: solana.MustHashFromBase58("GH3w5N9WpGdn9c7sR8vV1mB9stH3sA63KqZ1xYgH8WbK")}}
	fromPubKey, _ := solana.PublicKeyFromBase58(fromAddress)
	splMintKey, _ := solana.PublicKeyFromBase58(splTokenMint)

	t.Run("Success SOL Transfer", func(t *testing.T) {
		service, mockRPCClient, mockStore, _, mockTradeRepo := setupWalletService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		mockRPCClient.On("GetLatestBlockhash", ctx, rpc.CommitmentConfirmed).Return(latestBlockhashResult, nil).Once()
		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Type == "transfer" && trade.FromCoinID == "" && trade.Status == "pending" && trade.Amount == amount
		})).Return(nil).Once()

		unsignedTx, err := service.PrepareTransfer(ctx, fromAddress, toAddress, coinMintSOL, amount)
		assert.NoError(t, err)
		assert.NotEmpty(t, unsignedTx)
		txBytes, err := base64.StdEncoding.DecodeString(unsignedTx)
		assert.NoError(t, err)
		_, err = solana.TransactionFromBytes(txBytes)
		assert.NoError(t, err)
	})

	t.Run("Success SPL Token Transfer - ATA for receiver exists", func(t *testing.T) {
		service, mockRPCClient, mockStore, _, mockTradeRepo := setupWalletService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Once()

		fromAta, _, _ := solana.FindAssociatedTokenAddress(fromPubKey, splMintKey)
		mockRPCClient.On("GetAccountInfo", ctx, fromAta).Return(&rpc.GetAccountInfoResult{Value: &rpc.Account{Owner: solana.TokenProgramID}}, nil).Once()

		toPubKey, _ := solana.PublicKeyFromBase58(toAddress)
		toAta, _, _ := solana.FindAssociatedTokenAddress(toPubKey, splMintKey)
		mockRPCClient.On("GetAccountInfo", ctx, toAta).Return(&rpc.GetAccountInfoResult{Value: &rpc.Account{Owner: solana.TokenProgramID}}, nil).Once()

		mintAccountData := make([]byte, 82) 
		mintAccountData[44] = 6      
		mockRPCClient.On("GetAccountInfo", ctx, splMintKey).Return(&rpc.GetAccountInfoResult{Value: &rpc.Account{Data: rpc.DataBytes(mintAccountData)}}, nil).Once()

		mockRPCClient.On("GetLatestBlockhash", ctx, rpc.CommitmentConfirmed).Return(latestBlockhashResult, nil).Once()
		mockTradeRepo.On("Create", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.Type == "transfer" && trade.FromCoinID == splTokenMint && trade.Status == "pending"
		})).Return(nil).Once()

		unsignedTx, err := service.PrepareTransfer(ctx, fromAddress, toAddress, splTokenMint, amount)
		assert.NoError(t, err)
		assert.NotEmpty(t, unsignedTx)
	})
}

func TestSubmitTransfer(t *testing.T) {
	ctx := context.Background()
	unsignedTxForLookup := "unsigned_tx_for_lookup_in_db"

	dummyKey := solana.NewWallet().PrivateKey.PublicKey()
	dummyBlockHash := solana.MustHashFromBase58("GH3w5N9WpGdn9c7sR8vV1mB9stH3sA63KqZ1xYgH8WbK")
	txForEncoding, _ := solana.NewTransaction([]solana.Instruction{system.NewTransferInstruction(1, dummyKey, dummyKey).Build()}, dummyBlockHash, solana.TransactionPayer(dummyKey))
	txBytesForEncoding, _ := txForEncoding.MarshalBinary()
	signedTx := base64.StdEncoding.EncodeToString(txBytesForEncoding)

	expectedTxSig := solana.MustSignatureFromBase58("5sig8zXVH7z4uTz2gC711w7xYyqAMX7fGj4z6rY1iJq7x8kH9hZ7vP5nQ2mYwX8aBcX3zH5k")

	req := &TransferRequest{
		UnsignedTransaction: unsignedTxForLookup,
		SignedTransaction:   signedTx,
	}

	existingTrade := &model.Trade{ID: "trade123", UnsignedTransaction: unsignedTxForLookup}

	t.Run("Success", func(t *testing.T) {
		service, mockRPCClient, mockStore, _, mockTradeRepo := setupWalletService(t)
		mockStore.On("Trades").Return(mockTradeRepo).Times(2)

		mockRPCClient.On("SendTransactionWithOpts", ctx, mock.AnythingOfType("*solana.Transaction"), mock.AnythingOfType("rpc.TransactionOpts")).Return(expectedTxSig, nil).Once()
		mockTradeRepo.On("GetByField", ctx, "unsigned_transaction", unsignedTxForLookup).Return(existingTrade, nil).Once()
		mockTradeRepo.On("Update", ctx, mock.MatchedBy(func(trade *model.Trade) bool {
			return trade.ID == existingTrade.ID && trade.Status == "finalized" && trade.TransactionHash == expectedTxSig.String() && trade.Finalized
		})).Return(nil).Once()

		sig, err := service.SubmitTransfer(ctx, req)
		assert.NoError(t, err)
		assert.Equal(t, expectedTxSig.String(), sig)
	})
}
