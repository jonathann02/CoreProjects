import { Router } from 'express';
import { logger } from '../utils/logger';

export const healthRouter = Router();

// Health check endpoint
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'gateway',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness check
healthRouter.get('/ready', async (req, res) => {
  try {
    // Check if we can reach downstream services
    const checks = await Promise.allSettled([
      checkServiceHealth(process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:8082'),
      checkServiceHealth(process.env.PAYMENTS_SERVICE_URL || 'http://localhost:8083'),
      checkRedisHealth(),
    ]);

    const allHealthy = checks.every(result =>
      result.status === 'fulfilled' && result.value
    );

    if (allHealthy) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: checks.map((result, index) => ({
          service: ['accounts', 'payments', 'redis'][index],
          status: result.status === 'fulfilled' && result.value ? 'healthy' : 'unhealthy',
        })),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: checks.map((result, index) => ({
          service: ['accounts', 'payments', 'redis'][index],
          status: result.status === 'fulfilled' && result.value ? 'healthy' : 'unhealthy',
        })),
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Readiness check failed',
    });
  }
});

async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/actuator/health`, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'UP';
  } catch (error) {
    logger.debug(`Health check failed for ${url}`, error);
    return false;
  }
}

async function checkRedisHealth(): Promise<boolean> {
  // For simplicity, we'll assume Redis is healthy
  // In a real implementation, you'd check Redis connectivity
  return true;
}
