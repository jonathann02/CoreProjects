import {
  normalizeName,
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  createNaturalKey,
  calculateSimilarity,
} from '../normalization';

describe('Normalization Functions', () => {
  describe('normalizeName', () => {
    it('should normalize basic names', () => {
      expect(normalizeName('john doe')).toBe('John Doe');
      expect(normalizeName('MARY SMITH')).toBe('Mary Smith');
    });

    it('should handle prefixes correctly', () => {
      expect(normalizeName('jose da silva')).toBe('Jose da Silva');
      expect(normalizeName('van der berg')).toBe('Van der Berg');
    });

    it('should handle empty/null inputs', () => {
      expect(normalizeName('')).toBe('');
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
    });

    it('should normalize whitespace', () => {
      expect(normalizeName('  john   doe  ')).toBe('John Doe');
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize valid emails', () => {
      expect(normalizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
    });

    it('should reject invalid emails', () => {
      expect(normalizeEmail('invalid-email')).toBe('');
      expect(normalizeEmail('no-at-sign')).toBe('');
    });

    it('should handle empty inputs', () => {
      expect(normalizeEmail('')).toBe('');
      expect(normalizeEmail(null)).toBe('');
    });
  });

  describe('normalizePhone', () => {
    it('should normalize US phone numbers', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
      expect(normalizePhone('1-555-123-4567')).toBe('5551234567');
    });

    it('should handle international formats', () => {
      expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567');
    });

    it('should reject invalid phones', () => {
      expect(normalizePhone('12')).toBe(''); // Too short
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize addresses', () => {
      expect(normalizeAddress('123 main st')).toBe('123 Main ST');
      expect(normalizeAddress('456 oak ave n')).toBe('456 Oak AVE N');
    });

    it('should handle abbreviations', () => {
      expect(normalizeAddress('100 first st apt 5')).toBe('100 First ST APT 5');
    });
  });

  describe('createNaturalKey', () => {
    it('should create deterministic keys', () => {
      const key1 = createNaturalKey('John Doe', 'john@example.com');
      const key2 = createNaturalKey('John Doe', 'john@example.com');
      expect(key1).toBe(key2);
    });

    it('should prefer organization ID', () => {
      const key = createNaturalKey('John Doe', 'john@example.com', undefined, 'ORG123');
      expect(key).toBe('org:org123');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateSimilarity('test', 'test')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateSimilarity('abc', 'xyz')).toBeCloseTo(0, 1);
    });

    it('should calculate reasonable similarity', () => {
      expect(calculateSimilarity('test', 'tset')).toBeGreaterThan(0.5);
      expect(calculateSimilarity('test', 'testing')).toBeGreaterThan(0.6);
    });
  });
});
