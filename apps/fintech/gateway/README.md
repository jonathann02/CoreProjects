# Gateway Service

FinTech API Gateway - Unified GraphQL and REST API with JWT authentication and rate limiting.

## Overview

This service provides a unified API interface for the entire FinTech platform including:
- GraphQL API for complex queries and mutations
- REST API for simple operations
- JWT-based authentication with Keycloak
- Redis-backed rate limiting
- Request routing to downstream services
- OpenTelemetry observability integration

## Architecture

### API Layers
- **GraphQL Layer**: Apollo Server with schema stitching
- **REST Layer**: Express.js with middleware stack
- **Authentication**: JWT validation with jose library
- **Rate Limiting**: Redis-backed request throttling
- **Service Proxy**: HTTP client for downstream services

### Security Features
- JWT Bearer token authentication
- OAuth2/OIDC integration with Keycloak
- Scope-based authorization
- Rate limiting per user/IP
- CORS configuration
- Helmet security headers

### Observability
- OpenTelemetry tracing with OTLP exporter
- Winston structured logging
- Prometheus metrics integration
- Health checks and readiness probes

## Technologies

- **Node.js 20** with TypeScript
- **Apollo Server** for GraphQL
- **Express.js** for REST API
- **Redis** for rate limiting and caching
- **JOSE** for JWT validation
- **Winston** for logging
- **OpenTelemetry** for observability

## Key Features

### Dual API Support
- **GraphQL** (port 4000): Complex queries, real-time subscriptions
- **REST** (port 3000): Simple CRUD operations, legacy compatibility

### Authentication & Authorization
- JWT validation with JWKS endpoint
- Scope-based permissions (`accounts:read`, `payments:write`)
- User context propagation to downstream services
- Automatic token refresh handling

### Rate Limiting
- Redis-backed atomic operations
- Configurable requests per minute
- Rate limit headers in responses
- Graceful degradation on Redis failure

### Service Integration
- HTTP client with connection pooling
- Circuit breaker pattern (configurable)
- Request/response transformation
- Error aggregation and normalization

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | GraphQL server port |
| `REST_PORT` | `3000` | REST API server port |
| `NODE_ENV` | `development` | Environment (affects logging/security) |
| `LOG_LEVEL` | `info/debug` | Winston log level |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | - | Redis password |
| `KEYCLOAK_ISSUER_URL` | - | Keycloak issuer URL for JWT validation |
| `ACCOUNTS_SERVICE_URL` | `http://localhost:8082` | Accounts service URL |
| `PAYMENTS_SERVICE_URL` | `http://localhost:8083` | Payments service URL |
| `LIMITS_SERVICE_URL` | `http://localhost:8084` | Limits service URL |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `10` | Rate limit per user |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:4000` | CORS allowed origins |

### Example Configuration
```bash
export PORT=4000
export REST_PORT=3000
export NODE_ENV=production
export LOG_LEVEL=info
export REDIS_HOST=redis
export REDIS_PORT=6379
export KEYCLOAK_ISSUER_URL=http://keycloak:8080/realms/fintech
export ACCOUNTS_SERVICE_URL=http://accounts-service:8080
export PAYMENTS_SERVICE_URL=http://payments-service:8080
export LIMITS_SERVICE_URL=http://limits-service:8080
export RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## API Endpoints

### GraphQL API (Port 4000)

#### Queries
```graphql
# Health check
query {
  health
}

# Get account
query GetAccount($id: UUID!) {
  account(id: $id) {
    id
    accountNumber
    type
    currency
    status
    balance
    createdAt
    updatedAt
  }
}

# Get payment
query GetPayment($id: UUID!) {
  payment(id: $id) {
    id
    idempotencyKey
    fromAccountId
    toAccountId
    amount
    currency
    description
    status
    failureReason
    createdAt
    updatedAt
    sentAt
  }
}
```

#### Mutations
```graphql
# Create account
mutation CreateAccount($input: CreateAccountInput!) {
  createAccount(input: $input) {
    id
    accountNumber
    type
    currency
    status
    balance
    createdAt
  }
}

# Initiate payment
mutation InitiatePayment($input: InitiatePaymentInput!, $idempotencyKey: UUID!) {
  initiatePayment(input: $input, idempotencyKey: $idempotencyKey) {
    id
    idempotencyKey
    fromAccountId
    toAccountId
    amount
    currency
    description
    status
    createdAt
  }
}

# Evaluate limit
mutation EvaluateLimit($input: EvaluateLimitInput!) {
  evaluateLimit(input: $input) {
    allowed
    remaining
    limitAmount
    usedAmount
    limitType
    accountId
    errorMessage
  }
}
```

