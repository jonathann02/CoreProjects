import { jaroWinklerSimilarity } from './normalization';
import { z } from 'zod';

// Configuration schema for entity resolution rules
export const EntityResolutionConfigSchema = z.object({
  // Similarity thresholds for different field types
  thresholds: z.object({
    name: z.number().min(0).max(1).default(0.85),
    email: z.number().min(0).max(1).default(0.95), // Emails should be very similar
    phone: z.number().min(0).max(1).default(0.90),
    organizationName: z.number().min(0).max(1).default(0.80),
    organizationId: z.number().min(0).max(1).default(0.95), // Org IDs should match exactly
    address: z.number().min(0).max(1).default(0.75),
  }),

  // Weights for different fields when calculating overall similarity
  weights: z.object({
    name: z.number().min(0).max(1).default(0.4),
    email: z.number().min(0).max(1).default(0.3),
    phone: z.number().min(0).max(1).default(0.2),
    organizationName: z.number().min(0).max(1).default(0.05),
    organizationId: z.number().min(0).max(1).default(0.05), // Very low weight for org ID
  }),

  // Minimum overall confidence required for auto-merge
  minAutoMergeConfidence: z.number().min(0).max(1).default(0.85),

  // Maximum cluster size before requiring manual review
  maxAutoMergeClusterSize: z.number().min(2).default(10),

  // Enable/disable specific matching rules
  rules: z.object({
    exactEmailMatch: z.boolean().default(true),
    exactOrgIdMatch: z.boolean().default(true),
    fuzzyNameMatch: z.boolean().default(true),
    fuzzyPhoneMatch: z.boolean().default(true),
  }),

  // Jaro-Winkler scaling factor
  jaroWinklerScalingFactor: z.number().min(0).max(0.25).default(0.1),
});

export type EntityResolutionConfig = z.infer<typeof EntityResolutionConfigSchema>;

// Default configuration
export const defaultEntityResolutionConfig: EntityResolutionConfig = {
  thresholds: {
    name: 0.85,
    email: 0.95,
    phone: 0.90,
    organizationName: 0.80,
    organizationId: 0.95,
    address: 0.75,
  },
  weights: {
    name: 0.4,
    email: 0.3,
    phone: 0.2,
    organizationName: 0.05,
    organizationId: 0.05,
  },
  minAutoMergeConfidence: 0.85,
  maxAutoMergeClusterSize: 10,
  rules: {
    exactEmailMatch: true,
    exactOrgIdMatch: true,
    fuzzyNameMatch: true,
    fuzzyPhoneMatch: true,
  },
  jaroWinklerScalingFactor: 0.1,
};

// Entity similarity calculation
export interface EntitySimilarity {
  nameSimilarity: number;
  emailSimilarity: number;
  phoneSimilarity: number;
  organizationNameSimilarity: number;
  organizationIdSimilarity: number;
  addressSimilarity: number;
  overallSimilarity: number;
  matchedFields: string[];
  reason: string;
}

/**
 * Calculates similarity between two entities using configurable rules
 */
