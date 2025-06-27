package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	solanago "github.com/gagliardetto/solana-go"
	associatedtokenaccount "github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/jsonrpc"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

const (
	// Platform account (fee collector)
	platformPrivKey = "5BbOlNWBgaSJ3/2UhTVED7WbUlLAbMdqpWAAKtq4v6yUC10YbOnl0iBEH0ICJ4dWsCcs3yMhiCr85BS6SAIpnA=="
	platformAddress = "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"

	// Test wallet for swapping
	testPrivKey = "RoNFdBnz9O7ZWouUInKpvmYhlZivoUJxGM7eb6rkGz3pAnf0tR1fLcZsinyAFilsbMA7lFi1Ko2WHOj22jSYAg=="
	testAddress = "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"

	// Tokens
	wsolMint  = "So11111111111111111111111111111111111111112"  // Wrapped SOL
	coin1Mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC (has 0.067008)
	coin2Mint = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" // $WIF (has 3.098789)

	// Swap parameters
	slippageBps    = 50  // 0.5%
	platformFeeBps = 100 // 1%
)

type Config struct {
	SolanaRPCEndpoint string `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey   string `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	JupiterAPIURL     string `envconfig:"JUPITER_API_URL" default:"https://api.jup.ag"`
	JupiterAPIKey     string `envconfig:"JUPITER_API_KEY"`
	DBURL             string `envconfig:"DB_URL" required:"true"`
	Env               string `envconfig:"APP_ENV" required:"true"`
}

type SwapTest struct {
	Name            string
	InputMint       string
	OutputMint      string
	Amount          string
	ExpectedFeeMint string
	Description     string
}

