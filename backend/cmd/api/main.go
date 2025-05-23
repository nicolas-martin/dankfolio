package main

import (
	"context"
	"fmt"
	"io"
	"log"      // Import standard log for pre-slog setup errors
	"log/slog" // Import slog
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/fatih/color"
	"github.com/joho/godotenv"
	imageservice "github.com/nicolas-martin/dankfolio/backend/internal/service/image"

	grpcapi "github.com/nicolas-martin/dankfolio/backend/internal/api/grpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/offchain"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"github.com/nicolas-martin/dankfolio/backend/internal/logger"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/coin"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/price"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/trade"
	"github.com/nicolas-martin/dankfolio/backend/internal/service/wallet"
)

type Config struct {
	SolanaRPCEndpoint string
	BirdEyeEndpoint   string
	BirdEyeAPIKey     string
	CoinGeckoAPIKey   string
	GRPCPort          int
	DBURL             string
	CacheExpiry       time.Duration
	JupiterApiKey     string
	JupiterApiUrl     string
	Env               string
}

// ColorHandler implements slog.Handler interface with colored output
type ColorHandler struct {
	level     slog.Level
	outStream io.Writer
	errStream io.Writer
}

// NewColorHandler creates a new ColorHandler with specified log level and output streams
func NewColorHandler(level slog.Level, out, err io.Writer) *ColorHandler {
	return &ColorHandler{
		level:     level,
		outStream: out,
		errStream: err,
	}
}

func (h *ColorHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *ColorHandler) Handle(_ context.Context, r slog.Record) error {
	timestamp := r.Time.Format("15:04:05")

	// Get colored level text
	var levelText string
	switch r.Level {
	case slog.LevelDebug:
		levelText = color.New(color.FgCyan).Sprint("DEBUG")
	case slog.LevelInfo:
		levelText = color.New(color.FgGreen).Sprint("INFO")
	case slog.LevelWarn:
		levelText = color.New(color.FgYellow).Sprint("WARN")
	case slog.LevelError:
		levelText = color.New(color.FgRed).Sprint("ERROR")
	default:
		levelText = r.Level.String()
	}

	// Format log message
	msg := fmt.Sprintf("[%s] %-5s %s\n", timestamp, levelText, r.Message)

	// Decide output stream based on severity
	var out io.Writer
	if r.Level >= slog.LevelError {
		out = h.errStream
	} else {
		out = h.outStream
	}

	_, err := fmt.Fprint(out, msg)
	return err
}

func (h *ColorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	// For simplicity, return same handler (ignoring attrs)
	return h
}

func (h *ColorHandler) WithGroup(name string) slog.Handler {
	// For simplicity, return same handler (ignoring group)
	return h
}

func loadConfig() (*Config, error) {
	// // Base URL for Jupiter API
	// baseURL  = "https://api.jup.ag"
	// lightURL = "https://lite-api.jup.ag"

	// Load environment variables
	if os.Getenv("APP_ENV") == "development" {
		if err := godotenv.Load(); err != nil {
			// slog is not configured yet, use original log.Fatal
			log.Fatal(err)
		}
	}

	// Parse cache expiry duration from environment variable (default to 5 minutes)
	cacheExpiry := 5 * time.Minute
	if expiryStr := os.Getenv("CACHE_EXPIRY_SECONDS"); expiryStr != "" {
		expirySecs, err := strconv.Atoi(expiryStr)
		if err != nil {
			// slog not configured yet, or use a temp logger if this happens often before main setup
			log.Printf("Warning: Invalid CACHE_EXPIRY_SECONDS value: %v, using default. Slog not yet initialized.", err)
		} else {
			cacheExpiry = time.Duration(expirySecs) * time.Second
		}
	}

	config := &Config{
		SolanaRPCEndpoint: os.Getenv("SOLANA_RPC_ENDPOINT"),
		BirdEyeEndpoint:   os.Getenv("BIRDEYE_ENDPOINT"),
		BirdEyeAPIKey:     os.Getenv("BIRDEYE_API_KEY"),
		CoinGeckoAPIKey:   os.Getenv("COINGECKO_API_KEY"),
		DBURL:             os.Getenv("DB_URL"),
		GRPCPort:          9000, // Default value
		CacheExpiry:       cacheExpiry,
		JupiterApiKey:     os.Getenv("JUPITER_API_KEY"),
		JupiterApiUrl:     os.Getenv("JUPITER_API_URL"),
		Env:               os.Getenv("APP_ENV"),
	}

	// Validate required fields
	var missingVars []string

	if config.Env == "" {
		missingVars = append(missingVars, "APP_ENV")
	}
	if config.SolanaRPCEndpoint == "" {
		missingVars = append(missingVars, "SOLANA_RPC_ENDPOINT")
	}
	if config.BirdEyeEndpoint == "" {
		missingVars = append(missingVars, "BIRDEYE_ENDPOINT")
	}
	if config.BirdEyeAPIKey == "" {
		missingVars = append(missingVars, "BIRDEYE_API_KEY")
	}
	if config.DBURL == "" {
		missingVars = append(missingVars, "DB_URL")
	}
	// if config.Env != "development" {
	// 	if config.JupiterApiKey == "" {
	// 		missingVars = append(missingVars, "JUPITER_API_KEY")
	// 	}
	// }
	if config.JupiterApiUrl == "" {
		missingVars = append(missingVars, "JUPITER_API_URL")
	}

	if len(missingVars) > 0 {
		// Slog not configured yet
		log.Fatalf("missing required environment variables: %v", missingVars)
	}

	return config, nil
}

