/**
 * Normalizes a person's or organization's name
 * - Removes extra whitespace
 * - Standardizes case (Title Case for names)
 * - Removes common prefixes/suffixes consistently
 * - Handles empty/null inputs gracefully
 */
export declare function normalizeName(name: string | null | undefined): string;
/**
 * Normalizes an email address
 * - Converts to lowercase
 * - Removes leading/trailing whitespace
 * - Basic validation (contains @ and at least one dot after @)
 * - Returns empty string for invalid emails
 */
export declare function normalizeEmail(email: string | null | undefined): string;
/**
 * Normalizes a phone number
 * - Removes all non-digit characters
 * - Handles common formats (+country, extensions, etc.)
 * - Returns digits only, standardized format
 */
export declare function normalizePhone(phone: string | null | undefined): string;
/**
 * Normalizes a physical address
 * - Standardizes whitespace
 * - Capitalizes words appropriately (like names)
 * - Handles common abbreviations
 * - Locale-agnostic basic normalization
 */
export declare function normalizeAddress(address: string | null | undefined): string;
/**
 * Creates a deterministic natural key for entity matching
 * Combines normalized core fields to create a stable identifier
 */
export declare function createNaturalKey(name: string, email?: string, phone?: string, organizationId?: string): string;
/**
 * Calculates a simple similarity score between two strings
 * Uses Jaccard similarity based on character trigrams for basic fuzzy matching
 */
export declare function calculateSimilarity(a: string, b: string): number;
//# sourceMappingURL=normalization.d.ts.map