func main() {
	// Set up logging
	handler := logger.NewColorHandler(slog.LevelDebug, os.Stdout, os.Stderr)
	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	// Load config
	config := loadConfig()

	// Initialize database store for API tracker
	store, err := postgres.NewStore(config.DBURL, true, slog.LevelDebug, config.Env)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize API tracker
	apiTracker := tracker.NewAPICallTracker(store, slogger)

	// Create Solana client
	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}

	solanaHTTPClient := &http.Client{Timeout: time.Second * 30}
	solClient := rpc.NewWithCustomRPCClient(jsonrpc.NewClientWithOpts(config.SolanaRPCEndpoint, &jsonrpc.RPCClientOpts{
		HTTPClient:    solanaHTTPClient,
		CustomHeaders: header,
	}))

	solanaClient := solana.NewClient(solClient, apiTracker)

	// Create Jupiter client
	jupiterHTTPClient := &http.Client{Timeout: time.Second * 30}
	jupiterClient := jupiter.NewClient(jupiterHTTPClient, config.JupiterAPIURL, config.JupiterAPIKey, apiTracker)

	ctx := context.Background()

	// Parse keys
	platformKey, err := parsePrivateKey(platformPrivKey)
	if err != nil {
		log.Fatalf("Failed to parse platform private key: %v", err)
	}

	testKey, err := parsePrivateKey(testPrivKey)
	if err != nil {
		log.Fatalf("Failed to parse test private key: %v", err)
	}

	platformPubKey, err := solanago.PublicKeyFromBase58(platformAddress)
	if err != nil {
		log.Fatalf("Failed to parse platform address: %v", err)
	}

	testPubKey, err := solanago.PublicKeyFromBase58(testAddress)
	if err != nil {
		log.Fatalf("Failed to parse test address: %v", err)
	}

	// Define test scenarios
	swapTests := []SwapTest{
		{
			Name:            "Coin → WSOL",
			InputMint:       coin1Mint,
			OutputMint:      wsolMint,
			Amount:          "10000", // 0.01 USDC (6 decimals)
			ExpectedFeeMint: wsolMint,
			Description:     "Should collect fees in WSOL",
		},
		{
			Name:            "WSOL → Coin",
			InputMint:       wsolMint,
			OutputMint:      coin1Mint,
			Amount:          "1000000", // 0.001 SOL (9 decimals)
			ExpectedFeeMint: wsolMint,
			Description:     "Should collect fees in WSOL",
		},
		{
			Name:            "Coin1 → Coin2",
			InputMint:       coin1Mint,
			OutputMint:      coin2Mint,
			Amount:          "10000", // 0.01 USDC (6 decimals)
			ExpectedFeeMint: coin1Mint, // Could be either, but Jupiter typically chooses input
			Description:     "Should collect fees in one of the tokens",
		},
	}

	// Step 1: Ensure all required ATAs exist
	slog.Info("Step 1: Ensuring platform ATAs for all test mints...")

	allMints := []string{wsolMint, coin1Mint, coin2Mint}
	for _, mint := range allMints {
		if err := ensurePlatformATA(ctx, solanaClient, solClient, platformPubKey, platformKey, mint); err != nil {
			log.Fatalf("Failed to ensure platform ATA for %s: %v", mint, err)
		}
	}

	// Record initial balances
	slog.Info("Recording initial platform balances...")
	initialBalances := recordBalances(ctx, solanaClient, platformAddress)

	// Run each swap test
	for i, test := range swapTests {
		slog.Info(fmt.Sprintf("\n=== Test %d: %s ===", i+1, test.Name))
		slog.Info(test.Description)

		// Get quote
		slog.Info("Getting swap quote from Jupiter...")

		quoteParams := jupiter.QuoteParams{
			InputMint:      test.InputMint,
			OutputMint:     test.OutputMint,
			Amount:         test.Amount,
			SlippageBps:    slippageBps,
			PlatformFeeBps: platformFeeBps,
			SwapMode:       "ExactIn",
		}

		quote, err := jupiterClient.GetQuote(ctx, quoteParams)
		if err != nil {
			slog.Error("Failed to get quote", "test", test.Name, "error", err)
			continue
		}

		// Analyze quote to determine actual fee mint
		actualFeeMint := analyzeQuoteFeeMint(quote)
		slog.Info("Quote analysis",
			"input_amount", quote.InAmount,
			"output_amount", quote.OutAmount,
			"price_impact", quote.PriceImpactPct,
			"platform_fee", quote.PlatformFee,
			"actual_fee_mint", actualFeeMint)

		// Determine fee account ATA
		feeAccountATA := determineFeeAccountATA(platformPubKey, test.InputMint, test.OutputMint, actualFeeMint, quote.SwapMode)
		slog.Info("Using fee account ATA", "ata", feeAccountATA)

		// Create swap transaction
		slog.Info("Creating swap transaction...")
		swapResp, err := jupiterClient.CreateSwapTransaction(ctx, quote.RawPayload, testPubKey, feeAccountATA)
		if err != nil {
			slog.Error("Failed to create swap transaction", "test", test.Name, "error", err)
			continue
		}

		// Execute transactions
		if err := executeSwapTransactions(ctx, solClient, swapResp, testKey); err != nil {
			slog.Error("Failed to execute swap", "test", test.Name, "error", err)
			continue
		}

		// Brief pause between tests
		time.Sleep(3 * time.Second)
	}

	// Step 7: Verify fee collection
	slog.Info("\n=== Final Platform Balance Report ===")
	time.Sleep(2 * time.Second)

	finalBalances := recordBalances(ctx, solanaClient, platformAddress)

	// Compare balances
	slog.Info("\nFee Collection Summary:")
	for mint, finalBalance := range finalBalances {
		initialBalance := initialBalances[mint]
		if finalBalance > initialBalance {
			collected := finalBalance - initialBalance
			metadata, _ := solanaClient.GetTokenMetadata(ctx, bmodel.Address(mint))
			symbol := ""
			if metadata != nil && metadata.Symbol != "" {
				symbol = fmt.Sprintf(" (%s)", metadata.Symbol)
			}
			slog.Info("✅ Fees collected",
				"mint", mint+symbol,
				"amount", collected,
				"initial", initialBalance,
				"final", finalBalance)
		}
	}

	slog.Info("\n✅ Platform fee test completed successfully!")
}

func analyzeQuoteFeeMint(quote *jupiter.QuoteResponse) string {
	// Parse the raw quote to find the actual platform fee mint
	if quote.PlatformFee != nil {
		// Return the fee mint from the platform fee structure
		return quote.PlatformFee.FeeMint
	}

	// Fallback: analyze route fees
	if quote.RawPayload != nil {
		var rawQuote map[string]interface{}
		if err := json.Unmarshal(quote.RawPayload, &rawQuote); err == nil {
			if platformFee, ok := rawQuote["platformFee"].(map[string]interface{}); ok {
				if feeMint, ok := platformFee["feeMint"].(string); ok {
					return feeMint
				}
			}
		}
	}

	return ""
}