func main() {
	// Setup logger
	logLevel := slog.LevelInfo
	if os.Getenv("APP_ENV") == "development" {
		logLevel = slog.LevelDebug
	}

	// Create color handler and set it as default
	handler := logger.NewColorHandler(logLevel, os.Stdout, os.Stderr)
	slogger := slog.New(handler)
	slog.SetDefault(slogger)

	// Load and validate configuration
	config, err := loadConfig()
	if err != nil {
		slog.Error("Failed to load configuration", slog.Any("error", err))
		os.Exit(1)
	}

	slog.Info("Configuration loaded successfully", "env", config.Env, "port", config.GRPCPort)

	// Initialize HTTP client
	httpClient := &http.Client{
		Timeout: time.Second * 10,
	}

	// Initialize Jupiter client
	jupiterClient := jupiter.NewClient(httpClient, config.JupiterApiUrl, config.JupiterApiKey)

	// Initialize BirdEye client
	birdeyeClient := birdeye.NewClient(config.BirdEyeEndpoint, config.BirdEyeAPIKey)

	// Initialize Solana client
	solanaClient := solana.NewClient(config.SolanaRPCEndpoint)

	// Initialize offchain client
	offchainClient := offchain.NewClient(httpClient)

	// Initialize store with configured cache expiry
	store, err := postgres.NewStore(config.DBURL, true, logLevel) // Pass logLevel
	if err != nil {
		slog.Error("Failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize coin service
	coinServiceConfig := &coin.Config{
		BirdEyeBaseURL:    config.BirdEyeEndpoint,
		BirdEyeAPIKey:     config.BirdEyeAPIKey,
		CoinGeckoAPIKey:   config.CoinGeckoAPIKey,
		SolanaRPCEndpoint: config.SolanaRPCEndpoint,
	}
	coinService := coin.NewService(coinServiceConfig, httpClient, jupiterClient, store)

	// Initialize price service
	priceService := price.NewService(birdeyeClient, jupiterClient)

	// Initialize trade service with all dependencies
	tradeService := trade.NewService(
		solanaClient,
		coinService,
		priceService,
		jupiterClient,
		store,
	)

	// Initialize wallet service
	walletService := wallet.New(solanaClient.GetRpcConnection(), store)

	// Initialize Image Service / Utility Service
	imageFetcher := imageservice.NewOffchainFetcher(offchainClient)
	utilitySvc := grpcapi.NewService(imageFetcher)

	// Initialize gRPC server
	grpcServer := grpcapi.NewServer(
		coinService,
		walletService,
		tradeService,
		priceService,
		utilitySvc,
	)

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

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down servers...")

	// Stop gRPC server
	grpcServer.Stop()

	slog.Info("Servers exited properly")
}
