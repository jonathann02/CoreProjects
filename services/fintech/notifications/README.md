# Notifications Service

FinTech Notifications Service - Event-driven multi-channel notification system.

## Overview

This service provides comprehensive notification capabilities including:
- Event-driven notification processing from Kafka
- Multi-channel delivery (Email, SMS, Push notifications)
- SNS/SQS fan-out architecture for reliable delivery
- Template-based notification rendering
- Retry logic with exponential backoff
- PostgreSQL persistence for audit trails

## Architecture

### Domain Layer
- `Notification`: Core entity with delivery state and retry logic
- `NotificationType`: EMAIL, SMS, PUSH notification types
- `NotificationStatus`: PENDING, SENT, FAILED, DELIVERED states
- `NotificationTemplate`: Predefined templates for different event types

### Infrastructure Layer
- `NotificationRepository`: PostgreSQL persistence with indexing
- AWS SNS/SQS integration for message fan-out and queuing
- Kafka consumer for event processing
- OpenTelemetry tracing integration

### Event Processing Layer
- `NotificationService`: Business logic for notification creation and delivery
- Event handlers for different payment events (initiated, completed, failed)
- Template rendering with Go text/template

## Technologies

- **Go 1.21** with standard library and AWS SDK
- **PostgreSQL** for notification persistence and audit trails
- **Kafka** (Redpanda) for event streaming
- **AWS SNS/SQS** for message fan-out and queuing (LocalStack in dev)
- **OpenTelemetry** for observability
- **Gorilla Mux** for HTTP routing
- **Logrus** for structured logging

## Key Features

### Event-Driven Processing
- Kafka consumer subscribes to payment events
- Automatic notification creation for all channels
- Template-based message rendering with event data
- Priority-based processing

### Multi-Channel Delivery
- **Email**: Full HTML/text notifications via SNS
- **SMS**: Concise text messages via SNS
- **Push**: Device notifications via SNS
- Configurable recipient resolution per channel

### Reliable Delivery
- SNS topic publishing with message attributes for filtering
- SQS queue fan-out for each notification type
- Dead letter queues for failed deliveries
- Retry logic with configurable attempts and delays

### Audit Trail
- Complete notification history in PostgreSQL
- Status tracking (PENDING → SENT → DELIVERED/FAILED)
- Retry attempts and error logging
- Performance metrics and analytics

## Database Schema

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE
);
```

## Event Processing

### Payment Events
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

For each payment event, notifications are created for:
- **PaymentInitiated**: Sent when payment starts processing
- **PaymentCompleted**: Sent when payment succeeds
- **PaymentFailed**: Sent when payment fails

### Notification Templates

Templates are predefined for each event type and channel:

```go
// Email template for payment initiated
Subject: "Payment Initiated - {{.PaymentID}}"
Body: "Your payment of {{.Amount}} {{.Currency}} has been initiated. Payment ID: {{.PaymentID}}"

// SMS template for payment completed
Body: "Payment completed: {{.Amount}} {{.Currency}}. ID: {{.PaymentID}}"
```

## AWS Integration

### SNS Topic
- Single topic: `fintech-notifications`
- Message attributes for filtering by notification type
- Publishers: Notifications service
- Subscribers: SQS queues for each channel

### SQS Queues
- **Email Queue**: `fintech-email-notifications`
- **SMS Queue**: `fintech-sms-notifications`
- **Push Queue**: `fintech-push-notifications`
- Each queue has a dead letter queue for failed messages

### Message Flow
```
Payment Event → Kafka → Notifications Service → SNS Topic → SQS Queues → Channel Processors
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | - | PostgreSQL connection URL (required) |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | LocalStack endpoint |
| `AWS_REGION` | `us-east-1` | AWS region |
| `SNS_TOPIC_ARN` | - | SNS topic ARN |
| `EMAIL_QUEUE_URL` | - | Email SQS queue URL |
| `SMS_QUEUE_URL` | - | SMS SQS queue URL |
| `PUSH_QUEUE_URL` | - | Push SQS queue URL |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | OTLP endpoint |
| `MAX_RETRIES` | `3` | Max notification retry attempts |
| `RETRY_DELAY` | `5s` | Delay between retry attempts |
| `ENVIRONMENT` | `development` | Environment (affects logging) |

