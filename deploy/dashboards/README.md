# Grafana Dashboards

This directory contains pre-configured Grafana dashboards for monitoring the Dankfolio application and infrastructure.

## Available Dashboards

### 1. Dankfolio Application Monitoring
- **File**: `dankfolio-app-dashboard.json`
- **Monitors**: 
  - gRPC metrics: request rates, error rates, response times (p95), total/active requests
  - External API metrics: call rates and response times for Birdeye, Jupiter, Solana RPC
  - Application and error logs from Loki
- **Data Sources**: Mimir (metrics), Loki (logs)
- **Features**: Clean service/method names with `/dankfolio.v1` prefix removed via regex

### 2. System Overview - LGTM Stack
- **File**: `system-overview-dashboard.json`
- **Monitors**: System resources (CPU, memory, disk), network I/O, service health
- **Data Sources**: Mimir (node_exporter metrics)
- **Features**: Fallback queries for missing metrics

### 3. Distributed Tracing
- **File**: `traces-dashboard.json`
- **Monitors**: Application traces, service dependencies, latency analysis
- **Data Sources**: Tempo (traces), Mimir (metrics correlation)

### 4. Database Operations Tracing
- **File**: `database-tracing-dashboard.json`
- **Monitors**:
  - Database query traces with SQL statements
  - Operations breakdown by table and type
  - Slowest queries (>100ms)
  - Database errors with context
- **Data Sources**: Tempo (traces)
- **Features**: Uses GORM OpenTelemetry plugin for automatic instrumentation

## Import Instructions

### Via Grafana UI
1. Navigate to Grafana → Dashboards → Import
2. Upload the JSON file or paste its contents
3. Select appropriate data sources when prompted
4. Click "Import"

### Via API
```bash
# Replace localhost:3000 with your Grafana URL
# Add -u admin:password if authentication is required

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dankfolio-app-dashboard.json

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @system-overview-dashboard.json

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @traces-dashboard.json

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @database-tracing-dashboard.json
```

### Via Provisioning
Copy these files to your Grafana provisioning directory:
```bash
cp *.json /etc/grafana/provisioning/dashboards/
```

## Requirements

### Data Sources
Ensure these data sources are configured in Grafana:
- **Mimir**: For metrics (Prometheus-compatible)
- **Loki**: For logs
- **Tempo**: For traces

### Metrics Collection
The dashboards expect these metrics to be collected:
- `dankfolio_grpc_requests_total`: gRPC request counter
- `dankfolio_grpc_request_duration_seconds`: gRPC request duration histogram
- `dankfolio_grpc_active_requests`: Active gRPC requests gauge
- `dankfolio_api_calls_total`: External API request counter
- `dankfolio_api_errors_total`: External API error counter
- `dankfolio_api_call_duration_seconds`: External API request duration histogram
- `node_*`: Node exporter metrics for system monitoring

### Tracing Data
The tracing dashboards expect:
- Database spans with `db.system=postgresql` attribute
- gRPC spans with service and method attributes
- External API spans with HTTP attributes

## Customization

Feel free to modify these dashboards to suit your needs:
- Adjust time ranges and refresh intervals
- Add or remove panels
- Modify queries for your specific use case
- Change visualization types
- Add alerts based on thresholds