### REST API (Port 3000)

#### Health Check
```http
GET /health
GET /ready
```

#### Accounts
```http
GET /api/accounts/:id
```

#### Payments
```http
POST /api/payments
```

## Authentication

### JWT Token Requirements
All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Required Scopes

| Endpoint | Required Scope |
|----------|----------------|
| `account(id)` | `accounts:read` |
| `createAccount` | `accounts:write` |
| `payment(id)` | `payments:read` |
| `initiatePayment` | `payments:write` |
| `evaluateLimit` | None (service-level) |

### Token Validation
- Validates signature using JWKS from Keycloak
- Checks token expiration
- Verifies audience and issuer
- Extracts user context and scopes

## Rate Limiting

### Implementation
- Redis-backed rate limiting with atomic operations
- Per-user limiting based on JWT subject
- Sliding window algorithm (1 minute)
- HTTP headers in responses

### Response Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2024-01-01T10:01:00.000Z
```

### Rate Limit Exceeded
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 60 requests per minute.",
  "retryAfter": 60
}
```

## Error Handling

### GraphQL Errors
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "locations": [{"line": 2, "column": 3}],
      "path": ["account"],
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### REST Errors
```json
{
  "error": "Unauthorized",
  "message": "Authorization header is required"
}
```

### Common Error Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient scopes)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Service Communication

### Downstream Service Calls
- HTTP/1.1 with connection keep-alive
- 30-second timeout per request
- Automatic retry for transient failures
- Circuit breaker pattern (configurable)

### Error Propagation
- Service errors mapped to appropriate HTTP status codes
- Error details sanitized for security
- Correlation IDs maintained across service calls

## Observability

### Tracing
- OpenTelemetry integration with OTLP exporter
- Distributed tracing across GraphQL resolvers
- Service call tracing to downstream APIs
- Performance monitoring

### Logging
- Structured JSON logging with Winston
- Request/response logging with correlation IDs
- Error logging with stack traces
- Configurable log levels

### Metrics
- Apollo Server GraphQL metrics
- HTTP request/response metrics
- Rate limiting metrics
- Downstream service call metrics

## Running Locally

### Prerequisites
- Node.js 20+
- Redis
- Keycloak (for authentication)
- Downstream services (Accounts, Payments, Limits)

### Commands
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run in production
npm start

# Run tests
npm test

# Run with Docker
docker build -t fintech/gateway .
docker run -p 4000:4000 -p 3000:3000 \
  -e KEYCLOAK_ISSUER_URL=http://localhost:8081/realms/fintech \
  fintech/gateway
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
# With test services
npm run test:integration
```

### E2E Tests
```bash
# With Playwright
npm run test:e2e
```

### Manual Testing
```bash
# GraphQL query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "query { health }"}'

# REST API call
curl -X GET http://localhost:3000/api/accounts/123 \
  -H "Authorization: Bearer <token>"
```

## Development

### Code Organization
```
├── src/
│   ├── graphql/          # GraphQL schema and resolvers
│   ├── middleware/       # Express middleware (auth, rate limit, etc.)
│   ├── rest/            # REST API routes
│   ├── services/        # Business logic and service clients
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── test/                # Test files
├── Dockerfile          # Container build
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── .eslintrc.js        # ESLint configuration
```

### Adding New GraphQL Types
1. Update `typeDefs.ts` with new types/queries/mutations
2. Add resolver functions in `resolvers.ts`
3. Update TypeScript types if needed
4. Add tests for new functionality

### Adding New REST Endpoints
1. Create new route handlers in `rest/`
2. Add authentication/rate limiting middleware
3. Update error handling
4. Add tests and documentation

### Security Considerations
- Validate all inputs
- Sanitize error messages
- Use parameterized queries
- Implement proper CORS policies
- Regular dependency updates

## Deployment

### Docker
```bash
docker build -t fintech/gateway .
```

### Docker Compose
Part of the full FinTech platform stack:

```bash
cd ../../../deploy/fintech
docker-compose up gateway
```

### Production Checklist
- Environment variables properly set
- Redis connectivity verified
- Keycloak JWKS endpoint accessible
- Downstream services healthy
- SSL/TLS certificates configured
- Monitoring and alerting set up

## Contributing

### Development Workflow
1. Create feature branch
2. Write tests for new functionality
3. Implement changes with proper TypeScript types
4. Update GraphQL schema documentation
5. Submit pull request with comprehensive tests

### Code Quality
- TypeScript strict mode enabled
- ESLint rules enforced
- 100% test coverage for critical paths
- Security code review required
- Performance considerations documented

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
