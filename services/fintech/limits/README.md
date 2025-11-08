# Limits Service

FinTech Limits Service - Credit limit evaluation and management.

## Overview

This service provides credit limit checking and management functionality including:
- Synchronous limit evaluation for payment requests
- Event-driven limit consumption from payment events
- Daily and monthly spending limits per account
- PostgreSQL persistence with automatic period management
- Kafka event consumption for real-time limit updates

## Architecture

### Domain Layer
- `Limit`: Core domain entity with spending limits and periods
- `LimitType`: Enumeration for DAILY/MONTHLY limits
- `LimitCheckResult`: Result of limit evaluation operations

### Infrastructure Layer
- `LimitRepository`: PostgreSQL repository for limit persistence
- Kafka consumer for payment events
- OpenTelemetry tracing integration

### API Layer
- HTTP REST API for limit evaluation
- Health check endpoints
- Prometheus metrics exposure

## Technologies

- **Go 1.21** with standard library and popular packages
- **PostgreSQL** for limit data persistence
- **Kafka** (Redpanda) for event streaming
- **OpenTelemetry** for observability
- **Gorilla Mux** for HTTP routing
- **Logrus** for structured logging

## Key Features

### Synchronous Limit Evaluation
- Real-time limit checking for payment initiation
- Atomic spend operations with database transactions
- Configurable default limits per account

### Event-Driven Processing
- Kafka consumer for payment events
- Automatic limit consumption on successful payments
- Async processing with proper error handling

### Period Management
- Daily and monthly limit periods
- Automatic period transitions
- Expired limit cleanup

### Observability
- OpenTelemetry distributed tracing
- Structured JSON logging
- Prometheus metrics integration
- Health check endpoints

## Database Schema

```sql
CREATE TABLE limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DAILY', 'MONTHLY')),
    amount DECIMAL(19,4) NOT NULL,
    used DECIMAL(19,4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, type, period_start)
);
```

## API Endpoints

### Evaluate Limit
```http
POST /limits/evaluate
Content-Type: application/json

{
  "accountId": "account-uuid",
  "limitType": "DAILY",
  "amount": 100.50,
  "currency": "USD"
}
```

**Success Response (200):**
```json
{
  "allowed": true,
  "remaining": 899.50,
  "limitAmount": 1000.00,
  "usedAmount": 100.50,
  "limitType": "DAILY",
  "accountId": "account-uuid"
}
```

**Limit Exceeded Response (403):**
```json
{
  "allowed": false,
  "remaining": 0.00,
  "limitAmount": 1000.00,
  "usedAmount": 1000.00,
  "limitType": "DAILY",
  "accountId": "account-uuid",
  "errorMessage": "Limit exceeded"
}
```

### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "time": "2024-01-01T10:00:00Z"
}
```

### Metrics
```http
GET /metrics
```
Prometheus metrics endpoint for monitoring.

## Events

### Payment Event Consumption
The service consumes payment events from Kafka topic `payments`:

```json
{
  "paymentId": "uuid",
  "idempotencyKey": "uuid",
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 100.50,
  "currency": "USD"
}
```

For each payment event:
1. Checks daily limit for the account
2. Checks monthly limit for the account
3. Consumes from both limits if payment is allowed
4. Logs limit check results

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | - | PostgreSQL connection URL (required) |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | OTLP endpoint |
| `DEFAULT_DAILY_LIMIT` | `10000` | Default daily limit amount |
| `DEFAULT_MONTHLY_LIMIT` | `50000` | Default monthly limit amount |
| `ENVIRONMENT` | `development` | Environment (affects logging) |

### Example Configuration
```bash
export PORT=8080
export DATABASE_URL="postgres://user:pass@localhost:5432/fintech?sslmode=disable"
export KAFKA_BROKERS="redpanda:9092"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export DEFAULT_DAILY_LIMIT=10000
export DEFAULT_MONTHLY_LIMIT=50000
```

## Running Locally

### Prerequisites
- Go 1.21+
- PostgreSQL 16
- Kafka (Redpanda)

### Commands
```bash
# Install dependencies
go mod tidy

# Run with environment variables
go run cmd/main.go

# Build binary
go build -o limits-service cmd/main.go

# Run binary
./limits-service

# Run with Docker
docker build -t limits-service .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/fintech" \
  limits-service
```

## Testing

### Unit Tests
```bash
go test ./...
```

### Integration Tests
```bash
# With test database
go test -tags=integration ./...
```

### Manual Testing
```bash
# Evaluate a limit
curl -X POST http://localhost:8080/limits/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "test-account",
    "limitType": "DAILY",
    "amount": 100,
    "currency": "USD"
  }'
```

## Observability

### Tracing
- OpenTelemetry integration with OTLP exporter
- Traces for limit evaluations and event processing
- Jaeger integration for distributed tracing

### Metrics
- HTTP request metrics (Gorilla Mux)
- Limit evaluation metrics
- Event processing metrics
- Prometheus integration

### Logging
- Structured JSON logging with Logrus
- Request/response logging
- Error logging with context
- Different log levels for environments

## Deployment

### Docker
```bash
docker build -t fintech/limits-service .
```

### Docker Compose
Part of the full FinTech platform stack:

```bash
cd ../../../deploy/fintech
docker-compose up limits-service
```

### Kubernetes
The service is designed to work with:
- ConfigMaps for configuration
- Secrets for sensitive data
- Readiness/liveness probes
- Horizontal Pod Autoscaling

## Development

### Code Organization
```
├── cmd/                 # Application entrypoints
├── internal/
│   ├── config/         # Configuration management
│   ├── domain/         # Domain models and business logic
│   ├── handlers/       # HTTP handlers and event processors
│   ├── infrastructure/ # Database and external service adapters
│   └── models/         # Data transfer objects
├── pkg/                # Shared packages
│   ├── database/       # Database connection and migrations
│   ├── kafka/          # Kafka client and event handling
│   └── otel/           # OpenTelemetry integration
├── migrations/         # Database migrations
└── test/              # Test utilities and fixtures
```

### Adding New Limits
1. Extend `LimitType` enum in domain
2. Update `NewLimit` function for period calculation
3. Add configuration for default amounts
4. Update repository methods if needed

### Event Processing
To add new event types:
1. Define event struct in `pkg/kafka`
2. Add handler method in `handlers`
3. Update consumer registration in `main.go`

## Security

### Input Validation
- Request parameter validation
- SQL injection prevention via prepared statements
- Safe JSON parsing

### Authentication
- Designed for service-to-service authentication
- JWT token validation (when implemented)
- Request origin validation

### Data Protection
- No sensitive data logging
- Secure database connections
- Minimal data exposure in APIs

## Contributing

### Development Workflow
1. Create feature branch
2. Write tests for new functionality
3. Implement changes with proper error handling
4. Update documentation
5. Submit pull request

### Code Quality
- Go fmt and go vet compliance
- Comprehensive test coverage
- Proper error handling
- Clean, idiomatic Go code

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
