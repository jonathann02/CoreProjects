import { GraphQLContext } from './context';
import { logger } from '../utils/logger';

export const resolvers = {
  Query: {
    // Health check
    health: (): string => {
      return 'API Gateway is healthy';
    },

    // Account queries
    account: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('accounts:read')) {
          throw new Error('Insufficient permissions: accounts:read scope required');
        }

        const response = await fetch(`${process.env.ACCOUNTS_SERVICE_URL}/v1/accounts/${id}`, {
          headers: {
            'Authorization': context.req.headers.authorization || '',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to fetch account: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('GraphQL account query error', error);
        throw error;
      }
    },

    accounts: async (_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('accounts:read')) {
          throw new Error('Insufficient permissions: accounts:read scope required');
        }

        // For simplicity, return empty array
        // In a real implementation, you'd call accounts service with pagination
        return [];
      } catch (error) {
        logger.error('GraphQL accounts query error', error);
        throw error;
      }
    },

    // Payment queries
    payment: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('payments:read')) {
          throw new Error('Insufficient permissions: payments:read scope required');
        }

        const response = await fetch(`${process.env.PAYMENTS_SERVICE_URL}/v1/payments/${id}`, {
          headers: {
            'Authorization': context.req.headers.authorization || '',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to fetch payment: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('GraphQL payment query error', error);
        throw error;
      }
    },

    payments: async (_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('payments:read')) {
          throw new Error('Insufficient permissions: payments:read scope required');
        }

        // For simplicity, return empty array
        // In a real implementation, you'd call payments service with pagination
        return [];
      } catch (error) {
        logger.error('GraphQL payments query error', error);
        throw error;
      }
    },
  },

  Mutation: {
    // Account mutations
    createAccount: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('accounts:write')) {
          throw new Error('Insufficient permissions: accounts:write scope required');
        }

        const response = await fetch(`${process.env.ACCOUNTS_SERVICE_URL}/v1/accounts`, {
          method: 'POST',
          headers: {
            'Authorization': context.req.headers.authorization || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to create account: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('GraphQL createAccount mutation error', error);
        throw error;
      }
    },

    // Payment mutations
    initiatePayment: async (_: any, { input, idempotencyKey }: { input: any; idempotencyKey: string }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!context.user.scope?.includes('payments:write')) {
          throw new Error('Insufficient permissions: payments:write scope required');
        }

        const response = await fetch(`${process.env.PAYMENTS_SERVICE_URL}/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': context.req.headers.authorization || '',
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to initiate payment: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('GraphQL initiatePayment mutation error', error);
        throw error;
      }
    },

    // Limit evaluation
    evaluateLimit: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Limits service might not require specific scopes, but let's check
        const response = await fetch(`${process.env.LIMITS_SERVICE_URL}/limits/evaluate`, {
          method: 'POST',
          headers: {
            'Authorization': context.req.headers.authorization || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to evaluate limit: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('GraphQL evaluateLimit mutation error', error);
        throw error;
      }
    },
  },
};
