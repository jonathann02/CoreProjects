# Payments Service

FinTech Payments Service - Payment processing with idempotency and rate limiting.

## Overview

This service provides payment processing functionality including:
- Idempotent payment initiation with Redis-based deduplication
- Rate limiting per user to prevent abuse
- Asynchronous payment processing with event-driven architecture
- Integration with Accounts Service for balance validation
- Transactional outbox pattern for reliable event publishing
- JWT-based authentication and authorization

## Architecture

### Domain Layer
- `Payment`: Core domain entity with business rules and state management
- `PaymentRepository`: Repository interface for data persistence
- Enums: `PaymentStatus`, `Currency`

### Application Layer
- Command/Query objects for use cases
- `PaymentHandler`: Core business logic with idempotency and rate limiting
- DTOs for data transfer

### Infrastructure Layer
- JDBC repository implementation with PostgreSQL
- Redis integration for idempotency keys and rate limiting
- Kafka producer for event publishing
- WebClient for Accounts Service communication
- Flyway migrations for schema management

### Web Layer
- REST controllers with OpenAPI documentation
- Security configuration with OAuth2/JWT
- Request validation and error handling

## Technologies

- **Java 17** with Spring Boot 3
- **PostgreSQL** for payment data persistence
- **Redis** for idempotency and rate limiting
- **Kafka** for event streaming
- **WebFlux** for reactive HTTP client
- **OpenTelemetry** for observability
- **JUnit 5** + Testcontainers for testing

## Key Features

### Idempotency
- Redis-based idempotency key management
- 24-hour TTL for keys with automatic cleanup
- Duplicate request detection and handling

### Rate Limiting
- Redis-backed rate limiting with Lua scripts
- Configurable requests per minute per user
- Atomic operations to prevent race conditions

### Payment Processing
- Asynchronous processing with `@Async`
- State machine: PENDING → PROCESSING → COMPLETED/FAILED
- Event publishing for downstream processing

### Security
- JWT Bearer token authentication
- `payments:write` scope required for payment initiation
- `payments:read` scope required for payment retrieval
- Input validation and sanitization

## Database Schema

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    idempotency_key UUID NOT NULL UNIQUE,
    from_account_id UUID NOT NULL,
    to_account_id UUID NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE idempotency_keys (
    key UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## API Endpoints

### Initiate Payment
```http
POST /v1/payments
Authorization: Bearer <jwt-token>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 100.50,
  "currency": "USD",
  "description": "Payment for services"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "idempotencyKey": "uuid",
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 100.50,
  "currency": "USD",
  "description": "Payment for services",
  "status": "PENDING",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

### Get Payment
```http
GET /v1/payments/{id}
Authorization: Bearer <jwt-token>
```

## Events

### PaymentInitiated
Published when a payment is successfully initiated.

```json
{
  "paymentId": "uuid",
  "idempotencyKey": "uuid"
}
```

### PaymentCompleted
Published when a payment is successfully processed.

```json
{
  "paymentId": "uuid",
  "amount": 100.50
}
```

### PaymentFailed
Published when a payment processing fails.

```json
{
  "paymentId": "uuid",
  "reason": "Insufficient funds"
}
```

## Configuration

### Application Properties
```yaml
app:
  accounts-service:
    url: http://localhost:8082
  idempotency:
    ttl-seconds: 86400
  rate-limiting:
    enabled: true
    requests-per-minute: 10
```

### Environment Variables
- `SPRING_DATASOURCE_URL`: PostgreSQL connection URL
- `REDIS_HOST`: Redis host
- `REDIS_PASSWORD`: Redis password
- `ACCOUNTS_SERVICE_URL`: Accounts service URL

## Running Locally

### Prerequisites
- Java 17
- Maven 3.8+
- PostgreSQL 16
- Redis 7
- Kafka (Redpanda)

### Commands
```bash
# Run with Maven
./mvnw spring-boot:run

# Run tests
./mvnw test

# Build JAR
./mvnw clean package

# Run with Docker
docker build -t payments-service .
docker run -p 8080:8080 payments-service
```

## Testing

### Unit Tests
```bash
./mvnw test -Dtest="*Test"
```

### Integration Tests
```bash
./mvnw test -Dtest="*IT"
```

### Testcontainers
Integration tests use Testcontainers for:
- PostgreSQL database
- Redis cache
- Kafka message broker

## Observability

### Health Checks
- `/actuator/health`: Application health status
- Readiness and liveness probes

### Metrics
- JVM metrics (memory, GC, threads)
- HTTP request metrics
- Custom business metrics (payments processed, failures)

### Tracing
- Distributed tracing with OpenTelemetry
- Service mesh integration
- Performance monitoring

## Rate Limiting

The service implements rate limiting to prevent abuse:
- **Default**: 10 requests per minute per user
- **Redis-backed**: Atomic operations with Lua scripts
- **Headers**: Rate limit information in responses
- **Graceful degradation**: Allows requests when Redis is unavailable

## Idempotency

Payment operations support idempotency:
- **Header**: `Idempotency-Key` required for payment initiation
- **Storage**: Redis with 24-hour TTL
- **Behavior**: Duplicate keys return the original payment
- **Cleanup**: Automatic expiration and background cleanup

## Error Handling

### Validation Errors (400)
```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Amount must be positive",
  "instance": "/v1/payments"
}
```

### Rate Limit Exceeded (429)
```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded",
  "instance": "/v1/payments"
}
```

### Payment Not Found (404)
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Payment not found with ID: uuid",
  "instance": "/v1/payments/uuid"
}
```

## Development

### Code Style
Follows Spring Boot conventions with:
- Google Java Style Guide
- Checkstyle integration
- JaCoCo code coverage (target: 80%)

### IDE Setup
Import as Maven project with Java 17.

## Deployment

### Docker
```bash
docker build -t fintech/payments-service .
```

### Docker Compose
Part of the full FinTech platform stack:

```bash
cd ../../../deploy/fintech
docker-compose up payments-service
```

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Create pull request

### Code Quality
- Write comprehensive unit tests
- Add integration tests for critical paths
- Update OpenAPI documentation
- Follow security best practices

## Security

See [SECURITY.md](../../SECURITY.md) for security considerations.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
