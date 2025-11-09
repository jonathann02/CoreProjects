import pino from 'pino';

// Create logger instance with appropriate configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive information
  redact: [
    'password',
    'token',
    'authorization',
    'cookie',
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.token',
    '*.authorization',
  ],
  // Add service context
  base: {
    service: 'graph-er-api',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Export child logger factory for different contexts
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};
