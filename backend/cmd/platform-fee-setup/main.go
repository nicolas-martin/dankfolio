package main

import (
	"context"
	"encoding/json"
	"flag"
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

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

var (
	createATA   = flag.Bool("create-ata", false, "Create the SOL ATA for the platform fee account")
	accountFlag = flag.String("account", "", "Platform fee account address (required)")
	privateKey  = flag.String("private-key", "", "Path to private key file (required for --create-ata)")
	checkOnly   = flag.Bool("check", false, "Only check if ATA exists, don't create")
	mintAddress = flag.String("mint", "So11111111111111111111111111111111111111112", "Mint address (defaults to SOL)")
)

type Config struct {
	SolanaRPCEndpoint string `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey   string `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	DBURL             string `envconfig:"DB_URL" required:"true"`
	Env               string `envconfig:"APP_ENV" required:"true"`
}

func main() {
	flag.Parse()

	// Set up logging
	handler := logger.NewColorHandler(slog.LevelDebug, os.Stdout, os.Stderr)
	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	if *accountFlag == "" {
		log.Fatal("--account flag is required")
	}

	if *createATA && *privateKey == "" {
		log.Fatal("--private-key flag is required when using --create-ata")
	}

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

	ctx := context.Background()

	// Parse account and mint addresses
	accountPubKey, err := solanago.PublicKeyFromBase58(*accountFlag)
	if err != nil {
		log.Fatalf("Invalid account address: %v", err)
	}

	mintPubKey, err := solanago.PublicKeyFromBase58(*mintAddress)
	if err != nil {
		log.Fatalf("Invalid mint address: %v", err)
	}

	// Calculate ATA address
	ata, _, err := solanago.FindAssociatedTokenAddress(accountPubKey, mintPubKey)
	if err != nil {
		log.Fatalf("Failed to calculate ATA address: %v", err)
	}

	slog.Info("Platform Fee Account ATA Information",
		"platform_account", accountPubKey.String(),
		"mint", mintPubKey.String(),
		"calculated_ata", ata.String())

	// Check if ATA exists
	accountInfo, err := solanaClient.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	ataExists := false
	if err != nil {
		slog.Warn("Failed to get ATA account info", "error", err)
	} else if accountInfo != nil {
		systemProgram := bmodel.Address(solanago.SystemProgramID.String())
		ataExists = accountInfo.Owner != systemProgram
	}

	if ataExists {
		slog.Info("✅ ATA already exists - no action needed", "ata", ata.String())
		if *checkOnly {
			os.Exit(0)
		}
	} else {
		slog.Warn("❌ ATA does not exist", "ata", ata.String())
		if *checkOnly {
			os.Exit(1)
		}
	}

	if !*createATA {
		slog.Info("Use --create-ata flag to create the ATA")
		return
	}

	if ataExists {
		slog.Info("ATA already exists, nothing to create")
		return
	}

	// Load private key
	privKey, err := loadPrivateKey(*privateKey)
	if err != nil {
		log.Fatalf("Failed to load private key: %v", err)
	}

	slog.Info("Creating ATA...", "ata", ata.String())

	// Create the ATA creation transaction
	instruction := associatedtokenaccount.NewCreateInstruction(
		accountPubKey, // payer
		accountPubKey, // wallet (owner)
		mintPubKey,    // mint
	).Build()

	// Get recent blockhash
	recentBlockhash, err := solanaClient.GetLatestBlockhash(ctx)
	if err != nil {
		log.Fatalf("Failed to get recent blockhash: %v", err)
	}

	// Build transaction
	blockhash, err := solanago.HashFromBase58(string(recentBlockhash))
	if err != nil {
		log.Fatalf("Failed to parse blockhash: %v", err)
	}
	
	tx, err := solanago.NewTransaction(
		[]solanago.Instruction{instruction},
		blockhash,
		solanago.TransactionPayer(accountPubKey),
	)
	if err != nil {
		log.Fatalf("Failed to create transaction: %v", err)
	}

	// Sign transaction
	_, err = tx.Sign(func(key solanago.PublicKey) *solanago.PrivateKey {
		if key == accountPubKey {
			return &privKey
		}
		return nil
	})
	if err != nil {
		log.Fatalf("Failed to sign transaction: %v", err)
	}

	// Send transaction
	txBytes, err := tx.MarshalBinary()
	if err != nil {
		log.Fatalf("Failed to marshal transaction: %v", err)
	}

	signature, err := solanaClient.SendRawTransaction(ctx, txBytes, bmodel.TransactionOptions{
		SkipPreflight:       false,
		PreflightCommitment: "confirmed",
	})
	if err != nil {
		log.Fatalf("Failed to send transaction: %v", err)
	}

	slog.Info("✅ ATA creation transaction sent successfully!",
		"signature", signature,
		"ata", ata.String(),
		"explorer", fmt.Sprintf("https://solscan.io/tx/%s", signature))

	slog.Info("Waiting for confirmation...")

	// Wait a moment and verify
	time.Sleep(3 * time.Second)

	accountInfo, err = solanaClient.GetAccountInfo(ctx, bmodel.Address(ata.String()))
	if err != nil {
		slog.Warn("Failed to verify ATA creation", "error", err)
	} else if accountInfo != nil {
		systemProgram := bmodel.Address(solanago.SystemProgramID.String())
		if accountInfo.Owner != systemProgram {
			slog.Info("✅ ATA creation confirmed - platform fee collection is now enabled!")
		} else {
			slog.Warn("❌ ATA verification failed - account may not be properly initialized")
		}
	}
}

func loadConfig() *Config {
	// Try to load .env file from multiple possible locations
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

func loadPrivateKey(filepath string) (solanago.PrivateKey, error) {
	data, err := os.ReadFile(filepath)
	if err != nil {
		return solanago.PrivateKey{}, fmt.Errorf("failed to read private key file: %w", err)
	}

	var keyBytes []byte
	if err := json.Unmarshal(data, &keyBytes); err != nil {
		return solanago.PrivateKey{}, fmt.Errorf("failed to parse private key JSON: %w", err)
	}

	if len(keyBytes) != 64 {
		return solanago.PrivateKey{}, fmt.Errorf("invalid private key length: got %d, expected 64", len(keyBytes))
	}

	return solanago.PrivateKey(keyBytes), nil
}

