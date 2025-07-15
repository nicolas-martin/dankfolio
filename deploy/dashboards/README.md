# Grafana Dashboards

This directory contains pre-configured Grafana dashboards for monitoring the Dankfolio application and infrastructure.

## Available Dashboards

### 1. Dankfolio Application Monitoring
- **File**: `dankfolio-app-dashboard.json`
- **Monitors**: Application metrics, request rates, error rates, response times, and logs
- **Data Sources**: Mimir (metrics), Loki (logs)

### 2. System Overview - LGTM Stack
- **File**: `system-overview-dashboard.json`
- **Monitors**: System resources (CPU, memory, disk), network I/O, service health
- **Data Sources**: Mimir (node_exporter metrics)

### 3. Distributed Tracing
- **File**: `traces-dashboard.json`
- **Monitors**: Application traces, service dependencies, latency analysis
- **Data Sources**: Tempo (traces), Mimir (metrics correlation)

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
- `dankfolio_api_calls_total`: API request counter
- `dankfolio_api_errors_total`: API error counter
- `dankfolio_api_call_duration_seconds`: Request duration histogram
- `dankfolio_active_requests`: Active request gauge
- `node_*`: Node exporter metrics for system monitoring

## Customization

Feel free to modify these dashboards to suit your needs:
- Adjust time ranges and refresh intervals
- Add or remove panels
- Modify queries for your specific use case
- Change visualization types
- Add alerts based on thresholds