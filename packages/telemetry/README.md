# @fintech/telemetry

Shared OpenTelemetry configuration package for FinTech platform services.

## Installation

```bash
npm install @fintech/telemetry
```

## Usage

### Node.js Services (Gateway)

```javascript
const { initializeTelemetry } = require('@fintech/telemetry');

const sdk = initializeTelemetry({
  serviceName: 'gateway',
  serviceVersion: '1.0.0',
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318'
});

// Your application code here
```

### Environment Variables

- `OTEL_TRACES_EXPORTER`: Set to 'none' to disable telemetry (default: enabled)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP endpoint URL (default: http://otel-collector:4318)
- `OTEL_SERVICE_NAME`: Service name (can be overridden in code)

## Java Services

For Java/Spring Boot services, add the following environment variables:

```bash
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=accounts-service
```

## Go Services

For Go services, initialize with:

```go
import "go.opentelemetry.io/otel"

tracer := otel.Tracer("limits-service")
// Use tracer for spans
```

## Included Instrumentations

- HTTP client and server requests
- Express.js middleware
- GraphQL operations
- Redis commands
- DNS lookups
- File system operations (disabled by default)

## Architecture

This package provides:
- Resource attributes (service name, version, namespace)
- OTLP exporters for traces and metrics
- Auto-instrumentation for common libraries
- Graceful shutdown handling
