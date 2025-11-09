import { Request, Response, NextFunction } from 'express';
import { jwtVerify, importJwk } from 'jose';
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

    // Get Keycloak issuer URL from environment
    const issuerUrl = process.env.KEYCLOAK_ISSUER_URL;
    if (!issuerUrl) {
      logger.error('KEYCLOAK_ISSUER_URL environment variable not set');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Authentication service not configured',
      });
    }

    try {
      // Fetch JWKS from Keycloak
      const jwksUrl = `${issuerUrl}/protocol/openid-connect/certs`;
      const jwksResponse = await fetch(jwksUrl);
      if (!jwksResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${jwksResponse.status}`);
      }

      const jwks = await jwksResponse.json();

      // Find the RSA public key for RS256
      const rsaKey = jwks.keys.find((key: any) => key.kty === 'RSA' && key.use === 'sig');
      if (!rsaKey) {
        throw new Error('No RSA signing key found in JWKS');
      }

      // Import the public key
      const publicKey = await importJwk(rsaKey);

      // Verify the JWT token
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: issuerUrl,
        audience: 'gateway', // Should match the client ID in Keycloak
      });

      req.user = {
        sub: payload.sub!,
        scope: payload.scope || '',
        ...payload,
      };

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
