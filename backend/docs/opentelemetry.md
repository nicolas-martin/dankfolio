# OpenTelemetry Integration

This document describes the OpenTelemetry integration for the Dankfolio backend.

## Configuration

Set the following environment variable to configure the OTLP endpoint:

```bash
export OTLP_ENDPOINT="localhost:4317"  # Default value
```

## What's Instrumented

### Automatic Instrumentation

1. **gRPC Services**: All gRPC endpoints are automatically instrumented with:
   - Request duration histogram
   - Total requests counter
   - Active requests gauge
   - Error tracking

2. **External API Calls**: Jupiter, Birdeye, and Solana RPC calls include:
   - Call duration tracking
   - Error tracking
   - Active requests tracking

3. **Database Operations**: Using the official GORM OpenTelemetry plugin provides:
   - Automatic tracing of all database queries
   - SQL statement capture in spans
   - Table and operation type attributes
   - Error tracking and status codes
   - Query execution timing

### Metrics Available

- `dankfolio.grpc_request_duration_seconds` - Histogram of gRPC request durations
- `dankfolio.grpc_requests_total` - Total number of gRPC requests
- `dankfolio.grpc_active_requests` - Number of currently active gRPC requests
- `dankfolio.api_calls_total` - Total external API calls by service/endpoint
- `dankfolio.api_call_duration_seconds` - External API call durations
- `dankfolio.api_errors_total` - Total API errors by service

### Tracing

Each request generates a trace with:
- Unique trace ID (returned in `x-trace-id` header)
- Span hierarchy showing the flow through services
- External API calls as child spans
- Database queries as child spans with SQL details
- Error details when failures occur

## Using with Grafana/Tempo/Prometheus

The OTLP endpoint should point to your OpenTelemetry Collector, which can then forward data to:
- Tempo for traces
- Prometheus/Mimir for metrics
- Loki for logs (with trace ID correlation)

## Example Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```