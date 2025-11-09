# Graph & Entity Resolution Lab - Infrastructure

This directory contains the infrastructure configuration for the Graph & Entity Resolution Lab using Docker Compose.

## Services

- **Neo4j 5.24**: Graph database with APOC and Graph Data Science plugins
- **OpenTelemetry Collector**: Collects and exports telemetry data
- **Prometheus**: Time-series database for metrics
- **Grafana**: Visualization dashboard for monitoring

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Service Endpoints

- **Neo4j Browser**: http://localhost:7474 (neo4j/grapher123)
- **Neo4j Bolt**: localhost:7687 (neo4j/grapher123)
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **OTEL Collector Metrics**: http://localhost:8888/metrics

## Configuration

### Neo4j

- APOC and GDS plugins enabled
- Authentication: neo4j/grapher123
- Data persisted in Docker volume `neo4j_data`
- Import directory mounted for CSV loading

### OpenTelemetry

- Accepts OTLP gRPC (4317) and HTTP (4318)
- Exports metrics to Prometheus
- Ready for traces and logs (currently no exporters configured)

### Monitoring

- Prometheus scrapes OTEL collector and application metrics
- Grafana pre-configured with Prometheus datasource
- Basic dashboard included for application monitoring

## Data Persistence

All data is persisted in Docker named volumes:
- `neo4j_data`: Neo4j database files
- `neo4j_logs`: Neo4j log files
- `prometheus_data`: Prometheus time-series data
- `grafana_data`: Grafana configuration and dashboards

## Development

For development, you can connect to Neo4j from your host machine using:
- Browser: http://localhost:7474
- Bolt: bolt://localhost:7687

Use the credentials `neo4j/grapher123` for initial login.
