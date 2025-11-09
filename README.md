# Graph & Entity Resolution Lab

A comprehensive platform for entity resolution, deduplication, and graph-based data analysis built with modern web technologies and graph databases.

## 🚀 Features

- **CSV Upload & Processing**: Streamlined upload with real-time validation and schema preview
- **Entity Resolution**: Advanced deduplication using fuzzy matching and similarity algorithms
- **Graph Visualization**: Interactive Cytoscape.js graphs for exploring entity relationships
- **REST & GraphQL APIs**: Dual API approach for maximum flexibility
- **Observability**: OpenTelemetry tracing, Prometheus metrics, and Grafana dashboards
- **Security First**: Input validation, rate limiting, CORS, and comprehensive security headers
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Testing**: Unit, integration, and E2E tests with comprehensive coverage

## 🏗️ Architecture

```
├── apps/
│   ├── graph-er-api/          # Node.js/Express API with GraphQL
│   └── graph-er-web/          # React/Vite frontend with Cytoscape.js
├── packages/
│   └── shared/                # Shared types, schemas, and utilities
├── infra/
│   └── graph-er/              # Docker Compose with Neo4j + Observability
└── fixtures/                  # Sample CSV files for testing
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with Apollo GraphQL
- **Database**: Neo4j with APOC and Graph Data Science
- **Validation**: Zod schemas
- **Streaming**: CSV parsing with streaming ETL pipeline
- **Observability**: OpenTelemetry, Pino logging

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: TanStack Query
- **Visualization**: Cytoscape.js with multiple layout algorithms
- **Styling**: Tailwind CSS

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: Neo4j 5.24 with plugins
- **Monitoring**: Prometheus + Grafana
- **Tracing**: OpenTelemetry Collector

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm or pnpm

### 1. Clone and Install

```bash
git clone <repository-url>
cd CoreProjects
npm install
```

### 2. Start Infrastructure

```bash
# Start Neo4j, OTEL Collector, Prometheus, and Grafana
npm run docker:up
```

**Service Endpoints:**
- Neo4j Browser: http://localhost:7474 (neo4j/grapher123)
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Development Servers

```bash
# Terminal 1: Start API
cd apps/graph-er-api && npm run dev

# Terminal 2: Start Web App
cd apps/graph-er-web && npm run dev
```

**Access the application:**
- Web UI: http://localhost:3001
- GraphQL API: http://localhost:4000/graphql
- Health Check: http://localhost:4000/healthz

## 📊 Usage

### Upload Data

1. Navigate to the Upload page
2. Drag & drop a CSV file or click to browse
3. Preview the data and validate schema
4. Upload and process the batch

### Explore Results

1. **Batches Page**: View upload history and processing status
2. **Clusters Page**: Interactive graph visualization of entity relationships
3. **Records Page**: Detailed view of individual golden records

### CSV Format

```csv
name,email,phone,address,organizationName
John Smith,john@example.com,+1-555-0123,123 Main St,Tech Corp
Jane Doe,jane@example.com,+1-555-0456,456 Oak Ave,Data Inc
```

**Required columns:** `name`, `email` (case-insensitive)

## 🔧 Development

### Available Scripts

```bash
# Root level
npm run lint              # Lint all workspaces
npm run typecheck         # Type check all workspaces
npm run test              # Run all tests
npm run build             # Build all workspaces
npm run docker:up         # Start infrastructure
npm run docker:down       # Stop infrastructure

# API specific
cd apps/graph-er-api
npm run dev               # Start development server
npm run test:unit         # Unit tests
npm run test:int          # Integration tests

# Web specific
cd apps/graph-er-web
npm run dev               # Start development server
npm run test:e2e          # E2E tests with Playwright

# Shared package
cd packages/shared
npm run test              # Unit tests
npm run build             # Build package
```

### Testing

```bash
# Run all tests
npm run test

# Run E2E tests (requires running app)
npm run test:e2e

# Run with coverage
npm run test -- --coverage
```

## 🔒 Security

### Threat Model

**Data Protection:**
- All PII is validated and normalized before storage
- No sensitive data logged in application logs
- Database queries use parameterized statements
- File uploads are validated and sanitized

**Access Control:**
- CORS configured for specific origins only
- Rate limiting on all endpoints (except health checks)
- Input validation with Zod schemas
- GraphQL query complexity limits

**Infrastructure Security:**
- Containerized deployment with minimal attack surface
- Neo4j constraints prevent data corruption
- OpenTelemetry provides observability without exposing internals

### Security Features

- ✅ HTTP Security Headers (Helmet)
- ✅ Input Sanitization & Validation
- ✅ Rate Limiting (express-rate-limit)
- ✅ CORS Protection
- ✅ GraphQL Security (depth/complexity limits)
- ✅ Parameterized Database Queries
- ✅ Safe Error Messages (no stack traces in production)
- ✅ File Upload Validation (type, size, content)

## 📈 Monitoring & Observability

### Metrics
- Application performance metrics via Prometheus
- Neo4j database metrics
- HTTP request/response metrics
- ETL processing statistics

### Tracing
- OpenTelemetry distributed tracing
- Request lifecycle tracing
- Database query tracing
- GraphQL resolver tracing

### Logging
- Structured logging with Pino
- Request ID correlation
- Configurable log levels
- PII-safe logging (redacts sensitive data)

### Dashboards
- Pre-configured Grafana dashboards
- Real-time metrics visualization
- ETL processing monitoring
- System health overview

## 🧪 Testing Strategy

### Unit Tests
- Pure function testing (normalization, validation)
- Component testing with React Testing Library
- Utility function coverage

### Integration Tests
- Neo4j database constraints and queries
- ETL pipeline end-to-end testing
- API endpoint testing with Testcontainers

### E2E Tests
- Playwright-based browser automation
- Complete user workflows (upload → process → review)
- Cross-browser compatibility testing

### Security Tests
- Input validation edge cases
- Rate limiting verification
- File upload security
- GraphQL query security

## 🚢 Production Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f infra/graph-er/docker-compose.yml up -d

# Scale services as needed
docker-compose up -d --scale graph-er-api=3
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
NEO4J_PASSWORD=your-secure-password
ALLOWED_ORIGINS=https://yourdomain.com
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint.com
```

### Health Checks & Monitoring

- Kubernetes readiness/liveness probes
- External monitoring integration
- Log aggregation setup
- Backup and disaster recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit a pull request

### Code Quality

- ESLint + Prettier enforced
- TypeScript strict mode
- 100% test coverage target
- Conventional commits required

## 📚 API Documentation

### REST Endpoints

- `GET /healthz` - Health check
- `GET /readyz` - Readiness check
- `GET /metrics` - Prometheus metrics
- `POST /v1/upload/start` - Start file upload
- `POST /v1/upload/:sessionId/chunk` - Upload file chunk
- `POST /v1/upload/:sessionId/commit` - Process uploaded file

### GraphQL Schema

```graphql
type Query {
  goldenRecords(pagination: PaginationInput, search: SearchInput): GoldenRecordsResult!
  matchClusters(pagination: PaginationInput, status: ClusterStatus): MatchClustersResult!
  batches(pagination: PaginationInput, status: BatchStatus): BatchesResult!
}

type Mutation {
  acceptMerge(clusterId: ID!, chosenRecordId: ID): Boolean!
  splitRecord(recordId: ID!): Boolean!
  reindexBatch(batchId: ID!): Boolean!
}
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Neo4j for the graph database
- Cytoscape.js for graph visualization
- OpenTelemetry for observability
- The open source community

---

**Built with ❤️ for entity resolution and data quality excellence**