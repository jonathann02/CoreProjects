import { createReadStream, promises as fs } from 'fs';
import csv from 'csv-parser';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';

import {
  EntityInput,
  EntityInputSchema,
  normalizeName,
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  createNaturalKey,
  calculateSimilarity,
} from '@graph-er/shared';

import { executeQuery } from '../database/neo4j.js';
import { logger } from '../utils/logger.js';

export interface ETLResult {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicatesFound: number;
  clustersCreated: number;
  goldenRecordsCreated: number;
  processingTimeMs: number;
  errors: string[];
}

export interface ETLProgress {
  stage: 'reading' | 'validating' | 'normalizing' | 'deduplicating' | 'clustering' | 'writing';
  processed: number;
  total: number;
  message: string;
}

/**
 * Execute the complete ETL pipeline for a CSV file
 */
export async function processETLBatch(
  filePath: string,
  batchId: string,
  onProgress?: (progress: ETLProgress) => void
): Promise<ETLResult> {
  const startTime = Date.now();
  const result: ETLResult = {
    batchId,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    duplicatesFound: 0,
    clustersCreated: 0,
    goldenRecordsCreated: 0,
    processingTimeMs: 0,
    errors: [],
  };

  try {
    logger.info('Starting ETL pipeline', { batchId, filePath });

    // Stage 1: Read and validate CSV
    onProgress?.({ stage: 'reading', processed: 0, total: 100, message: 'Reading CSV file' });
    const records = await readCSVFile(filePath, batchId);
    result.totalRecords = records.length;

    // Stage 2: Validate and normalize
    onProgress?.({ stage: 'validating', processed: 0, total: records.length, message: 'Validating records' });
    const { validRecords, invalidRecords } = await validateRecords(records, result);
    result.validRecords = validRecords.length;
    result.invalidRecords = invalidRecords.length;

    // Stage 3: Normalize data
    onProgress?.({ stage: 'normalizing', processed: 0, total: validRecords.length, message: 'Normalizing data' });
    const normalizedRecords = normalizeRecords(validRecords);

    // Stage 4: Deduplicate and create match links
    onProgress?.({ stage: 'deduplicating', processed: 0, total: normalizedRecords.length, message: 'Finding duplicates' });
    const { matchLinks, duplicatesFound } = await findDuplicates(normalizedRecords);
    result.duplicatesFound = duplicatesFound;

    // Stage 5: Create clusters
    onProgress?.({ stage: 'clustering', processed: 0, total: normalizedRecords.length, message: 'Building clusters' });
    const clusters = buildClusters(normalizedRecords, matchLinks);
    result.clustersCreated = clusters.length;

    // Stage 6: Write to Neo4j
    onProgress?.({ stage: 'writing', processed: 0, total: normalizedRecords.length + clusters.length, message: 'Writing to database' });
    await writeToNeo4j(normalizedRecords, matchLinks, clusters, batchId);
    result.goldenRecordsCreated = clusters.length;

    result.processingTimeMs = Date.now() - startTime;
    logger.info('ETL pipeline completed', result);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    logger.error('ETL pipeline failed', { error, batchId });
  }

  return result;
}

/**
 * Read CSV file and convert to records
 */
