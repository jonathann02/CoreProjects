// Pure functions for normalizing entity data
// All functions are deterministic and side-effect free

/**
 * Normalizes a person's or organization's name
 * - Removes extra whitespace
 * - Standardizes case (Title Case for names)
 * - Removes common prefixes/suffixes consistently
 * - Handles empty/null inputs gracefully
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .split(' ')
    .map((word, index) => {
      // Skip common prefixes that should remain lowercase (but not at start)
      const lowerPrefixes = ['de', 'da', 'do', 'dos', 'das', 'del', 'von', 'der', 'den'];
      if (index > 0 && lowerPrefixes.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // "van" should be capitalized when it's part of a name like "Van der Berg"
      if (word.toLowerCase() === 'van') {
        return 'Van';
      }
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .slice(0, 255); // Max length safety
}

/**
 * Normalizes an email address
 * - Converts to lowercase
 * - Removes leading/trailing whitespace
 * - Basic validation (contains @ and at least one dot after @)
 * - Returns empty string for invalid emails
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';

  const normalized = email.trim().toLowerCase();

  // Basic email validation - must contain @ and have domain
  if (!normalized.includes('@')) return '';
  const [local, domain] = normalized.split('@');
  if (!local || !domain || !domain.includes('.')) return '';

  return normalized;
}

/**
 * Normalizes a phone number
 * - Removes all non-digit characters
 * - Handles common formats (+country, extensions, etc.)
 * - Returns digits only, standardized format
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';

  // Remove all non-digit characters except + for country codes
  let normalized = phone.replace(/[^\d+]/g, '');

  // Handle country code - if starts with +, keep it
  if (normalized.startsWith('+')) {
    normalized = '+' + normalized.slice(1).replace(/\D/g, '');
  } else {
    // Assume US format, remove any leading 1
    normalized = normalized.replace(/^\+?1/, '');
  }

  // Remove leading/trailing zeros and ensure minimum length
  normalized = normalized.replace(/^0+/, '').replace(/0+$/, '');

  // Basic validation - must have at least 7 digits (US local)
  if (normalized.replace(/\D/g, '').length < 7) return '';

  return normalized;
}

/**
 * Normalizes a physical address
 * - Standardizes whitespace
 * - Capitalizes words appropriately (like names)
 * - Handles common abbreviations
 * - Locale-agnostic basic normalization
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';

  return address
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .split(' ')
    .map(word => {
      // Common address abbreviations that should be uppercase
      const upperAbbrevs = ['st', 'rd', 'th', 'ave', 'blvd', 'dr', 'ln', 'ct', 'pl', 'apt', 'ste', 'fl', 'rm'];
      if (upperAbbrevs.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }

      // Directionals that should be uppercase
      const directionals = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west'];
      if (directionals.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }

      // Otherwise, title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .slice(0, 500); // Max length safety
}

/**
 * Creates a deterministic natural key for entity matching
 * Combines normalized core fields to create a stable identifier
 */
export function createNaturalKey(
  name: string,
  email?: string,
  phone?: string,
  organizationId?: string
): string {
  const normalizedName = normalizeName(name);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  // Use organization ID if available (most stable)
  if (organizationId) {
    return `org:${organizationId.toLowerCase().trim()}`;
  }

  // Combine available stable identifiers
  const parts = [normalizedName];
  if (normalizedEmail) parts.push(`email:${normalizedEmail}`);
  if (normalizedPhone) parts.push(`phone:${normalizedPhone}`);

  // Create deterministic hash-like key
  return parts.join('|').toLowerCase();
}

/**
 * Calculates Jaro similarity between two strings
 * Jaro distance is a measure of similarity between two strings
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  // Maximum distance for matching characters
  const maxDist = Math.floor(Math.max(len1, len2) / 2) - 1;

  // Count matching characters
  let matches = 0;
  const hash1 = new Array(len1).fill(false);
  const hash2 = new Array(len2).fill(false);

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(len2, i + maxDist + 1);

    for (let j = start; j < end; j++) {
      if (!hash2[j] && s1[i] === s2[j]) {
        hash1[i] = true;
        hash2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let transpositions = 0;
  let point = 0;

  for (let i = 0; i < len1; i++) {
    if (hash1[i]) {
      while (!hash2[point]) point++;
      if (s1[i] !== s2[point++]) transpositions++;
    }
  }

  transpositions /= 2;

  // Calculate Jaro similarity
  return (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3;
}

/**
 * Calculates Jaro-Winkler similarity between two strings
 * Jaro-Winkler gives higher scores to strings that match from the beginning
 */
export function jaroWinklerSimilarity(s1: string, s2: string, scalingFactor = 0.1): number {
  const jaroSim = jaroSimilarity(s1, s2);
  if (jaroSim === 0 || jaroSim === 1) return jaroSim;

  // Count common prefix length (max 4)
  let prefixLength = 0;
  const maxPrefix = Math.min(4, s1.length, s2.length);

  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaroSim + (prefixLength * scalingFactor * (1 - jaroSim));
}

/**
 * Calculates a simple similarity score between two strings
 * Uses Jaccard similarity based on character trigrams for basic fuzzy matching
 * @deprecated Use jaroWinklerSimilarity for better name matching
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Convert to lowercase for comparison
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();

  // Simple character-based similarity
  if (str1.includes(str2) || str2.includes(str1)) {
    return Math.max(str1.length, str2.length) / Math.min(str1.length, str2.length) * 0.8;
  }

  // Count common characters
  const set1 = new Set(str1);
  const set2 = new Set(str2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  // Jaccard similarity
  const similarity = intersection.size / union.size;

  // Boost exact substring matches
  if (str1.includes(str2.slice(0, 3)) || str2.includes(str1.slice(0, 3))) {
    return Math.min(similarity * 1.2, 1);
  }

  return similarity;
}
