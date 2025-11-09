import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # Core entity types
  type GoldenRecord {
    id: ID!
    naturalKey: String!
    name: String!
    emails: [String!]!
    phones: [String!]!
    addresses: [String!]!
    organizationName: String
    organizationId: String
    sources: [String!]!
    batchIds: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    confidence: Float!
  }

  type SourceRecord {
    id: ID!
    name: String!
    email: String
    phone: String
    address: String
    organizationName: String
    organizationId: String
    source: String!
    batchId: String!
    createdAt: DateTime!
  }

  # Match and cluster types
  type MatchLink {
    id: ID!
    sourceRecordId: ID!
    targetRecordId: ID!
    method: MatchMethod!
    score: Float!
    metadata: JSONObject
    createdAt: DateTime!
  }

  type MatchCluster {
    id: ID!
    recordIds: [ID!]!
    edges: [MatchLink!]!
    suggestedMerges: [MergeSuggestion!]!
    status: ClusterStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MergeSuggestion {
    recordIds: [ID!]!
    confidence: Float!
    reason: String!
  }

  # Batch and ETL types
  type BatchMeta {
    id: ID!
    filename: String!
    uploadedBy: String!
    uploadedAt: DateTime!
    recordCount: Int!
    processedCount: Int!
    status: BatchStatus!
    errorMessage: String
    processingStats: ProcessingStats
  }

  type ProcessingStats {
    duplicatesFound: Int!
    clustersCreated: Int!
    goldenRecordsCreated: Int!
    processingTimeMs: Int!
  }

  # Enums
  enum MatchMethod {
    EXACT
    FUZZY_NAME
    FUZZY_EMAIL
    FUZZY_PHONE
    SIMILARITY_CLUSTER
  }

  enum ClusterStatus {
    PENDING
    REVIEWED
    RESOLVED
  }

  enum BatchStatus {
    UPLOADING
    PROCESSING
    COMPLETED
    FAILED
  }

  enum ETLOperation {
    START
    VALIDATION_COMPLETE
    NORMALIZATION_COMPLETE
    DEDUPLICATION_COMPLETE
    CLUSTERING_COMPLETE
    WRITING_COMPLETE
    COMPLETE
    FAILED
  }

  enum MatchRisk {
    LOW
    MEDIUM
    HIGH
  }

  # Audit and analytics types
  type BatchAuditSummary {
    batchId: ID!
    inputHash: String!
    startTime: DateTime!
    endTime: DateTime
    totalRecords: Int!
    validRecords: Int!
    invalidRecords: Int!
    duplicatesFound: Int!
    clustersCreated: Int!
    goldenRecordsCreated: Int!
    processingTimeMs: Int!
    errors: [String!]!
    falsePositives: Int
    falseNegatives: Int
    manualReviews: Int
  }

  type ETLAuditEntry {
    id: ID!
    batchId: ID!
    operation: ETLOperation!
    inputHash: String!
    timestamp: DateTime!
    metadata: JSONObject
    duration: Int
    errorMessage: String
  }

  type MatchQualityAnalysis {
    potentialFalsePositives: [MatchQualityIssue!]!
    potentialFalseNegatives: [MatchQualityIssue!]!
  }

  type MatchQualityIssue {
    sourceRecordId: ID!
    targetRecordId: ID
    score: Float!
    reason: String!
    risk: MatchRisk!
  }

  type BIAggregateMetrics {
    totalGoldenRecords: Int!
    totalSourceRecords: Int!
    totalBatches: Int!
    totalClusters: Int!
    avgDuplicatesPerBatch: Float!
    avgProcessingTimeMs: Float!
    matchAccuracyRate: Float!
    topMatchMethods: [MatchMethodStats!]!
    processingTrends: [ProcessingTrend!]!
  }

  type MatchMethodStats {
    method: MatchMethod!
    count: Int!
    avgScore: Float!
    accuracy: Float!
  }

  type ProcessingTrend {
    date: String!
    batchesProcessed: Int!
    recordsProcessed: Int!
    avgProcessingTime: Float!
  }

  # Pagination
  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  # Generic paginated result
  type GoldenRecordsResult {
    items: [GoldenRecord!]!
    pagination: PaginationInfo!
  }

  type MatchClustersResult {
    items: [MatchCluster!]!
    pagination: PaginationInfo!
  }

  type BatchesResult {
    items: [BatchMeta!]!
    pagination: PaginationInfo!
  }

  # Input types
  input PaginationInput {
    page: Int = 1
    limit: Int = 50
  }

  input SearchInput {
    query: String
    name: String
    email: String
    phone: String
    organizationName: String
    batchId: String
    minConfidence: Float
    maxConfidence: Float
  }

  # Queries
  type Query {
    # Golden records
    goldenRecord(id: ID!): GoldenRecord
    goldenRecords(
      pagination: PaginationInput
      search: SearchInput
    ): GoldenRecordsResult!

    # Match clusters
    matchCluster(id: ID!): MatchCluster
    matchClusters(
      pagination: PaginationInput
      status: ClusterStatus
    ): MatchClustersResult!

    # Batches
    batch(id: ID!): BatchMeta
    batches(
      pagination: PaginationInput
      status: BatchStatus
    ): BatchesResult!

    # Audit and analytics
    batchAuditSummary(batchId: ID!): BatchAuditSummary
    batchAuditTrail(batchId: ID!): [ETLAuditEntry!]!
    matchQualityAnalysis(batchId: ID!): MatchQualityAnalysis!
    biAggregateMetrics(
      startDate: DateTime
      endDate: DateTime
    ): BIAggregateMetrics!

    # Health check
    health: String!
  }

  # Mutations
  type Mutation {
    # Merge operations
    acceptMerge(clusterId: ID!, chosenRecordId: ID): Boolean!
    splitRecord(recordId: ID!): Boolean!

    # Batch operations
    reindexBatch(batchId: ID!): Boolean!

    # Test mutation
    ping: String!
  }

  # Scalars
  scalar DateTime
  scalar JSONObject
`;
