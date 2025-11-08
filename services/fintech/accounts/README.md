# Accounts Service

FinTech Accounts Service - Account management with double-entry ledger.

## Overview

This service provides account management functionality including:
- Account creation and retrieval
- Double-entry bookkeeping operations
- Event-driven architecture with Kafka
- JWT-based authentication

## Architecture

### Domain Layer
- `Account`: Core domain entity with business rules
- `AccountRepository`: Repository interface for data access
- Enums: `AccountType`, `Currency`, `AccountStatus`

### Application Layer
- Command/Query objects for use cases
- Handlers for business logic execution
- DTOs for data transfer

### Infrastructure Layer
- JDBC repository implementation
- JPA entities for persistence
- Flyway migrations for schema management

### Web Layer
- REST controllers with OpenAPI documentation
- Security configuration with OAuth2/JWT
- Error handling and validation

## Technologies

- **Java 17** with Spring Boot 3
- **PostgreSQL** for data persistence
- **Kafka** for event streaming
- **Flyway** for database migrations
- **OpenTelemetry** for observability
- **JUnit 5** + Testcontainers for testing

## Running Locally

### Prerequisites
- Java 17
- Maven 3.8+
- PostgreSQL 16
- Kafka (Redpanda)

### Configuration
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/fintech
    username: fintech_user
    password: fintech_pass
  kafka:
    bootstrap-servers: localhost:9092
```

### Commands
```bash
# Run with Maven
./mvnw spring-boot:run

# Run tests
./mvnw test

# Build JAR
./mvnw clean package

# Run with Docker
docker build -t accounts-service .
docker run -p 8080:8080 accounts-service
```

## API Endpoints

### Create Account
```http
POST /v1/accounts
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "accountNumber": "123456",
  "type": "ASSET",
  "currency": "USD"
}
```

### Get Account
```http
GET /v1/accounts/{id}
Authorization: Bearer <jwt-token>
```

## Database Schema

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    balance DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);
```

## Events

### AccountCreated
Published when a new account is created.

```json
{
  "accountId": "uuid",
  "accountNumber": "string"
}
```

## Security

- JWT Bearer token authentication
- `accounts:write` scope required for creating accounts
- `accounts:read` scope required for reading accounts
- Input validation and sanitization

## Observability

- Health checks: `/actuator/health`
- Metrics: `/actuator/metrics`
- Traces: OpenTelemetry with OTLP exporter
- Logs: Structured logging with correlation IDs

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
- Kafka message broker

## Development

### Code Style
Follows Spring Boot conventions and includes:
- Checkstyle configuration
- Spotless for code formatting
- JaCoCo for code coverage

### IDE Setup
Import as Maven project with Java 17.

## Deployment

### Docker
```bash
docker build -t fintech/accounts-service .
```

### Docker Compose
Part of the full FinTech platform stack:

```bash
cd ../../../deploy/fintech
docker-compose up accounts-service
```
