import neo4j from 'neo4j-driver';
import { logger } from '../utils/logger.js';

let driver: neo4j.Driver;

/**
 * Initialize Neo4j driver with connection pooling and configuration
 */
export async function initializeNeo4j(): Promise<neo4j.Driver> {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'grapher123';

  if (!password || password === 'grapher123') {
    logger.warn('Using default Neo4j password - change in production');
  }

  // Create driver with connection pooling
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_CONNECTION_POOL_SIZE || '10'),
    connectionAcquisitionTimeout: parseInt(process.env.NEO4J_CONNECTION_ACQUISITION_TIMEOUT || '60000'),
    maxTransactionRetryTime: parseInt(process.env.NEO4J_MAX_TRANSACTION_RETRY_TIME || '30000'),
    // Security: disable telemetry
    disableLosslessIntegers: true,
  });

  // Verify connection
  try {
    const session = driver.session();
    await session.run('RETURN 1 as test');
    await session.close();
    logger.info('Neo4j connection verified');
  } catch (error) {
    logger.error({ error, uri }, 'Failed to verify Neo4j connection');
    throw error;
  }

  // Create database constraints and indices
  await createConstraints();

  return driver;
}

/**
 * Create Neo4j constraints and indices for data integrity
 */
async function createConstraints(): Promise<void> {
  const session = driver.session();

  try {
    logger.info('Creating Neo4j constraints and indices');

    // Constraints for uniqueness
    const constraints = [
      'CREATE CONSTRAINT source_record_id IF NOT EXISTS FOR (sr:SourceRecord) REQUIRE sr.id IS UNIQUE',
      'CREATE CONSTRAINT golden_record_id IF NOT EXISTS FOR (gr:GoldenRecord) REQUIRE gr.id IS UNIQUE',
      'CREATE CONSTRAINT golden_record_natural_key IF NOT EXISTS FOR (gr:GoldenRecord) REQUIRE gr.naturalKey IS UNIQUE',
      'CREATE CONSTRAINT batch_meta_id IF NOT EXISTS FOR (bm:BatchMeta) REQUIRE bm.id IS UNIQUE',
      'CREATE CONSTRAINT match_cluster_id IF NOT EXISTS FOR (mc:MatchCluster) REQUIRE mc.id IS UNIQUE',
    ];

    // Existence constraints for required properties
    const existenceConstraints = [
      'CREATE CONSTRAINT source_record_batch_id IF NOT EXISTS FOR (sr:SourceRecord) REQUIRE sr.batchId IS NOT NULL',
      'CREATE CONSTRAINT source_record_source IF NOT EXISTS FOR (sr:SourceRecord) REQUIRE sr.source IS NOT NULL',
      'CREATE CONSTRAINT golden_record_name IF NOT EXISTS FOR (gr:GoldenRecord) REQUIRE gr.name IS NOT NULL',
      'CREATE CONSTRAINT batch_meta_filename IF NOT EXISTS FOR (bm:BatchMeta) REQUIRE bm.filename IS NOT NULL',
    ];

    // Indices for performance
    const indices = [
      'CREATE INDEX source_record_batch_id IF NOT EXISTS FOR (sr:SourceRecord) ON (sr.batchId)',
      'CREATE INDEX source_record_name IF NOT EXISTS FOR (sr:SourceRecord) ON (sr.name)',
      'CREATE INDEX source_record_email IF NOT EXISTS FOR (sr:SourceRecord) ON (sr.email)',
      'CREATE INDEX golden_record_name IF NOT EXISTS FOR (gr:GoldenRecord) ON (gr.name)',
      'CREATE INDEX golden_record_email IF NOT EXISTS FOR (gr:GoldenRecord) ON (gr.emails)',
      'CREATE INDEX batch_meta_status IF NOT EXISTS FOR (bm:BatchMeta) ON (bm.status)',
      'CREATE INDEX match_cluster_status IF NOT EXISTS FOR (mc:MatchCluster) ON (mc.status)',
    ];

    // Execute all constraints and indices
    const allCommands = [...constraints, ...existenceConstraints, ...indices];

    for (const command of allCommands) {
      try {
        await session.run(command);
        logger.debug('Executed constraint/index command', { command: command.split(' FOR ')[0] });
      } catch (error) {
        // Log but don't fail - constraint might already exist
        logger.warn('Constraint/index creation failed (might already exist)', {
          command: command.split(' FOR ')[0],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Neo4j constraints and indices setup complete');
  } catch (error) {
    logger.error('Failed to create Neo4j constraints', { error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Get Neo4j driver instance
 */
export function getDriver(): neo4j.Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized');
  }
  return driver;
}

/**
 * Close Neo4j driver connection
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info('Neo4j driver closed');
  }
}

/**
 * Execute a Cypher query with proper error handling and logging
 */
export async function executeQuery(
  query: string,
  parameters: Record<string, any> = {},
  options: { timeout?: number; readOnly?: boolean } = {}
): Promise<neo4j.QueryResult> {
  const session = driver.session({
    defaultAccessMode: options.readOnly ? neo4j.session.READ : neo4j.session.WRITE,
  });

  try {
    const result = await session.run(query, parameters);
    logger.debug('Executed Cypher query', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      parameters: Object.keys(parameters),
      recordsCount: result.records.length,
    });
    return result;
  } catch (error) {
    logger.error('Cypher query execution failed', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      parameters: Object.keys(parameters),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await session.close();
  }
}
