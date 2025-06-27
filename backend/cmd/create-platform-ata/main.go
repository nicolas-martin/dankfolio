package main

import (
	"context"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/jsonrpc"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/util"
)

const (
	// Platform account (fee collector)
	platformPrivKey = "5BbOlNWBgaSJ3/2UhTVED7WbUlLAbMdqpWAAKtq4v6yUC10YbOnl0iBEH0ICJ4dWsCcs3yMhiCr85BS6SAIpnA=="
	platformAddress = "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"
)

var (
	mintFlag = flag.String("mint", "", "Token mint address to create ATA for (required)")
	checkOnly = flag.Bool("check", false, "Only check if ATA exists, don't create")
)

type Config struct {
	SolanaRPCEndpoint string `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey   string `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	DBURL             string `envconfig:"DB_URL" required:"true"`
	Env               string `envconfig:"APP_ENV" required:"true"`
}

func main() {
	flag.Parse()

	if *mintFlag == "" {
		flag.Usage()
		log.Fatal("--mint flag is required")
	}

	// Set up logging
	handler := logger.NewColorHandler(slog.LevelInfo, os.Stdout, os.Stderr)
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

	ctx := context.Background()

	// Parse platform key
	platformKey, err := parsePrivateKey(platformPrivKey)
	if err != nil {
		log.Fatalf("Failed to parse platform private key: %v", err)
	}

	platformPubKey, err := solanago.PublicKeyFromBase58(platformAddress)
	if err != nil {
		log.Fatalf("Failed to parse platform address: %v", err)
	}

	// Parse mint
	mintPubKey, err := solanago.PublicKeyFromBase58(*mintFlag)
	if err != nil {
		log.Fatalf("Invalid mint address: %v", err)
	}

	// Create ATA manager
	ataManager := util.NewATAManager(solanaClient, solClient)

	// Calculate ATA
	ata, err := util.CalculateATA(platformPubKey, mintPubKey)
	if err != nil {
		log.Fatalf("Failed to calculate ATA: %v", err)
	}

	slog.Info("Platform ATA Information",
		"platform_account", platformAddress,
		"mint", *mintFlag,
		"ata", ata.String())

	// Check if ATA exists
	exists := ataManager.ATAExists(ctx, ata)
	
	if exists {
		slog.Info("✅ ATA already exists", "ata", ata.String())
		if *checkOnly {
			os.Exit(0)
		}
		return
	}

	slog.Info("❌ ATA does not exist", "ata", ata.String())
	
	if *checkOnly {
		os.Exit(1)
	}

	// Create ATA
	slog.Info("Creating platform ATA...")
	
	_, created, err := ataManager.EnsureATA(ctx, platformPubKey, mintPubKey, platformKey)
	if err != nil {
		log.Fatalf("Failed to create ATA: %v", err)
	}

	if created {
		slog.Info("✅ ATA created successfully!", "ata", ata.String())
	} else {
		slog.Info("ATA already existed", "ata", ata.String())
	}

	// Get token metadata to show more info
	metadata, err := solanaClient.GetTokenMetadata(ctx, bmodel.Address(*mintFlag))
	if err == nil && metadata != nil {
		slog.Info("Token information",
			"symbol", metadata.Symbol,
			"name", metadata.Name,
			"decimals", metadata.Decimals)
	}
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