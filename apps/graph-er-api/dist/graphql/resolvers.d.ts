import type { Context } from '../types.js';
export declare const resolvers: {
    Query: {
        health: () => string;
        goldenRecord: (_: any, { id }: {
            id: string;
        }, context: Context) => Promise<any>;
        goldenRecords: (_: any, { pagination, search }: {
            pagination?: any;
            search?: any;
        }, context: Context) => Promise<{
            items: any;
            pagination: {
                page: any;
                limit: number;
                total: any;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        matchClusters: (_: any, { pagination, status }: {
            pagination?: any;
            status?: string;
        }, context: Context) => Promise<{
            items: any;
            pagination: {
                page: any;
                limit: number;
                total: any;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        batches: (_: any, { pagination, status }: {
            pagination?: any;
            status?: string;
        }, context: Context) => Promise<{
            items: any;
            pagination: {
                page: any;
                limit: number;
                total: any;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
    };
    Mutation: {
        ping: () => string;
        acceptMerge: (_: any, { clusterId, chosenRecordId }: {
            clusterId: string;
            chosenRecordId?: string;
        }, context: Context) => Promise<boolean>;
        splitRecord: (_: any, { recordId }: {
            recordId: string;
        }, context: Context) => Promise<boolean>;
        reindexBatch: (_: any, { batchId }: {
            batchId: string;
        }, context: Context) => Promise<boolean>;
    };
};
//# sourceMappingURL=resolvers.d.ts.map