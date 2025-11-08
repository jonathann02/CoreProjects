import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '10');

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }

    // Use user ID or IP address as identifier
    const identifier = req.user?.sub || req.ip || 'anonymous';

    // Redis key for this user/IP
    const key = `ratelimit:${identifier}`;

    // Use Redis multi to ensure atomicity
    const multi = redis.multi();

    // Increment the counter
    multi.incr(key);

    // Set expiry on the key if it doesn't exist
    multi.expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000));

    // Execute the transaction
    const results = await multi.exec();

    if (!results) {
      logger.error('Redis transaction failed for rate limiting');
      // Allow request on Redis failure (fail open)
      return next();
    }

    const requestCount = results[0][1] as number;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX_REQUESTS - requestCount).toString(),
      'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString(),
    });

    // Check if rate limit exceeded
    if (requestCount > RATE_LIMIT_MAX_REQUESTS) {
      logger.warn('Rate limit exceeded', {
        identifier,
        requestCount,
        limit: RATE_LIMIT_MAX_REQUESTS,
        path: req.path,
        method: req.method,
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
      });
    }

    // Allow the request
    next();
  } catch (error) {
    logger.error('Rate limiting middleware error', error);
    // Fail open - allow request if Redis is down
    next();
  }
};

// Cleanup function for graceful shutdown
export const closeRedis = async () => {
  await redis.quit();
};
