package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	solanago "github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/jsonrpc"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"

	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	bmodel "github.com/nicolas-martin/dankfolio/backend/internal/model/blockchain"
)

const (
	ownerAddress = "GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R"
	mintAddress  = "So11111111111111111111111111111111111111112"
	// Platform account and the ATA that was just created
	platformAddress = "AxuPakGELZ17KYvDzTCqgDaQZV1a6hSMuRyeJSzXs4mh"
	maskMint = "6MQpbiTC2YcogidTmKqMLK82qvE9z5QEm7EP3AEDpump"
)

type Config struct {
	SolanaRPCEndpoint string `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey   string `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	DBURL             string `envconfig:"DB_URL" required:"true"`
	Env               string `envconfig:"APP_ENV" required:"true"`
}

func main() {
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

	// Parse hardcoded owner address
	ownerPubKey, err := solanago.PublicKeyFromBase58(ownerAddress)
	if err != nil {
		log.Fatalf("Invalid owner address: %v", err)
	}

	fmt.Printf("Fetching all token accounts for owner: %s\n\n", ownerAddress)

	// Get all token accounts for the owner
	tokenAccounts, err := solanaClient.GetTokenAccountsByOwner(ctx, bmodel.Address(ownerAddress), bmodel.TokenAccountsOptions{
		Encoding: "jsonParsed",
	})
	if err != nil {
		log.Fatalf("Failed to get token accounts: %v", err)
	}

	if len(tokenAccounts) == 0 {
		fmt.Println("No token accounts found for this owner.")
		return
	}

	fmt.Printf("Found %d token accounts:\n\n", len(tokenAccounts))

	// Print header
	fmt.Printf("%-44s | %-50s | %-12s | %s\n",
		"ATA Address", "Token", "Balance", "Decimals")
	fmt.Println(strings.Repeat("-", 120))

	// Add rows for each token account
	for _, account := range tokenAccounts {
		// Get token metadata to potentially show symbol
		metadata, err := solanaClient.GetTokenMetadata(ctx, account.MintAddress)
		
		// Format token display with symbol first if available
		tokenDisplay := ""
		if err == nil && metadata.Symbol != "" {
			tokenDisplay = fmt.Sprintf("%-6s %s", strings.TrimSpace(metadata.Symbol), string(account.MintAddress))
		} else {
			tokenDisplay = string(account.MintAddress)
		}
		if len(tokenDisplay) > 50 {
			tokenDisplay = tokenDisplay[:47] + "..."
		}

		// Only show non-zero balances
		if account.UIAmount > 0 || true { // Show all for now
			fmt.Printf("%-44s | %-50s | %12.6f | %d\n",
				string(account.Address),
				tokenDisplay,
				account.UIAmount,
				account.Decimals,
			)
		}
	}

	// Also check the specific SOL ATA we were looking for
	fmt.Printf("\nSpecific SOL ATA Check:\n")
	mintPubKey, err := solanago.PublicKeyFromBase58(mintAddress)
	if err != nil {
		log.Fatalf("Invalid mint address: %v", err)
	}

	hasATA, err := HasATA(ctx, solanaClient, ownerPubKey, mintPubKey)
	if err != nil {
		log.Fatalf("Error checking SOL ATA: %v", err)
	}

	ataAddress, _, err := solanago.FindAssociatedTokenAddress(ownerPubKey, mintPubKey)
	if err != nil {
		log.Fatalf("Failed to calculate SOL ATA address: %v", err)
	}

	if hasATA {
		fmt.Printf("✅ SOL ATA exists: %s\n", ataAddress.String())
	} else {
		fmt.Printf("❌ SOL ATA does not exist: %s\n", ataAddress.String())
	}

	// Check platform's MASK ATA that was just created
	fmt.Printf("\nPlatform MASK ATA Check (from swap failure):\n")
	platformPubKey, err := solanago.PublicKeyFromBase58(platformAddress)
	if err != nil {
		log.Fatalf("Invalid platform address: %v", err)
	}

	maskMintPubKey, err := solanago.PublicKeyFromBase58(maskMint)
	if err != nil {
		log.Fatalf("Invalid mask mint address: %v", err)
	}

	hasPlatformMaskATA, err := HasATA(ctx, solanaClient, platformPubKey, maskMintPubKey)
	if err != nil {
		log.Fatalf("Error checking platform MASK ATA: %v", err)
	}

	platformMaskATA, _, err := solanago.FindAssociatedTokenAddress(platformPubKey, maskMintPubKey)
	if err != nil {
		log.Fatalf("Failed to calculate platform MASK ATA address: %v", err)
	}

	if hasPlatformMaskATA {
		fmt.Printf("✅ Platform MASK ATA exists: %s\n", platformMaskATA.String())
		
		// Get the account info to check if it's properly initialized
		accountInfo, err := solanaClient.GetAccountInfo(ctx, bmodel.Address(platformMaskATA.String()))
		if err != nil {
			fmt.Printf("   ⚠️  Failed to get account info: %v\n", err)
		} else if accountInfo != nil {
			fmt.Printf("   📊 Account info: Owner=%s, Lamports=%d, DataLen=%d\n", 
				accountInfo.Owner, accountInfo.Lamports, len(accountInfo.Data))
		}
	} else {
		fmt.Printf("❌ Platform MASK ATA does not exist: %s\n", platformMaskATA.String())
	}
}

// HasATA returns true if the ATA for (owner, mint) exists
// This follows the same pattern as the trade service ataExists method
func HasATA(
	ctx context.Context,
	client clients.GenericClientAPI,
	owner solanago.PublicKey,
	mint solanago.PublicKey,
) (bool, error) {
	// Derive the ATA address
	ataAddress, _, err := solanago.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return false, fmt.Errorf("failed to calculate ATA address: %w", err)
	}

	// Get account info using the project's pattern
	accountInfo, err := client.GetAccountInfo(ctx, bmodel.Address(ataAddress.String()))
	if err != nil {
		slog.Debug("Failed to get ATA account info", "ata", ataAddress.String(), "error", err)
		return false, nil
	}

	// Account exists if it's not nil and not owned by the system program (uninitialized)
	// This matches the exact logic from trade/service.go:1031
	systemProgram := bmodel.Address(solanago.SystemProgramID.String())
	return accountInfo != nil && accountInfo.Owner != systemProgram, nil
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

