import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

import { logger } from '../utils/logger.js';

export function initializeTracing(): void {
  // Skip tracing initialization if disabled
  if (process.env.OTEL_ENABLED === 'false') {
    logger.info('OpenTelemetry tracing disabled');
    return;
  }

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  // Configure OTLP exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
    headers: {
      // Add any required headers for authentication
    },
  });

  // Configure resource attributes
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'graph-er-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.1.0',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'graph-er',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Initialize the SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Configure auto-instrumentations
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-graphql': {
          enabled: true,
        },
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
      }),
    ],
  });

  // Handle SDK initialization errors
  sdk.start()
    .then(() => {
      logger.info('OpenTelemetry tracing initialized', {
        endpoint: otelEndpoint,
        serviceName: 'graph-er-api',
      });
    })
    .catch((error) => {
      logger.error('Failed to initialize OpenTelemetry tracing', { error });
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry tracing shut down'))
      .catch((error) => logger.error('Error shutting down tracing', { error }))
      .finally(() => process.exit(0));
  });
}
