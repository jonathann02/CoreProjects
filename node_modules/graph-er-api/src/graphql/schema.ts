import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLError } from 'graphql';

import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';

export function createGraphQLSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}

// GraphQL complexity and depth limiting
export const GRAPHQL_COMPLEXITY_LIMIT = 1000;
export const GRAPHQL_DEPTH_LIMIT = 10;

// Validation rules for GraphQL queries
export const validationRules = [
  // TODO: Add complexity and depth limiting rules
  // queryComplexityRule({
  //   estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
  //   maximumComplexity: GRAPHQL_COMPLEXITY_LIMIT,
  //   variables: {},
  //   onComplexity: (complexity: number) => {
  //     console.log('Query complexity:', complexity);
  //   },
  // }),
  // depthLimit(GRAPHQL_DEPTH_LIMIT),
];
