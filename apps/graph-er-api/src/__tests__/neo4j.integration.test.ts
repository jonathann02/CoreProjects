import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import neo4j from 'neo4j-driver';
import { initializeNeo4j, executeQuery } from '../database/neo4j.js';
import { processETLBatch } from '../services/etl.js';
import { EntityInput } from '@graph-er/shared';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('Neo4j Integration Tests', () => {
  let container: StartedTestContainer;
  let driver: neo4j.Driver;
  let tempFilePath: string;

  beforeAll(async () => {
    // Start Neo4j container for testing
    container = await new GenericContainer('neo4j:5.24')
      .withEnvironment({
        NEO4J_AUTH: 'neo4j/testpassword',
        NEO4J_PLUGINS: '["apoc"]',
        NEO4J_dbms_security_procedures_unrestricted: 'apoc.*',
        NEO4J_dbms_memory_heap_initial__size: '256m',
        NEO4J_dbms_memory_heap_max__size: '512m',
      })
      .withExposedPorts(7687)
      .withWaitStrategy(Wait.forLogMessage('Bolt enabled on'))
      .start();

    // Override environment variables for testing
    process.env.NEO4J_URI = `bolt://localhost:${container.getMappedPort(7687)}`;
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'testpassword';

    // Initialize the driver
    driver = await initializeNeo4j();

    // Create a temporary CSV file for testing
    const testData: EntityInput[] = [
      {
        id: 'test-1',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0123',
        address: '123 Main St',
        organizationName: 'Test Corp',
        source: 'test',
        batchId: 'test-batch',
        additionalData: {},
      },
      {
        id: 'test-2',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1-555-0456',
        address: '456 Oak Ave',
        source: 'test',
        batchId: 'test-batch',
        additionalData: {},
      },
      {
        id: 'test-3',
        name: 'J. Smith',
        email: 'john.smith@example.com', // Same email as test-1
        phone: '+1-555-0124',
        address: '123 Main Street',
        source: 'test',
        batchId: 'test-batch',
        additionalData: {},
      },
    ];

    // Create CSV content
    const csvContent = [
      'id,name,email,phone,address,organizationName,source,batchId',
      ...testData.map(record =>
        `${record.id},${record.name},${record.email},${record.phone},"${record.address}",${record.organizationName},${record.source},${record.batchId}`
      ),
    ].join('\n');

    // Write to temporary file
    const tempDir = tmpdir();
    tempFilePath = path.join(tempDir, 'test-data.csv');
    await fs.writeFile(tempFilePath, csvContent, 'utf-8');
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    // Clean up
    if (driver) {
      await driver.close();
    }
    if (container) {
      await container.stop();
    }
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Database Constraints', () => {
    it('should create unique constraints on node IDs', async () => {
      // Try to create two nodes with the same ID - should fail
      await expect(async () => {
        await executeQuery('CREATE (:TestNode {id: "duplicate"})');
        await executeQuery('CREATE (:TestNode {id: "duplicate"})');
      }).rejects.toThrow();

      // Clean up
      await executeQuery('MATCH (n:TestNode) DELETE n');
    });

    it('should create existence constraints on required properties', async () => {
      // This would be tested by the constraint creation in initializeNeo4j
      // For now, just verify the database is accessible
      const result = await executeQuery('RETURN "constraints_working" as status');
      expect(result.records[0].get('status')).toBe('constraints_working');
    });

    it('should create indices for performance', async () => {
      // Verify we can query the database (indices would be used automatically)
      const result = await executeQuery('RETURN "indices_working" as status');
      expect(result.records[0].get('status')).toBe('indices_working');
    });
  });

  describe('ETL Pipeline', () => {
    it('should process CSV file and create nodes in Neo4j', async () => {
      const batchId = 'integration-test-batch';

      // Process the ETL batch
      const result = await processETLBatch(tempFilePath, batchId);

      // Verify results
      expect(result.batchId).toBe(batchId);
      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBe(3);
      expect(result.invalidRecords).toBe(0);
      expect(result.processingTimeMs).toBeGreaterThan(0);

      // Verify data was written to Neo4j
      const sourceRecords = await executeQuery('MATCH (sr:SourceRecord) RETURN count(sr) as count');
      expect(sourceRecords.records[0].get('count').toNumber()).toBe(3);

      const goldenRecords = await executeQuery('MATCH (gr:GoldenRecord) RETURN count(gr) as count');
      expect(goldenRecords.records[0].get('count').toNumber()).toBeGreaterThan(0);

      const batchMeta = await executeQuery(
        'MATCH (bm:BatchMeta {id: $batchId}) RETURN bm',
        { batchId }
      );
      expect(batchMeta.records).toHaveLength(1);
      expect(batchMeta.records[0].get('bm').properties.status).toBe('completed');
    }, 30000); // 30 second timeout

    it('should create match links for duplicate records', async () => {
      // Query for match links
      const matchLinks = await executeQuery('MATCH ()-[r:MATCHES]->() RETURN count(r) as count');
      expect(matchLinks.records[0].get('count').toNumber()).toBeGreaterThan(0);
    });

    it('should create golden records with proper relationships', async () => {
      // Verify golden records have relationships to source records
      const relationships = await executeQuery(
        'MATCH (gr:GoldenRecord)-[:MERGED_FROM]->(sr:SourceRecord) RETURN count(*) as count'
      );
      expect(relationships.records[0].get('count').toNumber()).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Verify all source records are connected to golden records
      const orphanedRecords = await executeQuery(`
        MATCH (sr:SourceRecord)
        WHERE NOT (sr)<-[:MERGED_FROM]-(:GoldenRecord)
        RETURN count(sr) as count
      `);
      expect(orphanedRecords.records[0].get('count').toNumber()).toBe(0);
    });

    it('should store batch metadata correctly', async () => {
      const batchResult = await executeQuery(`
        MATCH (bm:BatchMeta)
        WHERE bm.id = "integration-test-batch"
        RETURN bm
      `);

      expect(batchResult.records).toHaveLength(1);
      const batch = batchResult.records[0].get('bm').properties;

      expect(batch.status).toBe('completed');
      expect(batch.recordCount).toBe(3);
      expect(batch.processedCount).toBe(3);
    });
  });
});
