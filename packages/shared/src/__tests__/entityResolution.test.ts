import {
  jaroSimilarity,
  jaroWinklerSimilarity,
  calculateEntitySimilarity,
  shouldMergeEntities,
  generateMergeSuggestions,
  defaultEntityResolutionConfig,
} from '../entityResolution';

describe('Jaro Similarity Algorithm', () => {
  test('should return 1 for identical strings', () => {
    expect(jaroSimilarity('john', 'john')).toBe(1);
  });

  test('should return 0 for completely different strings', () => {
    expect(jaroSimilarity('abc', 'xyz')).toBe(0);
  });

  test('should calculate similarity correctly', () => {
    expect(jaroSimilarity('john', 'johan')).toBeCloseTo(0.867, 3);
    expect(jaroSimilarity('martha', 'marhta')).toBeCloseTo(0.944, 3);
    expect(jaroSimilarity('dwayne', 'duane')).toBeCloseTo(0.822, 3);
  });
});

describe('Jaro-Winkler Similarity Algorithm', () => {
  test('should return 1 for identical strings', () => {
    expect(jaroWinklerSimilarity('john', 'john')).toBe(1);
  });

  test('should boost similarity for common prefixes', () => {
    const jaroSim = jaroSimilarity('johnson', 'john');
    const winklerSim = jaroWinklerSimilarity('johnson', 'john');
    expect(winklerSim).toBeGreaterThan(jaroSim);
  });

  test('should calculate similarity correctly', () => {
    expect(jaroWinklerSimilarity('john', 'johan')).toBeCloseTo(0.900, 3);
    expect(jaroWinklerSimilarity('martha', 'marhta')).toBeCloseTo(0.961, 3);
  });

  test('should handle custom scaling factor', () => {
    const sim1 = jaroWinklerSimilarity('john', 'johan', 0.1);
    const sim2 = jaroWinklerSimilarity('john', 'johan', 0.2);
    expect(sim2).toBeGreaterThan(sim1);
  });
});

describe('Entity Similarity Calculation', () => {
  const entity1 = {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1-555-0123',
    organizationName: 'Example Corp',
    organizationId: '123456789',
    address: '123 Main St',
  };

  const entity2 = {
    name: 'Jon Smith',
    email: 'john.smith@example.com', // Exact match
    phone: '+1-555-0123', // Exact match
    organizationName: 'Example Corporation',
    organizationId: '123456789', // Exact match
    address: '123 Main Street',
  };

  test('should calculate similarity scores for all fields', () => {
    const similarity = calculateEntitySimilarity(entity1, entity2);

    expect(similarity.nameSimilarity).toBeGreaterThan(0.8); // Similar names
    expect(similarity.emailSimilarity).toBe(1); // Exact email match
    expect(similarity.phoneSimilarity).toBe(1); // Exact phone match
    expect(similarity.organizationIdSimilarity).toBe(1); // Exact org ID match
    expect(similarity.overallSimilarity).toBeGreaterThan(0.8);
    expect(similarity.matchedFields).toContain('email');
    expect(similarity.matchedFields).toContain('phone');
    expect(similarity.matchedFields).toContain('organizationId');
  });

  test('should generate appropriate reason', () => {
    const similarity = calculateEntitySimilarity(entity1, entity2);
    expect(similarity.reason).toContain('Matched on:');
    expect(similarity.reason).toContain('High confidence');
  });
});

describe('Entity Merge Decision', () => {
  test('should merge entities with exact email match', () => {
    const entity1 = { email: 'test@example.com' };
    const entity2 = { email: 'test@example.com' };

    const decision = shouldMergeEntities(entity1, entity2);
    expect(decision.shouldMerge).toBe(true);
    expect(decision.confidence).toBe(1.0);
    expect(decision.reason).toBe('Exact email match');
  });

  test('should merge entities with exact organization ID match', () => {
    const entity1 = { organizationId: '123456789' };
    const entity2 = { organizationId: '123456789' };

    const decision = shouldMergeEntities(entity1, entity2);
    expect(decision.shouldMerge).toBe(true);
    expect(decision.confidence).toBe(1.0);
    expect(decision.reason).toBe('Exact organization ID match');
  });

  test('should merge entities with high fuzzy similarity', () => {
    const entity1 = {
      name: 'John Smith',
      email: 'john.smith@example.com',
    };
    const entity2 = {
      name: 'Jon Smith',
      email: 'john.smith@example.com',
    };

    const decision = shouldMergeEntities(entity1, entity2);
    expect(decision.shouldMerge).toBe(true);
    expect(decision.confidence).toBeGreaterThan(0.8);
  });

  test('should not merge entities with low similarity', () => {
    const entity1 = { name: 'John Smith' };
    const entity2 = { name: 'Jane Doe' };

    const decision = shouldMergeEntities(entity1, entity2);
    expect(decision.shouldMerge).toBe(false);
  });
});

describe('Merge Suggestions Generation', () => {
  test('should generate suggestions for similar entities', () => {
    const entities = [
      { id: '1', name: 'John Smith', email: 'john@example.com' },
      { id: '2', name: 'Jon Smith', email: 'john@example.com' },
      { id: '3', name: 'Jane Doe', email: 'jane@example.com' },
    ];

    const suggestions = generateMergeSuggestions(entities);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].recordIds).toContain('1');
    expect(suggestions[0].recordIds).toContain('2');
    expect(suggestions[0].confidence).toBeGreaterThan(0.8);
  });

  test('should sort suggestions by confidence', () => {
    const entities = [
      { id: '1', name: 'John Smith', email: 'john@example.com' },
      { id: '2', name: 'Jon Smith', email: 'john@example.com' },
      { id: '3', name: 'Johnny Smith', email: 'johnny@example.com' },
    ];

    const suggestions = generateMergeSuggestions(entities);

    // First suggestion should have higher confidence than second
    if (suggestions.length > 1) {
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(suggestions[1].confidence);
    }
  });
});

describe('Configuration Validation', () => {
  test('should use default configuration when none provided', () => {
    const entity1 = { name: 'John Smith' };
    const entity2 = { name: 'Jon Smith' };

    const decision = shouldMergeEntities(entity1, entity2);
    expect(decision).toBeDefined();
    expect(typeof decision.shouldMerge).toBe('boolean');
  });

  test('should allow custom configuration', () => {
    const customConfig = {
      ...defaultEntityResolutionConfig,
      thresholds: {
        ...defaultEntityResolutionConfig.thresholds,
        name: 0.95, // Require very high similarity
      },
    };

    const entity1 = { name: 'John Smith' };
    const entity2 = { name: 'Jon Smith' }; // Should not meet 0.95 threshold

    const decision = shouldMergeEntities(entity1, entity2, customConfig);
    expect(decision.shouldMerge).toBe(false);
  });
});