### Example Configuration
```bash
export PORT=8080
export DATABASE_URL="postgres://user:pass@localhost:5432/fintech?sslmode=disable"
export KAFKA_BROKERS="redpanda:9092"
export AWS_ENDPOINT_URL="http://localhost:4566"
export SNS_TOPIC_ARN="arn:aws:sns:us-east-1:000000000000:fintech-notifications"
export EMAIL_QUEUE_URL="http://localhost:4566/000000000000/fintech-email-notifications"
export SMS_QUEUE_URL="http://localhost:4566/000000000000/fintech-sms-notifications"
export PUSH_QUEUE_URL="http://localhost:4566/000000000000/fintech-push-notifications"
```

## API Endpoints

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
Prometheus metrics endpoint.

## Running Locally

### Prerequisites
- Go 1.21+
- PostgreSQL 16
- Kafka (Redpanda)
- LocalStack (for AWS services)

### Commands
```bash
# Install dependencies
go mod tidy

# Run with environment variables
go run cmd/main.go

# Build binary
go build -o notifications-service cmd/main.go

# Run binary
./notifications-service

# Run with Docker
docker build -t notifications-service .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/fintech" \
  notifications-service
```

## Testing

### Unit Tests
```bash
go test ./...
```

### Integration Tests
```bash
# With test database and LocalStack
go test -tags=integration ./...
```

### Manual Testing
```bash
# Check health
curl http://localhost:8080/health

# Trigger payment event (via Kafka producer)
# Notifications will be created automatically
```

## Observability

### Tracing
- OpenTelemetry integration with OTLP exporter
- Traces for event processing and notification delivery
- AWS SDK instrumentation
- Database query tracing

### Metrics
- HTTP request metrics (Gorilla Mux)
- Notification delivery metrics
- Queue processing metrics
- Error rate and retry metrics
- Prometheus integration

### Logging
- Structured JSON logging with Logrus
- Event processing logs with correlation IDs
- AWS operation logging
- Error logging with stack traces

## Processing Flow

### Event Consumption
1. Kafka consumer receives payment event
2. Event is parsed and validated
3. Templates are selected based on event type
4. Notifications are created for all channels
5. Notifications are persisted to database

### Message Delivery
1. Notifications are published to SNS topic
2. SNS fans out to appropriate SQS queues
3. Queue consumers process notifications
4. Delivery status is updated in database
5. Failed deliveries are retried with backoff

### Error Handling
- Failed deliveries are retried up to `max_retries`
- Exponential backoff between retry attempts
- Permanent failures are marked and logged
- Dead letter queues for unprocessable messages

## Development

### Code Organization
```
├── cmd/                 # Application entrypoints
├── internal/
│   ├── config/         # Configuration management
│   ├── domain/         # Domain models and business logic
│   ├── handlers/       # Event handlers and business services
│   └── infrastructure/ # Database and external service adapters
├── pkg/                # Shared packages
│   ├── database/       # PostgreSQL connection and migrations
│   ├── kafka/          # Kafka client and event handling
│   ├── aws/            # AWS SNS/SQS integration
│   └── otel/           # OpenTelemetry integration
├── migrations/         # Database migration scripts
└── Dockerfile          # Container build configuration
```

### Adding New Event Types
1. Add template to `GetTemplate` function
2. Update event processing in `HandlePaymentEvent`
3. Add new event struct if needed
4. Update tests

### Adding New Channels
1. Add new `NotificationType`
2. Update AWS configuration
3. Add queue URL configuration
4. Update template system

### Testing Strategy
- Unit tests for domain logic
- Integration tests with test database
- AWS LocalStack for infrastructure testing
- Kafka test containers for event testing

## Deployment

### Docker
```bash
docker build -t fintech/notifications-service .
```

### Docker Compose
Part of the full FinTech platform stack:

```bash
cd ../../../deploy/fintech
docker-compose up notifications-service
```

### Production Considerations
- AWS IAM roles for service access
- VPC configuration for security
- CloudWatch monitoring and alerts
- Auto-scaling based on queue depth
- Database read replicas for analytics

## Security

### AWS Security
- IAM policies with minimal required permissions
- VPC endpoints for internal communication
- Encryption in transit and at rest
- Regular credential rotation

### Data Protection
- No sensitive data in logs
- Message encryption in SQS
- Database encryption
- GDPR compliance considerations

### Monitoring
- Failed delivery alerts
- Queue depth monitoring
- Error rate tracking
- Performance metrics

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
- Proper error handling and logging
- Clean, idiomatic Go code
- Security code review

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
