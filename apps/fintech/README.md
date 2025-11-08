# FinTech Event-Driven Platform

A production-grade event-driven FinTech platform demonstrating microservices architecture, domain-driven design, and enterprise security practices.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Accounts       │────│  PostgreSQL     │
│  (Node/TypeScript│    │  Service       │    │  Database       │
│   + GraphQL)    │    │  (Java/Spring) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Payments       │────│  Limits         │────│   Redis         │
│  Service        │    │  Service        │    │  Cache          │
│  (Java/Spring)  │    │  (Go)           │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Notifications   │────│  Redpanda       │────│ LocalStack      │
│  Service        │    │  (Kafka)        │    │ (AWS Services)  │
│  (Go)           │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Services

### Accounts Service (Java/Spring Boot)
- **Purpose**: Account management with double-entry ledger
- **Tech**: Java 17, Spring Boot 3, PostgreSQL, Kafka
- **Features**:
  - Create and retrieve accounts
  - Double-entry bookkeeping operations
  - Event-driven with Kafka
  - JWT authentication

### Payments Service (Java/Spring Boot)
- **Purpose**: Payment processing with idempotency
- **Tech**: Java 17, Spring Boot 3, PostgreSQL, Redis, Kafka
- **Features**:
  - Idempotent payment initiation
  - Debit/credit operations
  - Transactional outbox pattern
  - Redis-based rate limiting

### Limits Service (Go)
- **Purpose**: Credit limits evaluation
- **Tech**: Go, PostgreSQL, Kafka
- **Features**:
  - Synchronous limit checks
  - Event-driven limit updates
  - Configurable limit policies

### Notifications Service (Go)
- **Purpose**: Multi-channel notifications
- **Tech**: Go, PostgreSQL, Kafka, LocalStack (SNS/SQS)
- **Features**:
  - Email/SMS/push notifications
  - SNS/SQS fan-out pattern
  - Event-driven processing

### API Gateway (Node/TypeScript)
- **Purpose**: Unified API access
- **Tech**: Node.js, TypeScript, Apollo GraphQL, Express
- **Features**:
  - GraphQL and REST APIs
  - JWT authentication
  - Redis-based rate limiting
  - Request routing

## Technology Stack

### Core Technologies
- **Languages**: Java 17, Go, TypeScript
- **Frameworks**: Spring Boot 3, Apollo Server, Express
- **Messaging**: Redpanda (Kafka-compatible)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7

### Infrastructure & DevOps
- **Container Orchestration**: Docker Compose
- **IaC**: Terraform (LocalStack resources)
- **Identity**: Keycloak (OIDC/OAuth2)
- **Observability**: OpenTelemetry, Prometheus, Grafana, Jaeger
- **CI/CD**: GitHub Actions (build, test, security scan)
- **Security**: JWT, OAuth2 scopes, rate limiting

### Development Tools
- **Testing**: JUnit 5, Testcontainers, Playwright
- **Code Quality**: ESLint, Checkstyle, JaCoCo
- **Documentation**: OpenAPI/Swagger

## Security Features

### Authentication & Authorization
- JWT Bearer tokens via Keycloak
- OAuth2/OIDC compliance
- Role-based access control (RBAC)
- Scope-based permissions (`accounts:read`, `payments:write`)

### API Security
- OWASP ASVS L1 compliance
- Input validation and sanitization
- Rate limiting with Redis
- CORS configuration
- Security headers

### Infrastructure Security
- Non-root containers
- Minimal attack surface
- Encrypted communications
- Secure defaults

## Observability

### Metrics
- Application metrics (JVM, Node.js, Go)
- Business metrics (transactions, accounts)
- Infrastructure metrics (containers, databases)

### Tracing
- Distributed tracing with OpenTelemetry
- Service mesh visibility
- Performance monitoring
- Error tracking

### Logging
- Structured logging with correlation IDs
- Centralized log aggregation
- Log levels and filtering

## Local Development

### Prerequisites
- Docker and Docker Compose
- Java 17 (for Java services)
- Go 1.21+ (for Go services)
- Node.js 20+ (for gateway)
- Terraform (for infrastructure)

### Quick Start

1. **Clone and navigate**:
   ```bash
   cd apps/fintech
   ```

2. **Start infrastructure**:
   ```bash
   docker-compose -f ../../../deploy/fintech/docker-compose.yml up -d postgres redis redpanda localstack keycloak
   ```

3. **Initialize infrastructure**:
   ```bash
   # Initialize Terraform
   cd ../../../infra/fintech/terraform
   terraform init
   terraform apply

   # Import Keycloak realm
   curl -X POST http://localhost:8081/admin/realms \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d @../../../deploy/fintech/keycloak/fintech-realm.json
   ```

4. **Start services**:
   ```bash
   # Accounts service
   cd ../../../services/fintech/accounts
   ./mvnw spring-boot:run

   # Start other services similarly
   ```

5. **Start observability stack**:
   ```bash
   docker-compose -f ../../../deploy/fintech/docker-compose.yml up -d otel-collector prometheus grafana jaeger
   ```

### Access Points

- **API Gateway**: http://localhost:3000 (REST), http://localhost:4000 (GraphQL)
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Redpanda Console**: http://localhost:8080
- **Keycloak**: http://localhost:8081 (admin/admin123)

## API Examples

### Create Account
```bash
curl -X POST http://localhost:3000/v1/accounts \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "123456",
    "type": "ASSET",
    "currency": "USD"
  }'
```

### Get Account
```bash
curl -X GET http://localhost:3000/v1/accounts/{id} \
  -H "Authorization: Bearer <jwt-token>"
```

### GraphQL Query
```graphql
query GetAccounts {
  accounts {
    id
    accountNumber
    balance
    currency
  }
}
```

## Testing

### Unit Tests
```bash
# Java services
cd services/fintech/accounts
./mvnw test

# Go services
cd services/fintech/limits
go test ./...

# Node.js gateway
cd apps/fintech/gateway
npm test
```

### Integration Tests
```bash
# Java with Testcontainers
./mvnw verify

# End-to-end with Playwright
cd apps/fintech/gateway
npm run test:e2e
```

## Deployment

### Docker Build
```bash
# Build all services
docker-compose -f deploy/fintech/docker-compose.yml build

# Run full stack
docker-compose -f deploy/fintech/docker-compose.yml up
```

### Production Considerations
- Database connection pooling
- Horizontal scaling
- Load balancing
- Certificate management
- Backup strategies
- Disaster recovery

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Create pull request with conventional commit messages

### Code Quality
- Follow language-specific conventions
- Write comprehensive tests
- Update documentation
- Security review for sensitive changes

## Security

See [SECURITY.md](../../SECURITY.md) for security considerations and vulnerability reporting.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
