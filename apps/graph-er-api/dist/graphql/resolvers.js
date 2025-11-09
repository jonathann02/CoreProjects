import { GraphQLError } from 'graphql';
import { executeQuery } from '../database/neo4j.js';
import { logger } from '../utils/logger.js';
export const resolvers = {
    Query: {
        health: () => 'Graph & Entity Resolution API is healthy',
        goldenRecord: async (_, { id }, context) => {
            try {
                const result = await executeQuery(`
          MATCH (gr:GoldenRecord {id: $id})
          OPTIONAL MATCH (gr)-[:MERGED_FROM]->(sr:SourceRecord)
          RETURN gr,
                 collect(DISTINCT sr.id) as sources,
                 collect(DISTINCT sr.batchId) as batchIds
          `, { id }, { readOnly: true });
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
            }
            catch (error) {
                logger.error('Failed to fetch golden record', { error, id });
                throw new GraphQLError('Failed to fetch golden record', {
                    extensions: { code: 'DATABASE_ERROR' },
                });
            }
        },
        goldenRecords: async (_, { pagination, search }, context) => {
            try {
                const page = pagination?.page || 1;
                const limit = Math.min(pagination?.limit || 50, 1000); // Hard limit
                const skip = (page - 1) * limit;
                // Build where clause from search parameters
                let whereClause = '';
                const params = { skip, limit };
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
                const countResult = await executeQuery(`MATCH (gr:GoldenRecord) ${whereClause} RETURN count(gr) as total`, params, { readOnly: true });
                const itemsResult = await executeQuery(`
          MATCH (gr:GoldenRecord)
          ${whereClause}
          OPTIONAL MATCH (gr)-[:MERGED_FROM]->(sr:SourceRecord)
          RETURN gr,
                 collect(DISTINCT sr.id) as sources,
                 collect(DISTINCT sr.batchId) as batchIds
          ORDER BY gr.createdAt DESC
          SKIP $skip LIMIT $limit
          `, params, { readOnly: true });
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
            }
            catch (error) {
                logger.error('Failed to fetch golden records', { error, pagination, search });
                throw new GraphQLError('Failed to fetch golden records', {
                    extensions: { code: 'DATABASE_ERROR' },
                });
            }
        },
        matchClusters: async (_, { pagination, status }, context) => {
            try {
                const page = pagination?.page || 1;
                const limit = Math.min(pagination?.limit || 50, 1000);
                const skip = (page - 1) * limit;
                let whereClause = '';
                const params = { skip, limit };
                if (status) {
                    whereClause = 'WHERE mc.status = $status';
                    params.status = status;
                }
                const countResult = await executeQuery(`MATCH (mc:MatchCluster) ${whereClause} RETURN count(mc) as total`, params, { readOnly: true });
                const itemsResult = await executeQuery(`
          MATCH (mc:MatchCluster)
          ${whereClause}
          OPTIONAL MATCH (mc)-[:CONTAINS]->(sr:SourceRecord)
          OPTIONAL MATCH (mc)-[:HAS_EDGE]->(edge:MatchLink)
          RETURN mc,
                 collect(DISTINCT sr.id) as recordIds,
                 collect(DISTINCT edge) as edges
          ORDER BY mc.createdAt DESC
          SKIP $skip LIMIT $limit
          `, params, { readOnly: true });
                const total = countResult.records[0].get('total').toNumber();
                const items = itemsResult.records.map(record => {
                    const mc = record.get('mc').properties;
                    const recordIds = record.get('recordIds');
                    const edges = record.get('edges').map((edge) => ({
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
            }
            catch (error) {
                logger.error('Failed to fetch match clusters', { error, pagination, status });
                throw new GraphQLError('Failed to fetch match clusters', {
                    extensions: { code: 'DATABASE_ERROR' },
                });
            }
        },
        batches: async (_, { pagination, status }, context) => {
            try {
                const page = pagination?.page || 1;
                const limit = Math.min(pagination?.limit || 50, 1000);
                const skip = (page - 1) * limit;
                let whereClause = '';
                const params = { skip, limit };
                if (status) {
                    whereClause = 'WHERE bm.status = $status';
                    params.status = status;
                }
                const countResult = await executeQuery(`MATCH (bm:BatchMeta) ${whereClause} RETURN count(bm) as total`, params, { readOnly: true });
                const itemsResult = await executeQuery(`
          MATCH (bm:BatchMeta)
          ${whereClause}
          RETURN bm
          ORDER BY bm.uploadedAt DESC
          SKIP $skip LIMIT $limit
          `, params, { readOnly: true });
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
            }
            catch (error) {
                logger.error('Failed to fetch batches', { error, pagination, status });
                throw new GraphQLError('Failed to fetch batches', {
                    extensions: { code: 'DATABASE_ERROR' },
                });
            }
        },
    },
    Mutation: {
        ping: () => 'pong',
        acceptMerge: async (_, { clusterId, chosenRecordId }, context) => {
            // TODO: Implement merge logic
            logger.info('Accept merge requested', { clusterId, chosenRecordId });
            throw new GraphQLError('Merge functionality not yet implemented', {
                extensions: { code: 'NOT_IMPLEMENTED' },
            });
        },
        splitRecord: async (_, { recordId }, context) => {
            // TODO: Implement split logic
            logger.info('Split record requested', { recordId });
            throw new GraphQLError('Split functionality not yet implemented', {
                extensions: { code: 'NOT_IMPLEMENTED' },
            });
        },
        reindexBatch: async (_, { batchId }, context) => {
            // TODO: Implement batch reindexing
            logger.info('Reindex batch requested', { batchId });
            throw new GraphQLError('Reindex functionality not yet implemented', {
                extensions: { code: 'NOT_IMPLEMENTED' },
            });
        },
    },
};
//# sourceMappingURL=resolvers.js.map