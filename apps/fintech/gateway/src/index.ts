import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import rateLimit from 'express-rate-limit';
import { json } from 'body-parser';

import { initializeTelemetry } from '@fintech/telemetry';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { jwtAuth } from './middleware/jwtAuth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { healthRouter } from './rest/health';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { context } from './graphql/context';

async function startServer() {
  // Initialize OpenTelemetry
  initializeTelemetry({
    serviceName: 'gateway',
    serviceVersion: '1.0.0',
  });

  const app = express();
  const PORT = process.env.PORT || 4000;
  const REST_PORT = process.env.REST_PORT || 3000;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : ['http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Body parsing
  app.use(json({ limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // Health check endpoint
  app.use('/health', healthRouter);

  // Create GraphQL schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      logger.error('GraphQL Error', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_ERROR',
        },
      };
    },
  });

  await server.start();

  // GraphQL endpoint with authentication
  app.use(
    '/graphql',
    jwtAuth,
    rateLimitMiddleware,
    expressMiddleware(server, {
      context: context,
    })
  );

  // REST API endpoints
  app.get('/api/accounts/:id', jwtAuth, rateLimitMiddleware, async (req, res) => {
    try {
      // Forward to accounts service
      const response = await fetch(`${process.env.ACCOUNTS_SERVICE_URL}/v1/accounts/${req.params.id}`, {
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logger.error('Error fetching account', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/payments', jwtAuth, rateLimitMiddleware, async (req, res) => {
    try {
      // Forward to payments service
      const response = await fetch(`${process.env.PAYMENTS_SERVICE_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json',
          'Idempotency-Key': req.headers['idempotency-key'] || '',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      logger.error('Error creating payment', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Error handling middleware
  app.use(errorHandler);

  // Start GraphQL server (port 4000)
  app.listen(PORT, () => {
    logger.info(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
  });

  // Start REST API server (port 3000) - separate server for REST endpoints
  const restApp = express();
  restApp.use(helmet());
  restApp.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : ['http://localhost:3000'],
    credentials: true,
  }));
  restApp.use(json());

  // Mount REST routes
  restApp.use('/api', healthRouter);
  restApp.use('/api/accounts', jwtAuth, rateLimitMiddleware);
  restApp.use('/api/payments', jwtAuth, rateLimitMiddleware);

  restApp.listen(REST_PORT, () => {
    logger.info(`🌐 REST API server ready at http://localhost:${REST_PORT}/api`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
