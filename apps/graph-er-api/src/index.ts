import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { register, collectDefaultMetrics } from 'prom-client';

import { createHealthRoutes } from './routes/health.js';
import { createUploadRoutes } from './routes/upload.js';
import { initializeNeo4j } from './database/neo4j.js';
import { logger } from './utils/logger.js';

// Initialize Neo4j connection and constraints
let neo4jDriver: any;
try {
  neo4jDriver = await initializeNeo4j();
  logger.info('Neo4j connection established');
} catch (error) {
  logger.error('Failed to initialize Neo4j', { error });
  process.exit(1);
}

// Collect default Node.js metrics
collectDefaultMetrics();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For GraphQL playground in dev
      scriptSrc: ["'self'"], // No inline scripts
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration - restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Request logging
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'info';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, _res, err) => {
    return `Request failed: ${err?.message || 'Unknown error'}`;
  },
  // Redact sensitive headers
  redact: ['req.headers.authorization', 'req.headers.cookie'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health and metrics routes
app.use('/', createHealthRoutes());
app.use('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).end();
  }
});

// Upload routes (REST API)
app.use('/v1', createUploadRoutes());

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.Function) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(error.status || 500).json({
    error: {
      message: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack }),
    },
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

app.listen(PORT, () => {
  logger.info(`Graph & Entity Resolution API running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});