async function readCSVFile(filePath: string, batchId: string): Promise<EntityInput[]> {
  const records: EntityInput[] = [];

  await pipeline(
    createReadStream(filePath),
    csv({
      mapHeaders: ({ header }) => header.toLowerCase().trim(),
      mapValues: ({ value }) => value?.toString().trim() || '',
    }),
    new Transform({
      objectMode: true,
      transform(row: any, encoding, callback) {
        try {
          const record: EntityInput = {
            id: row.id || undefined,
            sourceId: row.sourceid || row.source_id || undefined,
            name: row.name || row.fullname || row.full_name || '',
            email: row.email || '',
            phone: row.phone || row.phonenumber || row.phone_number || '',
            address: row.address || '',
            organizationName: row.organization || row.organizationname || row.organization_name || '',
            organizationId: row.organizationid || row.organization_id || '',
            source: row.source || 'csv_upload',
            batchId,
            additionalData: row,
          };
          records.push(record);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    })
  );

  return records;
}

/**
 * Validate records against schema
 */
async function validateRecords(records: EntityInput[], result: ETLResult) {
  const validRecords: EntityInput[] = [];
  const invalidRecords: EntityInput[] = [];

  for (const record of records) {
    try {
      const validated = EntityInputSchema.parse(record);
      validRecords.push(validated);
    } catch (error) {
      invalidRecords.push(record);
      result.errors.push(`Invalid record: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { validRecords, invalidRecords };
}

/**
 * Normalize record data
 */
function normalizeRecords(records: EntityInput[]): EntityInput[] {
  return records.map(record => ({
    ...record,
    name: normalizeName(record.name),
    email: normalizeEmail(record.email),
    phone: normalizePhone(record.phone),
    address: normalizeAddress(record.address),
    organizationName: normalizeName(record.organizationName),
  }));
}

/**
 * Find duplicates and create match links
 */
async function findDuplicates(records: EntityInput[]): Promise<{ matchLinks: any[], duplicatesFound: number }> {
  const matchLinks: any[] = [];
  const duplicatesFound = 0;

  // Group records by natural key (exact matches)
  const naturalKeyGroups = new Map<string, EntityInput[]>();

  for (const record of records) {
    const naturalKey = createNaturalKey(record.name, record.email, record.phone, record.organizationId);

    if (!naturalKeyGroups.has(naturalKey)) {
      naturalKeyGroups.set(naturalKey, []);
    }
    naturalKeyGroups.get(naturalKey)!.push(record);
  }

  // Create match links for groups with multiple records
  for (const [naturalKey, group] of naturalKeyGroups.entries()) {
    if (group.length > 1) {
      // Create links between all pairs in the group
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const recordA = group[i];
          const recordB = group[j];

          matchLinks.push({
            id: crypto.randomUUID(),
            sourceRecordId: recordA.id || `${recordA.batchId}_${i}`,
            targetRecordId: recordB.id || `${recordB.batchId}_${j}`,
            method: 'exact',
            score: 1.0,
            metadata: { naturalKey },
            createdAt: new Date(),
          });
        }
      }
    }
  }

  // TODO: Add fuzzy matching for near-duplicates
  // This would use similarity scoring on names, emails, etc.

  return { matchLinks, duplicatesFound };
}

/**
 * Build clusters from match links
 */
function buildClusters(records: EntityInput[], matchLinks: any[]): any[] {
  // Simple clustering: each connected component becomes a cluster
  const clusters: any[] = [];
  const processed = new Set<string>();

  // Create adjacency list
  const adjacencyList = new Map<string, string[]>();
  for (const link of matchLinks) {
    const sourceId = link.sourceRecordId;
    const targetId = link.targetRecordId;

    if (!adjacencyList.has(sourceId)) adjacencyList.set(sourceId, []);
    if (!adjacencyList.has(targetId)) adjacencyList.set(targetId, []);

    adjacencyList.get(sourceId)!.push(targetId);
    adjacencyList.get(targetId)!.push(sourceId);
  }

  // Add isolated records as single-record clusters
  for (const record of records) {
    const recordId = record.id || `${record.batchId}_${records.indexOf(record)}`;
    if (!adjacencyList.has(recordId)) {
      adjacencyList.set(recordId, []);
    }
  }

  // Find connected components (simplified DFS)
  function dfs(nodeId: string, component: string[]) {
    if (processed.has(nodeId)) return;
    processed.add(nodeId);
    component.push(nodeId);

    for (const neighbor of adjacencyList.get(nodeId) || []) {
      dfs(neighbor, component);
    }
  }

  for (const nodeId of adjacencyList.keys()) {
    if (!processed.has(nodeId)) {
      const component: string[] = [];
      dfs(nodeId, component);

      clusters.push({
        id: crypto.randomUUID(),
        recordIds: component,
        edges: matchLinks.filter(link =>
          component.includes(link.sourceRecordId) && component.includes(link.targetRecordId)
        ),
        suggestedMerges: [], // TODO: Implement merge suggestions
        status: component.length > 1 ? 'pending' : 'resolved',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return clusters;
}

/**
 * Write processed data to Neo4j
 */
async function writeToNeo4j(
  records: EntityInput[],
  matchLinks: any[],
  clusters: any[],
  batchId: string
): Promise<void> {
  const session = (await import('../database/neo4j.js')).getDriver().session();

  try {
    // Create batch metadata
    await session.run(
      `
      CREATE (b:BatchMeta {
        id: $batchId,
        filename: $filename,
        uploadedBy: $uploadedBy,
        uploadedAt: datetime(),
        recordCount: $recordCount,
        processedCount: $processedCount,
        status: $status,
        errorMessage: $errorMessage,
        processingStats: $processingStats
      })
      `,
      {
        batchId,
        filename: `batch_${batchId}.csv`,
        uploadedBy: 'system',
        recordCount: records.length,
        processedCount: records.length,
        status: 'completed',
        errorMessage: null,
        processingStats: {
          duplicatesFound: matchLinks.length,
          clustersCreated: clusters.length,
          goldenRecordsCreated: clusters.length,
          processingTimeMs: 0, // Will be updated
        },
      }
    );

    // Create source records
    for (const record of records) {
      const recordId = record.id || `${batchId}_${records.indexOf(record)}`;
      await session.run(
        `
        CREATE (sr:SourceRecord {
          id: $id,
          name: $name,
          email: $email,
          phone: $phone,
          address: $address,
          organizationName: $organizationName,
          organizationId: $organizationId,
          source: $source,
          batchId: $batchId,
          createdAt: datetime()
        })
        `,
        {
          id: recordId,
          name: record.name,
          email: record.email,
          phone: record.phone,
          address: record.address,
          organizationName: record.organizationName,
          organizationId: record.organizationId,
          source: record.source,
          batchId,
        }
      );
    }

    // Create match links
    for (const link of matchLinks) {
      await session.run(
        `
        MATCH (a:SourceRecord {id: $sourceId}), (b:SourceRecord {id: $targetId})
        CREATE (a)-[:MATCHES {
          id: $id,
          method: $method,
          score: $score,
          metadata: $metadata,
          createdAt: datetime()
        }]->(b)
        `,
        link
      );
    }

    // Create golden records and clusters
    for (const cluster of clusters) {
      // For now, create one golden record per cluster
      // TODO: Implement proper golden record creation logic
      const representativeRecord = records.find(r => {
        const recordId = r.id || `${batchId}_${records.indexOf(r)}`;
        return cluster.recordIds.includes(recordId);
      });

      if (representativeRecord) {
        await session.run(
          `
          CREATE (gr:GoldenRecord {
            id: $id,
            naturalKey: $naturalKey,
            name: $name,
            emails: $emails,
            phones: $phones,
            addresses: $addresses,
            organizationName: $organizationName,
            organizationId: $organizationId,
            sources: $sources,
            batchIds: $batchIds,
            createdAt: datetime(),
            updatedAt: datetime(),
            confidence: $confidence
          })
          `,
          {
            id: crypto.randomUUID(),
            naturalKey: createNaturalKey(
              representativeRecord.name,
              representativeRecord.email,
              representativeRecord.phone,
              representativeRecord.organizationId
            ),
            name: representativeRecord.name,
            emails: representativeRecord.email ? [representativeRecord.email] : [],
            phones: representativeRecord.phone ? [representativeRecord.phone] : [],
            addresses: representativeRecord.address ? [representativeRecord.address] : [],
            organizationName: representativeRecord.organizationName,
            organizationId: representativeRecord.organizationId,
            sources: cluster.recordIds,
            batchIds: [batchId],
            confidence: cluster.recordIds.length > 1 ? 0.8 : 1.0,
          }
        );

        // Link golden record to source records
        for (const recordId of cluster.recordIds) {
          await session.run(
            `
            MATCH (gr:GoldenRecord {id: $goldenId}), (sr:SourceRecord {id: $sourceId})
            CREATE (gr)-[:MERGED_FROM {
              batchId: $batchId,
              createdAt: datetime()
            }]->(sr)
            `,
            {
              goldenId: cluster.id, // Using cluster id temporarily
              sourceId: recordId,
              batchId,
            }
          );
        }
      }
    }

    logger.info('Successfully wrote ETL data to Neo4j', {
      batchId,
      recordsCount: records.length,
      linksCount: matchLinks.length,
      clustersCount: clusters.length,
    });

  } catch (error) {
    logger.error('Failed to write ETL data to Neo4j', { error, batchId });
    throw error;
  } finally {
    await session.close();
  }
}
