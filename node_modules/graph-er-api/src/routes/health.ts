import express from 'express';
import { getDriver } from '../database/neo4j.js';
import { logger } from '../utils/logger.js';

export function createHealthRoutes(): express.Router {
  const router = express.Router();

  /**
   * Liveness probe - indicates if the application is running
   * Should respond quickly and not perform heavy operations
   */
  router.get('/healthz', async (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    });
  });

  /**
   * Readiness probe - indicates if the application is ready to serve traffic
   * Should verify dependencies like database connectivity
   */
  router.get('/readyz', async (req, res) => {
    try {
      // Check Neo4j connectivity
      const driver = getDriver();
      const session = driver.session();
      await session.run('RETURN 1 as health_check');
      await session.close();

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
        },
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
        },
        error: process.env.NODE_ENV === 'development' ? error : 'Database check failed',
      });
    }
  });

  return router;
}
