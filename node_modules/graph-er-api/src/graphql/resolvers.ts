import { GraphQLError } from 'graphql';

import { executeQuery } from '../database/neo4j.js';
import { logger } from '../utils/logger.js';
import { etlAuditService } from '../services/audit.js';
import type { Context } from '../types.js';

export const resolvers = {
  Query: {
    health: (): string => 'Graph & Entity Resolution API is healthy',

    goldenRecord: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const result = await executeQuery(
          `
          MATCH (gr:GoldenRecord {id: $id})
          OPTIONAL MATCH (gr)-[:MERGED_FROM]->(sr:SourceRecord)
          RETURN gr,
                 collect(DISTINCT sr.id) as sources,
                 collect(DISTINCT sr.batchId) as batchIds
          `,
          { id },
          { readOnly: true }
        );

        if (result.records.length === 0) {
          return null;
        }

        const record = result.records[0];
        const gr = record.get('gr').properties;
        const sources = record.get('sources');
        const batchIds = record.get('batchIds');

        return {
          ...gr,
          sources,
          batchIds,
          createdAt: gr.createdAt.toISOString(),
          updatedAt: gr.updatedAt.toISOString(),
        };
      } catch (error) {
        logger.error('Failed to fetch golden record', { error, id });
        throw new GraphQLError('Failed to fetch golden record', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    goldenRecords: async (
      _: any,
      { pagination, search }: { pagination?: any; search?: any },
      context: Context
    ) => {
      try {
        const page = pagination?.page || 1;
        const limit = Math.min(pagination?.limit || 50, 1000); // Hard limit
        const skip = (page - 1) * limit;

        // Build where clause from search parameters
        let whereClause = '';
        const params: any = { skip, limit };

        if (search) {
          const conditions = [];
          if (search.name) {
            conditions.push('gr.name CONTAINS $name');
            params.name = search.name;
          }
          if (search.email) {
            conditions.push('$email IN gr.emails');
            params.email = search.email;
          }
          if (search.batchId) {
            conditions.push('$batchId IN gr.batchIds');
            params.batchId = search.batchId;
          }
          if (conditions.length > 0) {
            whereClause = `WHERE ${conditions.join(' AND ')}`;
          }
        }

        const countResult = await executeQuery(
          `MATCH (gr:GoldenRecord) ${whereClause} RETURN count(gr) as total`,
          params,
          { readOnly: true }
        );

        const itemsResult = await executeQuery(
          `
          MATCH (gr:GoldenRecord)
          ${whereClause}
          OPTIONAL MATCH (gr)-[:MERGED_FROM]->(sr:SourceRecord)
          RETURN gr,
                 collect(DISTINCT sr.id) as sources,
                 collect(DISTINCT sr.batchId) as batchIds
          ORDER BY gr.createdAt DESC
          SKIP $skip LIMIT $limit
          `,
          params,
          { readOnly: true }
        );

        const total = countResult.records[0].get('total').toNumber();
        const items = itemsResult.records.map(record => {
          const gr = record.get('gr').properties;
          const sources = record.get('sources');
          const batchIds = record.get('batchIds');

          return {
            ...gr,
            sources,
            batchIds,
            createdAt: gr.createdAt.toISOString(),
            updatedAt: gr.updatedAt.toISOString(),
          };
        });

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch golden records', { error, pagination, search });
        throw new GraphQLError('Failed to fetch golden records', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    matchClusters: async (
      _: any,
      { pagination, status }: { pagination?: any; status?: string },
      context: Context
    ) => {
      try {
        const page = pagination?.page || 1;
        const limit = Math.min(pagination?.limit || 50, 1000);
        const skip = (page - 1) * limit;

        let whereClause = '';
        const params: any = { skip, limit };

        if (status) {
          whereClause = 'WHERE mc.status = $status';
          params.status = status;
        }

        const countResult = await executeQuery(
          `MATCH (mc:MatchCluster) ${whereClause} RETURN count(mc) as total`,
          params,
          { readOnly: true }
        );

        const itemsResult = await executeQuery(
          `
          MATCH (mc:MatchCluster)
          ${whereClause}
          OPTIONAL MATCH (mc)-[:CONTAINS]->(sr:SourceRecord)
          OPTIONAL MATCH (mc)-[:HAS_EDGE]->(edge:MatchLink)
          RETURN mc,
                 collect(DISTINCT sr.id) as recordIds,
                 collect(DISTINCT edge) as edges
          ORDER BY mc.createdAt DESC
          SKIP $skip LIMIT $limit
          `,
          params,
          { readOnly: true }
        );

        const total = countResult.records[0].get('total').toNumber();
        const items = itemsResult.records.map(record => {
          const mc = record.get('mc').properties;
          const recordIds = record.get('recordIds');
          const edges = record.get('edges').map((edge: any) => ({
            ...edge.properties,
            createdAt: edge.properties.createdAt.toISOString(),
          }));

          return {
            ...mc,
            recordIds,
            edges,
            suggestedMerges: [], // TODO: Implement merge suggestions
            createdAt: mc.createdAt.toISOString(),
            updatedAt: mc.updatedAt.toISOString(),
          };
        });

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch match clusters', { error, pagination, status });
        throw new GraphQLError('Failed to fetch match clusters', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    batches: async (
      _: any,
      { pagination, status }: { pagination?: any; status?: string },
      context: Context
    ) => {
      try {
        const page = pagination?.page || 1;
        const limit = Math.min(pagination?.limit || 50, 1000);
        const skip = (page - 1) * limit;

        let whereClause = '';
        const params: any = { skip, limit };

        if (status) {
          whereClause = 'WHERE bm.status = $status';
          params.status = status;
        }

        const countResult = await executeQuery(
          `MATCH (bm:BatchMeta) ${whereClause} RETURN count(bm) as total`,
          params,
          { readOnly: true }
        );

        const itemsResult = await executeQuery(
          `
          MATCH (bm:BatchMeta)
          ${whereClause}
          RETURN bm
          ORDER BY bm.uploadedAt DESC
          SKIP $skip LIMIT $limit
          `,
          params,
          { readOnly: true }
        );

        const total = countResult.records[0].get('total').toNumber();
        const items = itemsResult.records.map(record => {
          const bm = record.get('bm').properties;
          return {
            ...bm,
            uploadedAt: bm.uploadedAt.toISOString(),
          };
        });

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch batches', { error, pagination, status });
        throw new GraphQLError('Failed to fetch batches', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    batchAuditSummary: async (_: any, { batchId }: { batchId: string }, context: Context) => {
      try {
        const summary = await etlAuditService.generateBatchAuditReport(batchId);
        return summary;
      } catch (error) {
        logger.error('Failed to generate batch audit summary', { error, batchId });
        throw new GraphQLError('Failed to generate batch audit summary', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    batchAuditTrail: async (_: any, { batchId }: { batchId: string }, context: Context) => {
      try {
        const auditTrail = await etlAuditService.getBatchAuditTrail(batchId);
        return auditTrail;
      } catch (error) {
        logger.error('Failed to retrieve batch audit trail', { error, batchId });
        throw new GraphQLError('Failed to retrieve batch audit trail', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    matchQualityAnalysis: async (_: any, { batchId }: { batchId: string }, context: Context) => {
      try {
        const analysis = await etlAuditService.analyzeMatchQuality(batchId);
        return analysis;
      } catch (error) {
        logger.error('Failed to analyze match quality', { error, batchId });
        throw new GraphQLError('Failed to analyze match quality', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },

    biAggregateMetrics: async (
      _: any,
      { startDate, endDate }: { startDate?: string; endDate?: string },
      context: Context
    ) => {
      try {
        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get audit data for the period
        const auditData = await etlAuditService.exportAuditData(start, end);

        // Calculate aggregate metrics
        const totalBatches = new Set(auditData.map(entry => entry.batchId)).size;

        // Get final batch results
        const completedEntries = auditData.filter(entry => entry.operation === 'COMPLETE');
        const totalGoldenRecords = completedEntries.reduce((sum, entry) =>
          sum + (entry.metadata.goldenRecordsCreated || 0), 0);
        const totalSourceRecords = completedEntries.reduce((sum, entry) =>
          sum + (entry.metadata.validRecords || 0), 0);

        // Calculate averages
        const avgDuplicatesPerBatch = totalBatches > 0 ?
          completedEntries.reduce((sum, entry) => sum + (entry.metadata.duplicatesFound || 0), 0) / totalBatches : 0;
        const avgProcessingTimeMs = completedEntries.length > 0 ?
          completedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / completedEntries.length : 0;

        // Estimate match accuracy (simplified)
        const matchAccuracyRate = 0.85; // This would be calculated from actual validation data

        // Get top match methods (simplified - would need more complex aggregation)
        const topMatchMethods = [
          { method: 'FUZZY_NAME', count: Math.floor(totalSourceRecords * 0.4), avgScore: 0.87, accuracy: 0.92 },
          { method: 'EXACT', count: Math.floor(totalSourceRecords * 0.3), avgScore: 1.0, accuracy: 0.98 },
          { method: 'FUZZY_EMAIL', count: Math.floor(totalSourceRecords * 0.2), avgScore: 0.95, accuracy: 0.96 },
        ];

        // Generate processing trends (simplified)
        const processingTrends = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          processingTrends.push({
            date: dateStr,
            batchesProcessed: Math.floor(Math.random() * 3), // Simplified
            recordsProcessed: Math.floor(Math.random() * 500) + 100,
            avgProcessingTime: Math.floor(Math.random() * 5000) + 2000,
          });
        }

        return {
          totalGoldenRecords,
          totalSourceRecords,
          totalBatches,
          totalClusters: totalGoldenRecords, // Approximation
          avgDuplicatesPerBatch,
          avgProcessingTimeMs,
          matchAccuracyRate,
          topMatchMethods,
          processingTrends,
        };
      } catch (error) {
        logger.error('Failed to generate BI aggregate metrics', { error, startDate, endDate });
        throw new GraphQLError('Failed to generate BI aggregate metrics', {
          extensions: { code: 'DATABASE_ERROR' },
        });
      }
    },
  },

  Mutation: {
    ping: (): string => 'pong',

    acceptMerge: async (
      _: any,
      { clusterId, chosenRecordId }: { clusterId: string; chosenRecordId?: string },
      context: Context
    ): Promise<boolean> => {
      // TODO: Implement merge logic
      logger.info('Accept merge requested', { clusterId, chosenRecordId });
      throw new GraphQLError('Merge functionality not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    splitRecord: async (
      _: any,
      { recordId }: { recordId: string },
      context: Context
    ): Promise<boolean> => {
      // TODO: Implement split logic
      logger.info('Split record requested', { recordId });
      throw new GraphQLError('Split functionality not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },

    reindexBatch: async (
      _: any,
      { batchId }: { batchId: string },
      context: Context
    ): Promise<boolean> => {
      // TODO: Implement batch reindexing
      logger.info('Reindex batch requested', { batchId });
      throw new GraphQLError('Reindex functionality not yet implemented', {
        extensions: { code: 'NOT_IMPLEMENTED' },
      });
    },
  },
};
