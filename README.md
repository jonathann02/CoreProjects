# Catalog Suite

A production-grade catalog service built with .NET 8, Minimal APIs, and DDD/CQRS patterns. Implements enterprise security standards and observability best practices.

## Architecture

- **Domain Layer** (`libs/catalog-domain`): Core business logic, entities, and invariants
- **Application Layer** (`libs/catalog-application`): Use cases, commands, queries, and DTOs
- **Infrastructure Layer** (`libs/catalog-infrastructure`): EF Core, repositories, migrations
- **API Layer** (`services/catalog-api`): Minimal API endpoints with security and observability

## Features

- ✅ RESTful Product management API (CRUD operations)
- ✅ JWT Bearer authentication with role-based authorization
- ✅ Rate limiting (100 req/min per IP, 1000 req/hour)
- ✅ OpenTelemetry tracing, metrics, and logs (OTLP to Jaeger)
- ✅ Health checks (liveness/readiness)
- ✅ Comprehensive testing (unit + integration with Testcontainers)
- ✅ Security hardening (OWASP ASVS L1, API Security Top 10)
- ✅ CI/CD with GitHub Actions (build, test, coverage, CodeQL)
- ✅ Docker Compose for local development

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/products` | Create product | ✅ `products:write` |
| GET | `/v1/products/{id}` | Get product by ID | ❌ |
| GET | `/v1/products` | List products (paginated) | ❌ |
| PUT | `/v1/products/{id}` | Update product | ✅ `products:write` |
| DELETE | `/v1/products/{id}` | Soft delete product | ✅ `products:write` |
| GET | `/health/live` | Liveness check | ❌ |
| GET | `/health/ready` | Readiness check | ❌ |

### Request/Response Examples

#### Create Product
```bash
POST /v1/products
Content-Type: application/json
Authorization: Bearer {jwt-token}

{
  "sku": "PROD001",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 199.99,
  "currency": "USD",
  "stockQty": 50
}
```

#### List Products
```bash
GET /v1/products?page=1&pageSize=20&search=headphones&sortBy=name&sortOrder=asc
```

## Getting Started

### Prerequisites

- .NET 8.0 SDK
- Docker and Docker Compose
- SQL Server (local or containerized)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd catalog-suite
   ```

2. **Start the local stack**
   ```bash
   cd deploy/docker
   docker compose up -d
   ```

3. **Verify the stack is running**
   - API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger
   - Jaeger UI: http://localhost:16686
   - Health checks: http://localhost:8080/health/live

4. **Run tests**
   ```bash
   dotnet test
   ```

### Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Environment (Development/Staging/Production) | Development |
| `ConnectionStrings__CatalogDatabase` | SQL Server connection string | Required |
| `Auth__Authority` | JWT issuer URL | Required |
| `Auth__Audience` | JWT audience | Required |
| `IpRateLimiting__EnableEndpointRateLimiting` | Enable rate limiting | true |

#### Development Configuration

For local development with Docker Compose:
```bash
# API Configuration
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__CatalogDatabase=Server=sqledge;Database=CatalogDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;
Auth__Authority=https://localhost:5001
Auth__Audience=catalog-api

# Rate Limiting
IpRateLimiting__EnableEndpointRateLimiting=true
IpRateLimiting__GeneralRules__0__Endpoint=*
IpRateLimiting__GeneralRules__0__Period=1m
IpRateLimiting__GeneralRules__0__Limit=100
```

## Security

This project implements comprehensive security controls based on:

- **OWASP Application Security Verification Standard (ASVS) 5.0** (Level 1)
- **OWASP API Security Top 10 (2023)**
- **NIST Secure Software Development Framework (SSDF)**
- **MITRE CWE Top 25**

### Security Features

- **Authentication**: JWT Bearer tokens with configurable issuer/audience
- **Authorization**: Policy-based access control (`products:write` policy)
- **Input Validation**: Server-side validation with RFC 7807 ProblemDetails
- **Rate Limiting**: IP-based rate limiting to prevent abuse
- **HTTPS**: TLS 1.2+ required in production
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, HSTS
- **Data Protection**: RowVersion for optimistic concurrency
- **Logging**: Structured logging without sensitive data
- **CORS**: Restrictive CORS policy (localhost only in development)

See [SECURITY.md](SECURITY.md) for detailed security analysis.

## Testing

### Unit Tests
```bash
dotnet test tests/unit/Catalog.UnitTests.csproj
```

### Integration Tests
```bash
dotnet test tests/integration/Catalog.IntegrationTests.csproj
```

Integration tests use Testcontainers to spin up SQL Server containers for isolated testing.

## Deployment

### Docker Compose (Development)

```bash
cd deploy/docker
docker compose up -d
```

### Production Considerations

- Use managed SQL Server/Azure SQL Database
- Configure proper JWT issuer (Auth0, Azure AD, etc.)
- Set up proper CORS origins
- Enable HSTS and security headers
- Configure log aggregation (ELK stack, Azure Monitor, etc.)
- Set up monitoring and alerting
- Use Azure Key Vault or similar for secrets management

## Monitoring & Observability

### OpenTelemetry
- **Traces**: ASP.NET Core requests, EF Core database calls
- **Metrics**: HTTP request metrics, system metrics
- **Logs**: Structured logging with OTLP export

### Health Checks
- **Liveness**: Process health (`/health/live`)
- **Readiness**: Database connectivity (`/health/ready`)

### Jaeger Integration
View traces at http://localhost:16686 when running Docker Compose.

## CI/CD

GitHub Actions workflows provide:

- **Build & Test**: Automated build, unit tests, integration tests
- **Code Coverage**: Codecov integration
- **Security Scanning**: CodeQL analysis
- **Dependency Updates**: Dependabot for NuGet, GitHub Actions, Docker

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- Follow C# coding conventions
- Use nullable reference types
- Write comprehensive unit tests
- Follow SOLID principles and DDD patterns
- Security-first approach to all features

## License

This project is licensed under the MIT License - see the LICENSE file for details.
