import crypto from 'crypto';
import { executeQuery } from '../database/neo4j.js';
import { logger } from '../utils/logger.js';

export interface ETLAuditEntry {
  id: string;
  batchId: string;
  operation: 'START' | 'VALIDATION_COMPLETE' | 'NORMALIZATION_COMPLETE' | 'DEDUPLICATION_COMPLETE' | 'CLUSTERING_COMPLETE' | 'WRITING_COMPLETE' | 'COMPLETE' | 'FAILED';
  inputHash: string;
  timestamp: Date;
  metadata: Record<string, any>;
  duration?: number;
  errorMessage?: string;
}

export interface BatchAuditSummary {
  batchId: string;
  inputHash: string;
  startTime: Date;
  endTime?: Date;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicatesFound: number;
  clustersCreated: number;
  goldenRecordsCreated: number;
  processingTimeMs: number;
  errors: string[];
  falsePositives?: number;
  falseNegatives?: number;
  manualReviews?: number;
}

/**
 * Service for auditing ETL operations and tracking data quality
 */
export class ETLAuditService {
  /**
   * Logs an ETL operation step
   */
  async logETLOperation(
    batchId: string,
    operation: ETLAuditEntry['operation'],
    inputHash: string,
    metadata: Record<string, any> = {},
    duration?: number,
    errorMessage?: string
  ): Promise<void> {
    const auditEntry: ETLAuditEntry = {
      id: crypto.randomUUID(),
      batchId,
      operation,
      inputHash,
      timestamp: new Date(),
      metadata,
      duration,
      errorMessage,
    };

    try {
      await executeQuery(
        `
        CREATE (audit:ETLAuditEntry {
          id: $id,
          batchId: $batchId,
          operation: $operation,
          inputHash: $inputHash,
          timestamp: datetime($timestamp),
          metadata: $metadata,
          duration: $duration,
          errorMessage: $errorMessage
        })
        `,
        {
          id: auditEntry.id,
          batchId: auditEntry.batchId,
          operation: auditEntry.operation,
          inputHash: auditEntry.inputHash,
          timestamp: auditEntry.timestamp.toISOString(),
          metadata: auditEntry.metadata,
          duration: auditEntry.duration || null,
          errorMessage: auditEntry.errorMessage || null,
        },
        { readOnly: false }
      );

      logger.info('ETL audit entry created', {
        batchId,
        operation,
        inputHash: inputHash.substring(0, 8),
        metadata: Object.keys(metadata),
      });
    } catch (error) {
      logger.error('Failed to create ETL audit entry', { error, batchId, operation });
      // Don't throw - audit failures shouldn't stop ETL
    }
  }