func determineFeeAccountATA(platformPubKey solanago.PublicKey, inputMint, outputMint, actualFeeMint, swapMode string) string {
	// If we know the actual fee mint from the quote, use it
	if actualFeeMint != "" {
		return calculateATA(platformPubKey, actualFeeMint)
	}

	// Otherwise use our logic based on swap type
	if swapMode == "ExactIn" || swapMode == "" {
		// For ExactIn, prefer WSOL if it's involved
		if outputMint == wsolMint {
			return calculateATA(platformPubKey, wsolMint)
		} else if inputMint == wsolMint {
			return calculateATA(platformPubKey, wsolMint)
		} else {
			// For token-to-token, use input mint
			return calculateATA(platformPubKey, inputMint)
		}
	} else {
		// For ExactOut, must use input mint
		return calculateATA(platformPubKey, inputMint)
	}
}

func executeSwapTransactions(ctx context.Context, client *rpc.Client, swapResp *jupiter.SwapResponse, signerKey solanago.PrivateKey) error {
	// Execute setup transaction if needed
	if swapResp.SetupTransaction != "" {
		slog.Info("Executing setup transaction...")
		sig, err := executeTransaction(ctx, client, swapResp.SetupTransaction, signerKey)
		if err != nil {
			return fmt.Errorf("setup transaction failed: %w", err)
		}
		slog.Info("Setup transaction sent", "signature", sig)
		waitForConfirmation(ctx, client, solanago.MustSignatureFromBase58(sig))
	}

	// Execute main swap transaction
	slog.Info("Executing swap transaction...")
	swapSig, err := executeTransaction(ctx, client, swapResp.SwapTransaction, signerKey)
	if err != nil {
		return fmt.Errorf("swap transaction failed: %w", err)
	}
	slog.Info("Swap transaction sent", "signature", swapSig, "explorer", fmt.Sprintf("https://solscan.io/tx/%s", swapSig))
	waitForConfirmation(ctx, client, solanago.MustSignatureFromBase58(swapSig))

	// Execute cleanup transaction if needed
	if swapResp.CleanupTransaction != "" {
		slog.Info("Executing cleanup transaction...")
		sig, err := executeTransaction(ctx, client, swapResp.CleanupTransaction, signerKey)
		if err != nil {
			return fmt.Errorf("cleanup transaction failed: %w", err)
		}
		slog.Info("Cleanup transaction sent", "signature", sig)
		waitForConfirmation(ctx, client, solanago.MustSignatureFromBase58(sig))
	}

	return nil
}

func recordBalances(ctx context.Context, client clients.GenericClientAPI, address string) map[string]float64 {
	balances := make(map[string]float64)

	tokenAccounts, err := client.GetTokenAccountsByOwner(ctx, bmodel.Address(address), bmodel.TokenAccountsOptions{
		Encoding: "jsonParsed",
	})
	if err != nil {
		slog.Error("Failed to get token accounts", "error", err)
		return balances
	}

	for _, account := range tokenAccounts {
		balances[string(account.MintAddress)] = account.UIAmount
	}

	return balances
}

