package main

import (
	"bufio"
	"context"
	"errors"
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
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
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

	s3client "github.com/nicolas-martin/dankfolio/backend/internal/clients/s3"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/imageproxy"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/trademetrics"
)

func main() {
	logLevel := slog.LevelDebug
	var handler slog.Handler

	config := loadConfig()

	if config.Env != "development" {
		logLevel = slog.LevelInfo
		// Configure JSON handler with proper options for production
		jsonOpts := &slog.HandlerOptions{
			Level: logLevel,
			// Add source information for better debugging
			AddSource: false, // Set to true if you want file:line information
			// ReplaceAttr can be used to modify attributes before logging
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				// Ensure trace and span IDs are at the top level for easy Grafana querying
				if len(groups) == 0 && (a.Key == "trace_id" || a.Key == "span_id" || a.Key == "trace_sampled") {
					return a
				}
				return a
			},
		}
		handler = slog.NewJSONHandler(os.Stdout, jsonOpts)
	} else {
		handler = logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)
	}

	// Wrap the handler with OpenTelemetry support
	otelHandler := logger.NewOtelHandler(handler)
	slogger := slog.New(otelHandler)
	slog.SetDefault(slogger)

	slog.Info("Configuration loaded successfully",
		slog.String("appEnv", config.Env),
		slog.Int("port", config.GRPCPort),
		slog.Duration("newCoinsFetchInterval", config.NewCoinsFetchInterval),
		slog.Duration("trendingCoinsFetchInterval", config.TrendingCoinsFetchInterval),
		slog.Duration("topGainersFetchInterval", config.TopGainersFetchInterval),
		slog.String("solanaRPCEndpoint", config.SolanaRPCEndpoint),
		slog.Int("platformFeeBps", config.PlatformFeeBps),
		slog.String("platformFeeAccountAddress", config.PlatformFeeAccountAddress),
		slog.String("jupiterApiUrl", config.JupiterApiUrl),
		slog.String("BirdEyeEndpoint", config.BirdEyeEndpoint),
		slog.String("otlpEndpoint", config.OTLPEndpoint),
		slog.Bool("initializeXStocksOnStartup", config.InitializeXStocksOnStartup),
		slog.String("dbUrl", maskSensitiveURL(config.DBURL)),
		slog.Bool("jupiterApiKeySet", config.JupiterApiKey != ""),
		slog.Bool("birdEyeApiKeySet", config.BirdEyeAPIKey != ""),
		slog.Bool("solanaRPCApiKeySet", config.SolanaRPCAPIKey != ""),
		slog.Bool("platformPrivateKeySet", config.PlatformPrivateKey != ""),
		slog.Bool("devAppCheckTokenSet", config.DevAppCheckToken != ""),
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

	// Initialize OpenTelemetry (skip in development unless explicitly configured)
	var otelTelemetry *otel.Telemetry
	var apiTracker *tracker.APITracker

	if config.Env == "development" && config.OTLPEndpoint == "" {
		slog.Info("Skipping OpenTelemetry initialization in development environment")
		// Create a no-op telemetry for development
		otelTelemetry = otel.NewNoOpTelemetry("dankfolio-backend")
		apiTracker, err = tracker.NewAPITracker(otelTelemetry)
		if err != nil {
			slog.Error("Failed to create no-op API tracker", slog.Any("error", err))
			os.Exit(1)
		}
	} else {
		otelConfig := otel.Config{
			ServiceName:    "dankfolio-backend",
			ServiceVersion: "1.0.0",
			Environment:    config.Env,
			OTLPEndpoint:   config.OTLPEndpoint,
		}
		if otelConfig.OTLPEndpoint == "" {
			otelConfig.OTLPEndpoint = "localhost:4317" // Default OTLP gRPC endpoint
		}

		otelTelemetry, err = otel.InitTelemetry(ctx, otelConfig)
		if err != nil {
			slog.Error("Failed to initialize OpenTelemetry", slog.Any("error", err))
			os.Exit(1)
		}
		slog.Info("OpenTelemetry initialized successfully", slog.String("endpoint", otelConfig.OTLPEndpoint))

		apiTracker, err = tracker.NewAPITracker(otelTelemetry)
		if err != nil {
			slog.Error("Failed to create API tracker", slog.Any("error", err))
			os.Exit(1)
		}
	}

	slog.Info("API Call Tracker initialized.")

	// Now initialize all clients with the properly initialized apiTracker
	jupiterWrappedHTTP := clients.WrapHTTPClient(httpClient, "jupiter", apiTracker)
	jupiterClient := jupiter.NewClient(jupiterWrappedHTTP, config.JupiterApiUrl, config.JupiterApiKey)

	birdeyeWrappedHTTP := clients.WrapHTTPClient(httpClient, "birdeye", apiTracker)
	birdeyeClient := birdeye.NewClient(birdeyeWrappedHTTP, config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	header := map[string]string{
		"Authorization": "Bearer " + config.SolanaRPCAPIKey,
	}

	// Create Solana RPC client with custom HTTP client and longer timeout
	solClient := rpc.NewWithCustomRPCClient(jsonrpc.NewClientWithOpts(config.SolanaRPCEndpoint, &jsonrpc.RPCClientOpts{
		HTTPClient:    solanaHTTPClient,
		CustomHeaders: header,
	}))

	solanaClient := solana.NewClient(solClient, apiTracker)

	offchainWrappedHTTP := clients.WrapHTTPClient(httpClient, "offchain", apiTracker)
	offchainClient := offchain.NewClient(offchainWrappedHTTP)

	// No need to load stats or start background processing with OpenTelemetry

	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:             config.BirdEyeEndpoint,
		BirdEyeAPIKey:              config.BirdEyeAPIKey,
		SolanaRPCEndpoint:          config.SolanaRPCEndpoint,
		NewCoinsFetchInterval:      config.NewCoinsFetchInterval,
		TrendingFetchInterval:      config.TrendingCoinsFetchInterval,
		TopGainersFetchInterval:    config.TopGainersFetchInterval,
		InitializeXStocksOnStartup: config.InitializeXStocksOnStartup,
	}

	coinCache, err := coin.NewCoinCache()
	if err != nil {
		slog.Error("Failed to create coin cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Coin cache initialized successfully.")

	// Initialize S3 client for image proxy (optional)
	var imageProxyService *imageproxy.Service
	if os.Getenv("S3_ACCESS_KEY_ID") != "" {
		s3Client, err := s3client.NewClientFromEnv()
		if err != nil {
			slog.Warn("Failed to initialize S3 client for image proxy", "error", err)
		} else {
			imageProxyService = imageproxy.NewService(s3Client)
			slog.Info("Image proxy service initialized with S3 backend")
		}
	} else {
		slog.Info("S3 not configured, image proxy service disabled")
	}

	// Initialize coin service with all dependencies including cache
	coinService := coin.NewService(
		coinServiceConfig,
		jupiterClient,
		store,
		solanaClient,      // This is the chainClient
		birdeyeClient,     // This is the birdeyeClient
		apiTracker,        // Pass existing apiTracker
		offchainClient,    // Pass existing offchainClient
		coinCache,         // Pass the initialized coinCache
		imageProxyService, // Pass the image proxy service (can be nil)
	)
	slog.Info("Coin service initialized.")

	// Populate Naughty Words if the environment variable is set
	if config.PopulateNaughtyWords {
		slog.Info("The POPULATE_NAUGHTY_WORDS environment variable is set. Attempting to populate naughty words table...")
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
		slog.Info("The POPULATE_NAUGHTY_WORDS environment variable is not set. Skipping DB population of naughty words.")
	}

	priceCache, err := price.NewPriceHistoryCache()
	if err != nil {
		slog.Error("Failed to create price cache", slog.Any("error", err))
		os.Exit(1)
	}
	slog.Info("Price cache initialized successfully.")

	priceService := price.NewService(birdeyeClient, jupiterClient, store, priceCache)

	tradeMetrics, err := trademetrics.New(otelTelemetry.Meter)
	if err != nil {
		slog.Error("Failed to create trade metrics", slog.Any("error", err))
		os.Exit(1)
	}

	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
		config.PlatformFeeBps,
		config.PlatformFeeAccountAddress,
		config.PlatformPrivateKey,
		tradeMetrics,
		false, // showDetailedBreakdown - disabled by default
	)

	walletService := wallet.New(solanaClient, store, coinService)

	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher, store)

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

// maskSensitiveURL masks sensitive parts of a URL while preserving useful information
func maskSensitiveURL(url string) string {
	if url == "" {
		return ""
	}

	// Simple approach: mask everything after the first @ and before the last /
	// This will show the protocol and database name while hiding credentials and host details
	parts := strings.Split(url, "@")
	if len(parts) < 2 {
		return url // No credentials to mask
	}

	// Get the part after @
	afterAt := parts[len(parts)-1]
	hostAndPath := strings.Split(afterAt, "/")
	if len(hostAndPath) < 2 {
		return parts[0] + "@***"
	}

	// Return protocol + masked credentials + database name
	return parts[0] + "@***/***/" + hostAndPath[len(hostAndPath)-1]
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
	PopulateNaughtyWords       bool          `envconfig:"POPULATE_NAUGHTY_WORDS" default:"false"`
	OTLPEndpoint               string        `envconfig:"OTLP_ENDPOINT"`
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
