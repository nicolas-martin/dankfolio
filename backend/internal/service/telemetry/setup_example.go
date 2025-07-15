package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/gagliardetto/solana-go/rpc"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/birdeye"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/jupiter"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/solana"
	"github.com/nicolas-martin/dankfolio/backend/internal/clients/tracker"
	"github.com/nicolas-martin/dankfolio/backend/internal/db/postgres"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/sdk/resource"
)

// SetupExample demonstrates how to set up telemetry for the entire application
type SetupExample struct {
	tracker         tracker.APITracker
	businessMetrics *BusinessMetrics
	meterProvider   metric.MeterProvider
}

// InitializeTelemetry sets up OpenTelemetry with OTLP exporters
func InitializeTelemetry(ctx context.Context, serviceName string) (*SetupExample, error) {
	// Initialize OpenTelemetry
	otelResource, err := resource.New(ctx,
		resource.WithAttributes(
			// Add service identification
			resource.ServiceName(serviceName),
			resource.ServiceVersion("1.0.0"),
			resource.ServiceInstanceID(os.Getenv("INSTANCE_ID")),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Initialize trace exporter (e.g., OTLP)
	traceExporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
		otlptracegrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create trace exporter: %w", err)
	}

	// Initialize metrics exporter
	metricExporter, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
		otlpmetricgrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create metric exporter: %w", err)
	}

	// Create tracker
	apiTracker, err := tracker.NewAPITracker(
		tracker.WithResource(otelResource),
		tracker.WithTraceExporter(traceExporter),
		tracker.WithMetricExporter(metricExporter),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create API tracker: %w", err)
	}

	// Set global providers
	otel.SetTracerProvider(apiTracker.TracerProvider())
	otel.SetMeterProvider(apiTracker.MeterProvider())

	// Create business metrics
	meter := apiTracker.MeterProvider().Meter(serviceName)
	businessMetrics, err := NewBusinessMetrics(meter)
	if err != nil {
		return nil, fmt.Errorf("failed to create business metrics: %w", err)
	}

	return &SetupExample{
		tracker:         apiTracker,
		businessMetrics: businessMetrics,
		meterProvider:   apiTracker.MeterProvider(),
	}, nil
}

// CreateInstrumentedClients creates all clients with telemetry instrumentation
func (s *SetupExample) CreateInstrumentedClients() (*InstrumentedClients, error) {
	// Create base HTTP client
	baseHTTPClient := &http.Client{
		Timeout: 30 * 1000000000, // 30 seconds
	}

	// Wrap HTTP client with instrumentation for Jupiter
	jupiterHTTPClient := clients.WrapHTTPClient(baseHTTPClient, "jupiter", &s.tracker)
	jupiterClient := jupiter.NewClient(
		jupiterHTTPClient,
		os.Getenv("JUPITER_API_URL"),
		os.Getenv("JUPITER_API_KEY"),
	)

	// Wrap HTTP client with instrumentation for Birdeye
	birdeyeHTTPClient := clients.WrapHTTPClient(baseHTTPClient, "birdeye", &s.tracker)
	birdeyeClient := birdeye.NewClient(
		birdeyeHTTPClient,
		os.Getenv("BIRDEYE_API_URL"),
		os.Getenv("BIRDEYE_API_KEY"),
	)

	// Create Solana RPC client with telemetry
	solanaRPCClient := rpc.New(os.Getenv("SOLANA_RPC_URL"))
	solanaClient := solana.NewClient(solanaRPCClient, s.tracker)

	return &InstrumentedClients{
		Jupiter: jupiterClient,
		Birdeye: birdeyeClient,
		Solana:  solanaClient,
	}, nil
}

// CreateInstrumentedDatabase creates a database connection with telemetry
func (s *SetupExample) CreateInstrumentedDatabase() (*postgres.InstrumentedStore, error) {
	dbURL := os.Getenv("DATABASE_URL")
	enableAutoMigrate := os.Getenv("DB_AUTO_MIGRATE") == "true"
	env := os.Getenv("ENVIRONMENT")

	store, err := postgres.NewInstrumentedStore(
		dbURL,
		enableAutoMigrate,
		slog.LevelInfo,
		env,
		s.tracker,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create instrumented store: %w", err)
	}

	return store, nil
}

// InstrumentedClients holds all instrumented client instances
type InstrumentedClients struct {
	Jupiter jupiter.ClientAPI
	Birdeye birdeye.ClientAPI
	Solana  clients.GenericClientAPI
}

// Example of a fully instrumented service
type FullyInstrumentedService struct {
	clients *InstrumentedClients
	store   *postgres.InstrumentedStore
	tracker tracker.APITracker
	metrics *BusinessMetrics
}

// NewFullyInstrumentedService creates a service with all telemetry components
func NewFullyInstrumentedService(
	clients *InstrumentedClients,
	store *postgres.InstrumentedStore,
	tracker tracker.APITracker,
	metrics *BusinessMetrics,
) *FullyInstrumentedService {
	return &FullyInstrumentedService{
		clients: clients,
		store:   store,
		tracker: tracker,
		metrics: metrics,
	}
}

// ExampleOperation shows a complete operation with full telemetry
func (s *FullyInstrumentedService) ExampleOperation(ctx context.Context, coinAddress string) error {
	// Start operation span
	ctx, span := s.tracker.StartSpan(ctx, "ExampleService", "ExampleOperation")
	defer func() {
		s.tracker.EndSpan(span, nil, "ExampleService")
	}()

	// 1. Check database first
	coin, err := s.store.Coins().GetByField(ctx, "address", coinAddress)
	if err == nil && coin != nil {
		s.metrics.RecordCacheHit(ctx, "database", fmt.Sprintf("coin:%s", coinAddress))
		return nil
	}
	s.metrics.RecordCacheMiss(ctx, "database", fmt.Sprintf("coin:%s", coinAddress))

	// 2. Fetch from Jupiter
	jupiterInfo, err := s.clients.Jupiter.GetCoinInfo(ctx, coinAddress)
	if err != nil {
		s.metrics.RecordExternalAPIError(ctx, "jupiter", "GetCoinInfo", "fetch_error")
		return fmt.Errorf("failed to get coin info from Jupiter: %w", err)
	}

	// 3. Fetch from Birdeye
	birdeyeInfo, err := s.clients.Birdeye.GetTokenOverview(ctx, coinAddress)
	if err != nil {
		s.metrics.RecordExternalAPIError(ctx, "birdeye", "GetTokenOverview", "fetch_error")
		return fmt.Errorf("failed to get token overview from Birdeye: %w", err)
	}

	// 4. Get on-chain data from Solana
	tokenMetadata, err := s.clients.Solana.GetTokenMetadata(ctx, coinAddress)
	if err != nil {
		s.metrics.RecordExternalAPIError(ctx, "solana", "GetTokenMetadata", "rpc_error")
		slog.WarnContext(ctx, "Failed to get token metadata", "error", err)
	}

	// 5. Save to database
	// (Implementation would merge data from all sources and save)
	_ = jupiterInfo
	_ = birdeyeInfo
	_ = tokenMetadata

	// Record new coin discovery
	s.metrics.RecordNewCoins(ctx, "api_fetch", 1)

	return nil
}

// Shutdown gracefully shuts down telemetry
func (s *SetupExample) Shutdown(ctx context.Context) error {
	return s.tracker.Shutdown(ctx)
}