func ensurePlatformATA(ctx context.Context, client clients.GenericClientAPI, solClient *rpc.Client, platformPubKey solanago.PublicKey, platformKey solanago.PrivateKey, mint string) error {
	mintPubKey, err := solanago.PublicKeyFromBase58(mint)
	if err != nil {
		return fmt.Errorf("invalid mint address: %w", err)
	}

	ata, _, err := solanago.FindAssociatedTokenAddress(platformPubKey, mintPubKey)
	if err != nil {
		return fmt.Errorf("failed to calculate ATA: %w", err)
	}

	// Check if ATA exists
	accountInfo, err := client.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	systemProgram := bmodel.Address(solanago.SystemProgramID.String())
	ataExists := err == nil && accountInfo != nil && accountInfo.Owner != systemProgram

	if ataExists {
		slog.Debug("✅ Platform ATA already exists", "mint", mint, "ata", ata.String())
		return nil
	}

	slog.Info("Creating platform ATA", "mint", mint, "ata", ata.String())

	// Create ATA
	instruction := associatedtokenaccount.NewCreateInstruction(
		platformPubKey, // payer
		platformPubKey, // wallet (owner)
		mintPubKey,     // mint
	).Build()

	recentBlockhash, err := client.GetLatestBlockhash(ctx)
	if err != nil {
		return fmt.Errorf("failed to get blockhash: %w", err)
	}

	blockhash, err := solanago.HashFromBase58(string(recentBlockhash))
	if err != nil {
		return fmt.Errorf("failed to parse blockhash: %w", err)
	}

	tx, err := solanago.NewTransaction(
		[]solanago.Instruction{instruction},
		blockhash,
		solanago.TransactionPayer(platformPubKey),
	)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	_, err = tx.Sign(func(key solanago.PublicKey) *solanago.PrivateKey {
		if key == platformPubKey {
			return &platformKey
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	txBytes, err := tx.MarshalBinary()
	if err != nil {
		return fmt.Errorf("failed to marshal transaction: %w", err)
	}

	sig, err := client.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
	})
	if err != nil {
		return fmt.Errorf("failed to send transaction: %w", err)
	}

	slog.Info("✅ ATA creation transaction sent", "signature", sig, "ata", ata.String())

	// Wait for confirmation
	waitForConfirmation(ctx, solClient, solanago.MustSignatureFromBase58(string(sig)))

	return nil
}

func calculateATA(owner solanago.PublicKey, mint string) string {
	mintPubKey, err := solanago.PublicKeyFromBase58(mint)
	if err != nil {
		return ""
	}
	ata, _, err := solanago.FindAssociatedTokenAddress(owner, mintPubKey)
	if err != nil {
		return ""
	}
	return ata.String()
}

func executeTransaction(ctx context.Context, client *rpc.Client, encodedTx string, signerKey solanago.PrivateKey) (string, error) {
	// Decode transaction
	txBytes, err := base64.StdEncoding.DecodeString(encodedTx)
	if err != nil {
		return "", fmt.Errorf("failed to decode transaction: %w", err)
	}

	tx, err := solanago.TransactionFromBytes(txBytes)
	if err != nil {
		return "", fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solanago.PublicKey) *solanago.PrivateKey {
		if key == signerKey.PublicKey() {
			return &signerKey
		}
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	sig, err := client.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	return sig.String(), nil
}

func waitForConfirmation(ctx context.Context, client *rpc.Client, sig solanago.Signature) {
	for i := 0; i < 30; i++ {
		time.Sleep(2 * time.Second)

		status, err := client.GetSignatureStatuses(ctx, true, sig)
		if err != nil {
			continue
		}

		if len(status.Value) > 0 && status.Value[0] != nil {
			if status.Value[0].ConfirmationStatus == rpc.ConfirmationStatusFinalized {
				slog.Debug("✅ Transaction finalized", "signature", sig.String())
				return
			} else if status.Value[0].Err != nil {
				slog.Error("❌ Transaction failed", "signature", sig.String(), "error", status.Value[0].Err)
				return
			}
		}
	}
	slog.Warn("Transaction confirmation timeout", "signature", sig.String())
}

func parsePrivateKey(base64Key string) (solanago.PrivateKey, error) {
	keyBytes, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return solanago.PrivateKey{}, fmt.Errorf("failed to decode base64: %w", err)
	}
	if len(keyBytes) != 64 {
		return solanago.PrivateKey{}, fmt.Errorf("invalid key length: got %d, expected 64", len(keyBytes))
	}
	return solanago.PrivateKey(keyBytes), nil
}

func loadConfig() *Config {
	envPaths := []string{
		".env",
		"../.env",
		"../../.env",
		"../../../.env",
	}

	envLoaded := false
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			slog.Debug("Loaded environment from", "path", path)
			envLoaded = true
			break
		}
	}

	if !envLoaded {
		slog.Warn("Could not load .env file from any location - ensure environment variables are set")
	}

	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		log.Fatalf("Error processing environment variables: %v", err)
	}

	return &cfg
}

