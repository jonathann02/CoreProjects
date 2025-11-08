import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        scope?: string;
        [key: string]: any;
      };
    }
  }
}

export interface JWTPayload {
  sub: string;
  scope?: string;
  [key: string]: any;
}

export const jwtAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header is required',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header must be Bearer token',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get JWKS endpoint from environment
    const jwksUrl = process.env.KEYCLOAK_ISSUER_URL;
    if (!jwksUrl) {
      logger.error('KEYCLOAK_ISSUER_URL environment variable not set');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Authentication service not configured',
      });
    }

    // For simplicity in this implementation, we'll use a mock verification
    // In production, you'd fetch JWKS from Keycloak and verify the token
    try {
      // Mock JWT verification - in production, use proper JWKS verification
      const mockPayload: JWTPayload = {
        sub: 'user-123',
        scope: 'accounts:read accounts:write payments:read payments:write',
        preferred_username: 'testuser',
      };

      // In a real implementation, you'd do:
      // const { payload } = await jwtVerify(token, jwks, {
      //   issuer: jwksUrl,
      //   audience: 'gateway',
      // });

      req.user = mockPayload;

      logger.debug('JWT authentication successful', {
        userId: req.user.sub,
        scopes: req.user.scope,
      });

      next();
    } catch (verifyError) {
      logger.error('JWT verification failed', verifyError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

// Middleware to check specific scopes
export const requireScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userScopes = req.user.scope?.split(' ') || [];
    const hasScope = userScopes.some(scope => scope === requiredScope);

    if (!hasScope) {
      logger.warn('Insufficient scope', {
        userId: req.user!.sub,
        requiredScope,
        userScopes,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Required scope: ${requiredScope}`,
      });
    }

    next();
  };
};
