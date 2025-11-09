const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

/**
 * Initialize OpenTelemetry SDK for Node.js applications
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Name of the service
 * @param {string} options.serviceVersion - Version of the service (optional)
 * @param {string} options.otelEndpoint - OTLP endpoint URL (default: http://otel-collector:4318)
 * @param {boolean} options.enabled - Whether to enable telemetry (default: true)
 */
function initializeTelemetry({
  serviceName,
  serviceVersion = '1.0.0',
  otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318',
  enabled = process.env.OTEL_TRACES_EXPORTER !== 'none'
} = {}) {
  if (!enabled) {
    console.log('OpenTelemetry telemetry is disabled');
    return null;
  }

  if (!serviceName) {
    throw new Error('serviceName is required for telemetry initialization');
  }

  console.log(`Initializing OpenTelemetry for service: ${serviceName}`);

  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'fintech-platform',
  });

  // Configure OTLP trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
    headers: {},
  });

  // Configure OTLP metrics exporter
  const metricExporter = new OTLPMetricExporter({
    url: `${otelEndpoint}/v1/metrics`,
    headers: {},
  });

  // Initialize the SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable file system instrumentation as it can be noisy
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        // Configure HTTP instrumentation
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        // Configure Express instrumentation
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        // Configure GraphQL instrumentation
        '@opentelemetry/instrumentation-graphql': {
          enabled: true,
        },
        // Configure Redis instrumentation
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
      }),
    ],
  });

  // Start the SDK
  sdk
    .start()
    .then(() => {
      console.log(`OpenTelemetry initialized successfully for ${serviceName}`);
    })
    .catch((error) => {
      console.error('Error initializing OpenTelemetry', error);
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => {
        console.log('OpenTelemetry shut down successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error shutting down OpenTelemetry', error);
        process.exit(1);
      });
  });

  return sdk;
}

module.exports = {
  initializeTelemetry,
};