export function calculateEntitySimilarity(
  entity1: {
    name?: string;
    email?: string;
    phone?: string;
    organizationName?: string;
    organizationId?: string;
    address?: string;
  },
  entity2: {
    name?: string;
    email?: string;
    phone?: string;
    organizationName?: string;
    organizationId?: string;
    address?: string;
  },
  config: EntityResolutionConfig = defaultEntityResolutionConfig
): EntitySimilarity {
  const similarities: EntitySimilarity = {
    nameSimilarity: 0,
    emailSimilarity: 0,
    phoneSimilarity: 0,
    organizationNameSimilarity: 0,
    organizationIdSimilarity: 0,
    addressSimilarity: 0,
    overallSimilarity: 0,
    matchedFields: [],
    reason: '',
  };

  // Calculate field similarities
  if (entity1.name && entity2.name) {
    similarities.nameSimilarity = jaroWinklerSimilarity(
      entity1.name.toLowerCase(),
      entity2.name.toLowerCase(),
      config.jaroWinklerScalingFactor
    );
    if (similarities.nameSimilarity >= config.thresholds.name) {
      similarities.matchedFields.push('name');
    }
  }

  if (entity1.email && entity2.email) {
    similarities.emailSimilarity = jaroWinklerSimilarity(
      entity1.email.toLowerCase(),
      entity2.email.toLowerCase(),
      config.jaroWinklerScalingFactor
    );
    if (similarities.emailSimilarity >= config.thresholds.email) {
      similarities.matchedFields.push('email');
    }
  }

  if (entity1.phone && entity2.phone) {
    similarities.phoneSimilarity = jaroWinklerSimilarity(
      entity1.phone,
      entity2.phone,
      config.jaroWinklerScalingFactor
    );
    if (similarities.phoneSimilarity >= config.thresholds.phone) {
      similarities.matchedFields.push('phone');
    }
  }

  if (entity1.organizationName && entity2.organizationName) {
    similarities.organizationNameSimilarity = jaroWinklerSimilarity(
      entity1.organizationName.toLowerCase(),
      entity2.organizationName.toLowerCase(),
      config.jaroWinklerScalingFactor
    );
    if (similarities.organizationNameSimilarity >= config.thresholds.organizationName) {
      similarities.matchedFields.push('organizationName');
    }
  }

  if (entity1.organizationId && entity2.organizationId) {
    similarities.organizationIdSimilarity = jaroWinklerSimilarity(
      entity1.organizationId.toLowerCase(),
      entity2.organizationId.toLowerCase(),
      config.jaroWinklerScalingFactor
    );
    if (similarities.organizationIdSimilarity >= config.thresholds.organizationId) {
      similarities.matchedFields.push('organizationId');
    }
  }

  if (entity1.address && entity2.address) {
    similarities.addressSimilarity = jaroWinklerSimilarity(
      entity1.address.toLowerCase(),
      entity2.address.toLowerCase(),
      config.jaroWinklerScalingFactor
    );
    if (similarities.addressSimilarity >= config.thresholds.address) {
      similarities.matchedFields.push('address');
    }
  }

  // Calculate overall similarity using weighted average
  let totalWeight = 0;
  let weightedSum = 0;

  if (entity1.name && entity2.name) {
    weightedSum += similarities.nameSimilarity * config.weights.name;
    totalWeight += config.weights.name;
  }
  if (entity1.email && entity2.email) {
    weightedSum += similarities.emailSimilarity * config.weights.email;
    totalWeight += config.weights.email;
  }
  if (entity1.phone && entity2.phone) {
    weightedSum += similarities.phoneSimilarity * config.weights.phone;
    totalWeight += config.weights.phone;
  }
  if (entity1.organizationName && entity2.organizationName) {
    weightedSum += similarities.organizationNameSimilarity * config.weights.organizationName;
    totalWeight += config.weights.organizationName;
  }
  if (entity1.organizationId && entity2.organizationId) {
    weightedSum += similarities.organizationIdSimilarity * config.weights.organizationId;
    totalWeight += config.weights.organizationId;
  }

  similarities.overallSimilarity = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Generate reason
  const reasons: string[] = [];
  if (similarities.matchedFields.length > 0) {
    reasons.push(`Matched on: ${similarities.matchedFields.join(', ')}`);
  }
  if (similarities.overallSimilarity >= config.minAutoMergeConfidence) {
    reasons.push(`High confidence (${(similarities.overallSimilarity * 100).toFixed(1)}%)`);
  }
  similarities.reason = reasons.join('; ') || 'Low similarity';

  return similarities;
}

/**
 * Determines if two entities should be considered matches based on rules
 */
export function shouldMergeEntities(
  entity1: Parameters<typeof calculateEntitySimilarity>[0],
  entity2: Parameters<typeof calculateEntitySimilarity>[1],
  config: EntityResolutionConfig = defaultEntityResolutionConfig
): { shouldMerge: boolean; confidence: number; reason: string } {
  const similarity = calculateEntitySimilarity(entity1, entity2, config);

  // Exact matches take precedence
  if (config.rules.exactEmailMatch && entity1.email && entity2.email &&
      entity1.email.toLowerCase() === entity2.email.toLowerCase()) {
    return {
      shouldMerge: true,
      confidence: 1.0,
      reason: 'Exact email match',
    };
  }

  if (config.rules.exactOrgIdMatch && entity1.organizationId && entity2.organizationId &&
      entity1.organizationId.toLowerCase() === entity2.organizationId.toLowerCase()) {
    return {
      shouldMerge: true,
      confidence: 1.0,
      reason: 'Exact organization ID match',
    };
  }

  // Fuzzy matching based on overall similarity
  const shouldMerge = similarity.overallSimilarity >= config.minAutoMergeConfidence &&
                     similarity.matchedFields.length > 0;

  return {
    shouldMerge,
    confidence: similarity.overallSimilarity,
    reason: similarity.reason,
  };
}

/**
 * Generates merge suggestions for a cluster of entities
 */
export function generateMergeSuggestions(
  entities: Array<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    organizationName?: string;
    organizationId?: string;
    address?: string;
  }>,
  config: EntityResolutionConfig = defaultEntityResolutionConfig
): Array<{
  recordIds: string[];
  confidence: number;
  reason: string;
}> {
  const suggestions: Array<{
    recordIds: string[];
    confidence: number;
    reason: string;
  }> = [];

  // Check all pairs for potential merges
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];

      const mergeDecision = shouldMergeEntities(entity1, entity2, config);

      if (mergeDecision.shouldMerge) {
        suggestions.push({
          recordIds: [entity1.id, entity2.id],
          confidence: mergeDecision.confidence,
          reason: mergeDecision.reason,
        });
      }
    }
  }

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}
