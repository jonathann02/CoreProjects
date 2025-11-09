import { z } from 'zod';

// Core entity input schema for CSV records
export const EntityInputSchema = z.object({
  // Basic identifiers
  id: z.string().optional(), // Optional external ID
  sourceId: z.string().optional(), // Source system identifier

  // Personal/business information
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),

  // Business-specific fields
  organizationName: z.string().optional().or(z.literal('')),
  organizationId: z.string().optional().or(z.literal('')), // Tax ID, registration number, etc.

  // Additional metadata
  source: z.string().min(1, 'Source is required'), // e.g., 'csv_upload', 'api_import'
  batchId: z.string().min(1, 'Batch ID is required'),

  // Optional additional fields as key-value pairs
  additionalData: z.record(z.string(), z.any()).optional(),
});

// Golden record schema (resolved/merged entity)
export const GoldenRecordSchema = z.object({
  id: z.string(), // Neo4j internal ID
  naturalKey: z.string(), // Deterministic key for uniqueness
  name: z.string(),
  emails: z.array(z.string().email()),
  phones: z.array(z.string()),
  addresses: z.array(z.string()),
  organizationName: z.string().optional(),
  organizationId: z.string().optional(),

  // Audit trail
  sources: z.array(z.string()), // Source record IDs
  batchIds: z.array(z.string()), // Batches this record came from
  createdAt: z.date(),
  updatedAt: z.date(),
  confidence: z.number().min(0).max(1), // Merge confidence score
});

// Match link schema (candidate relationship between records)
export const MatchLinkSchema = z.object({
  id: z.string(),
  sourceRecordId: z.string(),
  targetRecordId: z.string(),
  method: z.enum(['exact', 'fuzzy_name', 'fuzzy_email', 'fuzzy_phone', 'similarity_cluster']),
  score: z.number().min(0).max(1), // Similarity/confidence score
  metadata: z.record(z.string(), z.any()).optional(), // Additional match details
  createdAt: z.date(),
});

// Cluster of potentially matching records
export const MatchClusterSchema = z.object({
  id: z.string(),
  recordIds: z.array(z.string()),
  edges: z.array(MatchLinkSchema),
  suggestedMerges: z.array(z.object({
    recordIds: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
  })),
  status: z.enum(['pending', 'reviewed', 'resolved']),
});

// Batch metadata for ETL operations
export const BatchMetaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
  recordCount: z.number().min(0),
  processedCount: z.number().min(0),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  errorMessage: z.string().optional(),
  processingStats: z.object({
    duplicatesFound: z.number().min(0),
    clustersCreated: z.number().min(0),
    goldenRecordsCreated: z.number().min(0),
    processingTimeMs: z.number().min(0),
  }).optional(),
});

// Upload session for chunked file uploads
export const UploadSessionSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  totalSize: z.number().min(0),
  uploadedSize: z.number().min(0),
  chunkCount: z.number().min(0),
  status: z.enum(['active', 'completed', 'failed', 'expired']),
  createdAt: z.date(),
  expiresAt: z.date(),
  tempPath: z.string(), // Server-side temp file path
});

// Pagination parameters
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50), // Hard limit for security
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search/filter parameters
export const SearchParamsSchema = z.object({
  query: z.string().optional(), // General search query
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  organizationName: z.string().optional(),
  batchId: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxConfidence: z.number().min(0).max(1).optional(),
});

// GraphQL query responses
export const PagedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().min(0),
    page: z.number().min(1),
    limit: z.number().min(1),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });

// API response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }).optional(),
    requestId: z.string(), // For tracing
  });

// Health check response
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  version: z.string(),
  services: z.record(z.string(), z.object({
    status: z.enum(['ok', 'degraded', 'unhealthy']),
    message: z.string().optional(),
    latency: z.number().optional(),
  })),
});

// Export types
export type EntityInput = z.infer<typeof EntityInputSchema>;
export type GoldenRecord = z.infer<typeof GoldenRecordSchema>;
export type MatchLink = z.infer<typeof MatchLinkSchema>;
export type MatchCluster = z.infer<typeof MatchClusterSchema>;
export type BatchMeta = z.infer<typeof BatchMetaSchema>;
export type UploadSession = z.infer<typeof UploadSessionSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
