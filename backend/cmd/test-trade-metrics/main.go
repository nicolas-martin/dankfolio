package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"

	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/otel"
	"github.com/nicolas-martin/dankfolio/backend/internal/telemetry/trademetrics"
)

type Config struct {
	OTLPEndpoint string `envconfig:"OTLP_ENDPOINT" default:"localhost:4317"`
	Env          string `envconfig:"APP_ENV" default:"development"`
}

func main() {
	var (
		tradeCount    = flag.Int("trades", 1, "Number of test trades to send")
		feeAmount     = flag.Float64("fee", 0.001, "Platform fee amount per trade")
		tokenSymbol   = flag.String("token", "SOL", "Token symbol for platform fee")
		useProduction = flag.Bool("prod", false, "Send to production telemetry endpoint")
	)
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("Error processing environment variables: %v", err)
	}

	// Override endpoint for production if flag is set
	if *useProduction {
		cfg.OTLPEndpoint = "corsairsoftware.io:4317"
		cfg.Env = "production"
		slog.Info("Using production telemetry endpoint", "endpoint", cfg.OTLPEndpoint)
	} else {
		slog.Info("Using telemetry endpoint", "endpoint", cfg.OTLPEndpoint)
	}

	ctx := context.Background()

	// Initialize OpenTelemetry
	otelConfig := otel.Config{
		ServiceName:    "dankfolio-test-metrics",
		ServiceVersion: "1.0.0",
		Environment:    cfg.Env,
		OTLPEndpoint:   cfg.OTLPEndpoint,
	}

	telemetry, err := otel.InitTelemetry(ctx, otelConfig)
	if err != nil {
		log.Fatalf("Failed to initialize OpenTelemetry: %v", err)
	}
	defer func() {
		// Ensure metrics are flushed before shutdown
		time.Sleep(2 * time.Second)
		if err := telemetry.Shutdown(ctx); err != nil {
			slog.Error("Failed to shutdown telemetry", "error", err)
		}
	}()

	slog.Info("OpenTelemetry initialized",
		"endpoint", cfg.OTLPEndpoint,
		"environment", cfg.Env,
		"service", otelConfig.ServiceName)

	// Create trade metrics
	metrics, err := trademetrics.New(telemetry.Meter)
	if err != nil {
		log.Fatalf("Failed to create trade metrics: %v", err)
	}

	slog.Info("Sending test metrics...",
		"trades", *tradeCount,
		"fee_per_trade", *feeAmount,
		"token", *tokenSymbol)

	// Send test trades
	for i := 0; i < *tradeCount; i++ {
		// Record a trade
		metrics.RecordTrade(ctx)

		// Record platform fee
		if *feeAmount > 0 {
			metrics.RecordPlatformFee(ctx, *feeAmount, *tokenSymbol)
		}

		slog.Info(fmt.Sprintf("Sent trade %d/%d", i+1, *tradeCount))

		// Small delay between trades
		if i < *tradeCount-1 {
			time.Sleep(100 * time.Millisecond)
		}
	}

	slog.Info("Test metrics sent successfully. Waiting for flush...")

	// Wait a bit to ensure metrics are sent
	time.Sleep(5 * time.Second)

	slog.Info("Done! Check your Grafana dashboard for the metrics.")
	if *useProduction {
		slog.Info("Dashboard URL: https://corsairsoftware.io/grafana/d/trade-metrics/dankfolio-trade-metrics")
	}
}

