package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/jsonrpc"
	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	tracker "github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/model"
	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/otel"

	// "github.com/nicolas-martin/dankfolio/backend/internal/db/postgres/schema" // Not directly needed for count if repo has Count
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"

	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

var populateNaughtyWords = flag.Bool("populate-naughty-words", false, "If set, fetches the naughty word list and populates the database.")

func main() {
	flag.Parse()
	logLevel := slog.LevelInfo
	var handler slog.Handler

	config := loadConfig()

	if config.Env != "development" {
		logLevel = slog.LevelInfo
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		handler = logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)
	}

	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	slog.Info("Configuration loaded successfully",
		slog.String("appEnv", config.Env),
		slog.Int("port", config.GRPCPort),
		slog.Duration("newCoinsFetchInterval", config.NewCoinsFetchInterval),
		slog.String("solanaRPCEndpoint", config.SolanaRPCEndpoint),
		slog.Int("platformFeeBps", config.PlatformFeeBps),
		slog.String("platformFeeAccountAddress", config.PlatformFeeAccountAddress),
	)

	ctx := context.Background()
	// Initialize Firebase with explicit project ID to match App Check token audience
	// The token has audiences: ["projects/7513481592181", "projects/dankfolio"]
	// We need to configure Firebase to accept either format
	firebaseConfig := &firebase.Config{
		ProjectID: "dankfolio", // Use string project ID as seen in one of the token's audiences
	}
	firebaseApp, err := firebase.NewApp(ctx, firebaseConfig)
	if err != nil {
		slog.Error("Failed to initialize Firebase Admin SDK", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("🔥 Firebase Admin SDK initialized successfully", "projectID", firebaseConfig.ProjectID)

	// Initialize Firebase App Check client
	appCheckClient, err := firebaseApp.AppCheck(ctx)
	if err != nil {
		slog.Error("Failed to initialize Firebase App Check client", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("🔒 Firebase App Check client initialized successfully")

	if (config.Env == "development" || config.Env == "local" || config.Env == "production-simulator") && config.DevAppCheckToken == "" {
		log.Fatal("DEV_APP_CHECK_TOKEN is not set. This is required for development/local/production-simulator app check bypass.")
	} else if config.DevAppCheckToken != "" {
		slog.Info("DEV_APP_CHECK_TOKEN is set.", "env", config.Env)
	}

	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Create a separate HTTP client for Solana RPC calls with a longer timeout
	// since operations like GetTokenAccountsByOwner can be resource-intensive
	solanaHTTPClient := &http.Client{
		Timeout: time.Second * 30, // Longer timeout for Solana RPC calls
	}

	// Initialize database store first (required for APICallTracker)
	store, err := postgres.NewStore(config.DBURL, true, logLevel, config.Env)
	if err != nil {
		slog.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Database store initialized successfully.")

	// Initialize OpenTelemetry
	otelConfig := otel.Config{
		ServiceName:    "dankfolio-backend",
		ServiceVersion: "1.0.0",
		Environment:    config.Env,
		OTLPEndpoint:   config.OTLPEndpoint,
	}
	if otelConfig.OTLPEndpoint == "" {
		otelConfig.OTLPEndpoint = "localhost:4317" // Default OTLP gRPC endpoint
	}

	otelTelemetry, err := otel.InitTelemetry(ctx, otelConfig)
	if err != nil {
		slog.Error("Failed to initialize OpenTelemetry", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("OpenTelemetry initialized successfully", slog.String("endpoint", otelConfig.OTLPEndpoint))

	// Initialize APICallTracker with OpenTelemetry
	apiTracker, err := tracker.NewAPITracker(otelTelemetry)
	if err != nil {
		slog.Error("Failed to create API tracker", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("API Call Tracker initialized with OpenTelemetry.")

	// Now initialize all clients with the properly initialized apiTracker
	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey, apiTracker)

	birdeyeClient := birdeye.NewClient(httpClient, config.BirdEyeEndpoint, config.BirdEyeAPIKey, apiTracker)

	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}

	// Create Solana RPC client with custom HTTP client and longer timeout
	solClient := rpc.NewWithCustomRPCClient(jsonrpc.NewClientWithOpts(config.SolanaRPCEndpoint, &jsonrpc.RPCClientOpts{
		HTTPClient:    solanaHTTPClient,
		CustomHeaders: header,
	}))

	solanaClient := solana.NewClient(solClient, apiTracker)

	offchainClient := offchain.NewClient(httpClient, apiTracker)

	// No need to load stats or start background processing with OpenTelemetry

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:          config.BirdEyeEndpoint,
		BirdEyeAPIKey:           config.BirdEyeAPIKey,
		SolanaRPCEndpoint:       config.SolanaRPCEndpoint,
		NewCoinsFetchInterval:   config.NewCoinsFetchInterval,
		TrendingFetchInterval:   config.TrendingCoinsFetchInterval,
		TopGainersFetchInterval: config.TopGainersFetchInterval,
		InitializeXStocksOnStartup: config.InitializeXStocksOnStartup,
	}

	coinCache, err := coin.NewCoinCache()
	if err != nil {
		slog.Error("Failed to create coin cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Coin cache initialized successfully.")

	// Initialize coin service with all dependencies including cache
	coinService := coin.NewService(
		coinServiceConfig,
		jupiterClient,
		store,
		solanaClient,   // This is the chainClient
		birdeyeClient,  // This is the birdeyeClient
		apiTracker,     // Pass existing apiTracker
		offchainClient, // Pass existing offchainClient
		coinCache,      // Pass the initialized coinCache
	)
	slog.Info("Coin service initialized.")

	// Populate Naughty Words if the flag is set
	if *populateNaughtyWords {
		slog.Info("The --populate-naughty-words flag is set. Attempting to populate naughty words table...")
		go func() { // Keep this in a goroutine to avoid blocking startup for HTTP fetch
			ctx := context.Background()
			// Check if the table is empty first
			var count int64
			// Simplified check: Attempt to list one item. If error or empty, assume we can populate.
			_, total, listErr := coinService.GetStore().NaughtyWords().List(ctx, db.ListOptions{Limit: pint(1)})
			if listErr != nil {
				slog.ErrorContext(ctx, "Failed to check existing naughty words (error on list)", slog.Any("error", listErr))
				if !errors.Is(listErr, db.ErrNotFound) {
					return
				}
			}
			count = int64(total)

			if count == 0 {
				slog.InfoContext(ctx, "Naughty words table is empty (or was not found), proceeding with population from all languages.")

				// All available languages from the LDNOOBW repository
				languages := []struct {
					Code string
					Name string
				}{
					{"ar", "Arabic"},
					{"cs", "Czech"},
					{"da", "Danish"},
					{"de", "German"},
					{"en", "English"},
					{"eo", "Esperanto"},
					{"es", "Spanish"},
					{"fa", "Persian"},
					{"fi", "Finnish"},
					{"fil", "Filipino"},
					{"fr", "French"},
					{"fr-CA-u-sd-caqc", "Canadian French"},
					{"hi", "Hindi"},
					{"hu", "Hungarian"},
					{"it", "Italian"},
					{"ja", "Japanese"},
					{"kab", "Kabyle"},
					{"ko", "Korean"},
					{"nl", "Dutch"},
					{"no", "Norwegian"},
					{"pl", "Polish"},
					{"pt", "Portuguese"},
					{"ru", "Russian"},
					{"sv", "Swedish"},
					{"th", "Thai"},
					{"tlh", "Klingon"},
					{"tr", "Turkish"},
					{"zh", "Chinese"},
				}

				totalWordsAdded := 0
				totalWordsFetched := 0

				for _, lang := range languages {
					slog.InfoContext(ctx, "Downloading banned words", slog.String("language", lang.Name), slog.String("code", lang.Code))

					wordListURL := fmt.Sprintf("https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/%s", lang.Code)

					client := &http.Client{Timeout: 30 * time.Second}
					resp, httpErr := client.Get(wordListURL)
					if httpErr != nil {
						slog.WarnContext(ctx, "Failed to fetch word list for language", slog.String("language", lang.Name), slog.String("url", wordListURL), slog.Any("error", httpErr))
						continue
					}

					if resp.StatusCode != http.StatusOK {
						slog.WarnContext(ctx, "Failed to fetch word list, non-OK status", slog.String("language", lang.Name), slog.String("url", wordListURL), slog.Int("status_code", resp.StatusCode))
						resp.Body.Close()
						continue
					}

					scanner := bufio.NewScanner(resp.Body)
					var wordsToCreate []model.NaughtyWord
					for scanner.Scan() {
						word := strings.TrimSpace(scanner.Text())
						if word != "" && !strings.HasPrefix(word, "#") { // Skip comments
							wordsToCreate = append(wordsToCreate, model.NaughtyWord{
								Word:     word,
								Language: lang.Code,
							})
						}
					}
					resp.Body.Close()

					if scanErr := scanner.Err(); scanErr != nil {
						slog.WarnContext(ctx, "Error reading word list", slog.String("language", lang.Name), slog.Any("error", scanErr))
						continue
					}

					// Create words for this language
					languageWordsAdded := 0
					for _, nw := range wordsToCreate {
						createCtx, cancelCreate := context.WithTimeout(ctx, 5*time.Second)

						createErr := coinService.GetStore().NaughtyWords().Create(createCtx, &nw)
						if createErr != nil {
							slog.DebugContext(createCtx, "Failed to create word entry (may already exist)", slog.String("word", nw.Word), slog.String("language", nw.Language), slog.Any("error", createErr))
						} else {
							languageWordsAdded++
						}
						cancelCreate()
					}

					totalWordsFetched += len(wordsToCreate)
					totalWordsAdded += languageWordsAdded

					slog.InfoContext(ctx, "Completed language",
						slog.String("language", lang.Name),
						slog.Int("words_fetched", len(wordsToCreate)),
						slog.Int("words_added", languageWordsAdded))

					// Small delay between requests to be respectful
					time.Sleep(100 * time.Millisecond)
				}

				slog.InfoContext(ctx, "Finished populating naughty words table from all languages.",
					slog.Int("total_words_added", totalWordsAdded),
					slog.Int("total_words_fetched", totalWordsFetched),
					slog.Int("languages_processed", len(languages)))

				if reloadErr := coinService.LoadNaughtyWords(ctx); reloadErr != nil {
					slog.ErrorContext(ctx, "Failed to reload naughty words in CoinService after populating table", slog.Any("error", reloadErr))
				} else {
					slog.InfoContext(ctx, "CoinService naughty words reloaded successfully after table population.")
				}
			} else {
				slog.InfoContext(ctx, "Naughty words table is not empty, skipping population.", slog.Int64("existing_word_count", count))
			}
		}()
	} else {
		slog.Info("The --populate-naughty-words flag is not set. Skipping DB population of naughty words.")
	}

	priceCache, err := price.NewPriceHistoryCache()
	if err != nil {
		slog.Error("Failed to create price cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Price cache initialized successfully.")

	priceService := price.NewService(birdeyeClient, jupiterClient, store, priceCache)

	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
		config.PlatformFeeBps,
		config.PlatformFeeAccountAddress,
		config.PlatformPrivateKey,
	)

	walletService := wallet.New(solanaClient, store, coinService)

	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher)

	grpcServer := grpcapi.NewServer(
		coinService,
		walletService,
		tradeService,
		priceService,
		utilitySvc,
		appCheckClient,
		config.Env,
		config.DevAppCheckToken,
	)
	// Set OpenTelemetry tracer and meter
	grpcServer.SetOtel(otelTelemetry.Tracer, otelTelemetry.Meter)

	slog.Debug("Debug message")
	slog.Info("Info message")
	slog.Warn("Warning message")
	slog.Error("Error message")

	// Start gRPC server
	go func() {
		slog.Info("Starting gRPC server", slog.Int("port", config.GRPCPort))
		if err := grpcServer.Start(config.GRPCPort); err != nil {
			slog.Error("gRPC server error", slog.Any("error", err))
			// Consider if os.Exit(1) is appropriate in a goroutine,
			// might need channel to signal main goroutine for shutdown.
			// For now, this matches previous log.Fatalf behavior.
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit // Block until a signal is received
	slog.Info("Received shutdown signal", slog.String("signal", sig.String()))

	slog.Info("Shutting down OpenTelemetry...")
	if err := otelTelemetry.Shutdown(ctx); err != nil {
		slog.Error("Failed to shutdown OpenTelemetry", slog.Any("error", err))
	}

	slog.Info("Stopping gRPC server...")
	grpcServer.Stop()
	slog.Info("gRPC server stopped.")

	// Add any other cleanup tasks here, e.g., closing DB connection if store had a Close() method.
	// if err := store.Close(); err != nil {
	// 	slog.Error("Failed to close database store", slog.Any("error", err))
	// } else {
	// 	slog.Info("Database store closed.")
	// }

	slog.Info("Server shutdown completed.")
}

// Helper function to get a pointer to an int.
func pint(i int) *int {
	return &i
}

type Config struct {
	SolanaRPCEndpoint          string        `envconfig:"SOLANA_RPC_ENDPOINT" default:"https://api.mainnet-beta.solana.com"`
	SolanaRPCAPIKey            string        `envconfig:"SOLANA_RPC_API_KEY" required:"true"`
	BirdEyeEndpoint            string        `envconfig:"BIRDEYE_ENDPOINT" required:"true"`
	BirdEyeAPIKey              string        `envconfig:"BIRDEYE_API_KEY" required:"true"`
	GRPCPort                   int           `envconfig:"GRPC_PORT" default:"9000"`
	DBURL                      string        `envconfig:"DB_URL" required:"true"`
	JupiterApiKey              string        `envconfig:"JUPITER_API_KEY"`
	JupiterApiUrl              string        `envconfig:"JUPITER_API_URL" required:"true"`
	Env                        string        `envconfig:"APP_ENV" required:"true"`
	NewCoinsFetchInterval      time.Duration `envconfig:"NEW_COINS_FETCH_INTERVAL" required:"true"`
	TrendingCoinsFetchInterval time.Duration `envconfig:"TRENDING_COINS_FETCH_INTERVAL" required:"true"`
	TopGainersFetchInterval    time.Duration `envconfig:"TOP_GAINERS_FETCH_INTERVAL" required:"true"`
	PlatformFeeBps             int           `envconfig:"PLATFORM_FEE_BPS" required:"true"`             // Basis points for platform fee, e.g., 100 = 1%
	PlatformFeeAccountAddress  string        `envconfig:"PLATFORM_FEE_ACCOUNT_ADDRESS" required:"true"` // Conditionally required, handled in validation
	PlatformPrivateKey         string        `envconfig:"PLATFORM_PRIVATE_KEY"`                         // Base64 encoded private key for platform account
	DevAppCheckToken           string        `envconfig:"DEV_APP_CHECK_TOKEN"`
	InitializeXStocksOnStartup bool          `envconfig:"INITIALIZE_XSTOCKS_ON_STARTUP" default:"false"`
	OTLPEndpoint               string        `envconfig:"OTLP_ENDPOINT" default:"localhost:4317"`
}

func loadConfig() *Config {
	// Load environment variables from .env file in development
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
	}

	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		log.Fatalf("Error processing environment variables: %v", err)
	}

	return &cfg
}
