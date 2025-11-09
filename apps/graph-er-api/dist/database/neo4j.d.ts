/**
 * Initialize Neo4j driver with connection pooling and configuration
 */
export declare function initializeNeo4j(): Promise<neo4j.Driver>;
/**
 * Get Neo4j driver instance
 */
export declare function getDriver(): neo4j.Driver;
/**
 * Close Neo4j driver connection
 */
export declare function closeDriver(): Promise<void>;
/**
 * Execute a Cypher query with proper error handling and logging
 */
export declare function executeQuery(query: string, parameters?: Record<string, any>, options?: {
    timeout?: number;
    readOnly?: boolean;
}): Promise<neo4j.QueryResult>;
//# sourceMappingURL=neo4j.d.ts.map