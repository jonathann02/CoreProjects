# Catalog Suite

A production-grade catalog service built with .NET 8, Minimal APIs, and DDD/CQRS patterns.

## Architecture

- **Domain Layer**: Core business logic and entities
- **Application Layer**: Use cases and command/query handlers
- **Infrastructure Layer**: EF Core, repositories, external services
- **API Layer**: Minimal API endpoints with security and observability

## Features

- RESTful Product management API
- JWT Bearer authentication
- Rate limiting and security hardening
- OpenTelemetry observability
- Health checks
- Comprehensive testing

## Getting Started

### Prerequisites

- .NET 8.0 SDK
- Docker and Docker Compose (for local development)

### Local Development

1. Clone the repository
2. Run `docker compose up` to start the local stack
3. The API will be available at `http://localhost:8080`

### Running Tests

```bash
dotnet test
```

## Security

This project follows OWASP ASVS 5.0, API Security Top 10 (2023), and NIST SSDF guidelines.
See [SECURITY.md](SECURITY.md) for details.
