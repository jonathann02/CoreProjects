// Main exports for @graph-er/shared package

// Schemas and types
export * from './schemas';

// Normalization utilities
export * from './normalization';

// Similarity algorithms
export { jaroSimilarity, jaroWinklerSimilarity } from './normalization';

// Entity resolution
export * from './entityResolution';

// Re-export zod for convenience (but encourage explicit imports)
export { z } from 'zod';