  /**
   * Calculates input hash for a file
   */
  calculateInputHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Retrieves audit trail for a batch
   */
  async getBatchAuditTrail(batchId: string): Promise<ETLAuditEntry[]> {
    try {
      const result = await executeQuery(
        `
        MATCH (audit:ETLAuditEntry {batchId: $batchId})
        RETURN audit
        ORDER BY audit.timestamp ASC
        `,
        { batchId },
        { readOnly: true }
      );

      return result.records.map(record => {
        const audit = record.get('audit').properties;
        return {
          ...audit,
          timestamp: new Date(audit.timestamp),
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve batch audit trail', { error, batchId });
      return [];
    }
  }

  /**
   * Analyzes potential false positives/negatives in match results
   */
  async analyzeMatchQuality(batchId: string): Promise<{
    potentialFalsePositives: Array<{
      sourceRecordId: string;
      targetRecordId: string;
      score: number;
      reason: string;
      risk: 'low' | 'medium' | 'high';
    }>;
    potentialFalseNegatives: Array<{
      sourceRecordId: string;
      targetRecordId: string;
      similarity: number;
      reason: string;
    }>;
  }> {
    try {
      // Get match links for the batch
      const matchResult = await executeQuery(
        `
        MATCH (bm:BatchMeta {id: $batchId})-[:CONTAINS]->(sr1:SourceRecord)
        MATCH (sr1)-[link:MATCHES]->(sr2:SourceRecord)
        WHERE link.score < 0.9
        RETURN sr1.id as sourceId, sr2.id as targetId,
               link.score as score, link.metadata as metadata
        ORDER BY link.score ASC
        LIMIT 50
        `,
        { batchId },
        { readOnly: true }
      );

      const potentialFalsePositives = matchResult.records.map(record => {
        const score = record.get('score');
        const metadata = record.get('metadata') || {};

        let risk: 'low' | 'medium' | 'high' = 'low';
        if (score < 0.7) risk = 'high';
        else if (score < 0.8) risk = 'medium';

        return {
          sourceRecordId: record.get('sourceId'),
          targetRecordId: record.get('targetId'),
          score,
          reason: metadata.reason || 'Low confidence match',
          risk,
        };
      });

      // For false negatives, we would need to analyze records that weren't matched
      // but might be similar (this is more complex and would require additional logic)
      const potentialFalseNegatives: Array<{
        sourceRecordId: string;
        targetRecordId: string;
        similarity: number;
        reason: string;
      }> = [];

      return {
        potentialFalsePositives,
        potentialFalseNegatives,
      };
    } catch (error) {
      logger.error('Failed to analyze match quality', { error, batchId });
      return {
        potentialFalsePositives: [],
        potentialFalseNegatives: [],
      };
    }
  }

  /**
   * Generates a comprehensive audit report for a batch
   */
  async generateBatchAuditReport(batchId: string): Promise<BatchAuditSummary | null> {
    try {
      const auditTrail = await this.getBatchAuditTrail(batchId);
      const matchQuality = await this.analyzeMatchQuality(batchId);

      if (auditTrail.length === 0) {
        return null;
      }

      const startEntry = auditTrail.find(entry => entry.operation === 'START');
      const completeEntry = auditTrail.find(entry => entry.operation === 'COMPLETE');

      const summary: BatchAuditSummary = {
        batchId,
        inputHash: startEntry?.inputHash || '',
        startTime: startEntry?.timestamp || new Date(),
        endTime: completeEntry?.timestamp,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicatesFound: 0,
        clustersCreated: 0,
        goldenRecordsCreated: 0,
        processingTimeMs: 0,
        errors: [],
        falsePositives: matchQuality.potentialFalsePositives.length,
        falseNegatives: matchQuality.potentialFalseNegatives.length,
      };

      // Extract metrics from audit trail
      for (const entry of auditTrail) {
        switch (entry.operation) {
          case 'VALIDATION_COMPLETE':
            summary.validRecords = entry.metadata.validRecords || 0;
            summary.invalidRecords = entry.metadata.invalidRecords || 0;
            summary.totalRecords = summary.validRecords + summary.invalidRecords;
            break;
          case 'DEDUPLICATION_COMPLETE':
            summary.duplicatesFound = entry.metadata.duplicatesFound || 0;
            break;
          case 'CLUSTERING_COMPLETE':
            summary.clustersCreated = entry.metadata.clustersCreated || 0;
            break;
          case 'WRITING_COMPLETE':
            summary.goldenRecordsCreated = entry.metadata.goldenRecordsCreated || 0;
            break;
          case 'COMPLETE':
            summary.processingTimeMs = entry.duration || 0;
            break;
          case 'FAILED':
            if (entry.errorMessage) {
              summary.errors.push(entry.errorMessage);
            }
            break;
        }
      }

      return summary;
    } catch (error) {
      logger.error('Failed to generate batch audit report', { error, batchId });
      return null;
    }
  }

  /**
   * Exports audit data for BI/analytics
   */
  async exportAuditData(startDate: Date, endDate: Date): Promise<Array<{
    batchId: string;
    inputHash: string;
    operation: string;
    timestamp: Date;
    duration?: number;
    metadata: Record<string, any>;
    errorMessage?: string;
  }>> {
    try {
      const result = await executeQuery(
        `
        MATCH (audit:ETLAuditEntry)
        WHERE datetime(audit.timestamp) >= datetime($startDate)
        AND datetime(audit.timestamp) <= datetime($endDate)
        RETURN audit
        ORDER BY audit.timestamp ASC
        `,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        { readOnly: true }
      );

      return result.records.map(record => {
        const audit = record.get('audit').properties;
        return {
          batchId: audit.batchId,
          inputHash: audit.inputHash,
          operation: audit.operation,
          timestamp: new Date(audit.timestamp),
          duration: audit.duration,
          metadata: audit.metadata || {},
          errorMessage: audit.errorMessage,
        };
      });
    } catch (error) {
      logger.error('Failed to export audit data', { error, startDate, endDate });
      return [];
    }
  }
}

export const etlAuditService = new ETLAuditService();
