import { z } from 'zod';
export declare const EntityInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    address: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    organizationName: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    organizationId: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    source: z.ZodString;
    batchId: z.ZodString;
    additionalData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    source: string;
    batchId: string;
    id?: string | undefined;
    sourceId?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    organizationName?: string | undefined;
    organizationId?: string | undefined;
    additionalData?: Record<string, any> | undefined;
}, {
    name: string;
    source: string;
    batchId: string;
    id?: string | undefined;
    sourceId?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    organizationName?: string | undefined;
    organizationId?: string | undefined;
    additionalData?: Record<string, any> | undefined;
}>;
export declare const GoldenRecordSchema: z.ZodObject<{
    id: z.ZodString;
    naturalKey: z.ZodString;
    name: z.ZodString;
    emails: z.ZodArray<z.ZodString, "many">;
    phones: z.ZodArray<z.ZodString, "many">;
    addresses: z.ZodArray<z.ZodString, "many">;
    organizationName: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    sources: z.ZodArray<z.ZodString, "many">;
    batchIds: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    naturalKey: string;
    emails: string[];
    phones: string[];
    addresses: string[];
    sources: string[];
    batchIds: string[];
    createdAt: Date;
    updatedAt: Date;
    confidence: number;
    organizationName?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    name: string;
    naturalKey: string;
    emails: string[];
    phones: string[];
    addresses: string[];
    sources: string[];
    batchIds: string[];
    createdAt: Date;
    updatedAt: Date;
    confidence: number;
    organizationName?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const MatchLinkSchema: z.ZodObject<{
    id: z.ZodString;
    sourceRecordId: z.ZodString;
    targetRecordId: z.ZodString;
    method: z.ZodEnum<["exact", "fuzzy_name", "fuzzy_email", "fuzzy_phone", "similarity_cluster"]>;
    score: z.ZodNumber;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    sourceRecordId: string;
    targetRecordId: string;
    method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
    score: number;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    createdAt: Date;
    sourceRecordId: string;
    targetRecordId: string;
    method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
    score: number;
    metadata?: Record<string, any> | undefined;
}>;
export declare const MatchClusterSchema: z.ZodObject<{
    id: z.ZodString;
    recordIds: z.ZodArray<z.ZodString, "many">;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceRecordId: z.ZodString;
        targetRecordId: z.ZodString;
        method: z.ZodEnum<["exact", "fuzzy_name", "fuzzy_email", "fuzzy_phone", "similarity_cluster"]>;
        score: z.ZodNumber;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        sourceRecordId: string;
        targetRecordId: string;
        method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
        score: number;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        createdAt: Date;
        sourceRecordId: string;
        targetRecordId: string;
        method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
        score: number;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    suggestedMerges: z.ZodArray<z.ZodObject<{
        recordIds: z.ZodArray<z.ZodString, "many">;
        confidence: z.ZodNumber;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        recordIds: string[];
        reason: string;
    }, {
        confidence: number;
        recordIds: string[];
        reason: string;
    }>, "many">;
    status: z.ZodEnum<["pending", "reviewed", "resolved"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "reviewed" | "resolved";
    recordIds: string[];
    edges: {
        id: string;
        createdAt: Date;
        sourceRecordId: string;
        targetRecordId: string;
        method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
        score: number;
        metadata?: Record<string, any> | undefined;
    }[];
    suggestedMerges: {
        confidence: number;
        recordIds: string[];
        reason: string;
    }[];
}, {
    id: string;
    status: "pending" | "reviewed" | "resolved";
    recordIds: string[];
    edges: {
        id: string;
        createdAt: Date;
        sourceRecordId: string;
        targetRecordId: string;
        method: "exact" | "fuzzy_name" | "fuzzy_email" | "fuzzy_phone" | "similarity_cluster";
        score: number;
        metadata?: Record<string, any> | undefined;
    }[];
    suggestedMerges: {
        confidence: number;
        recordIds: string[];
        reason: string;
    }[];
}>;
export declare const BatchMetaSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    uploadedBy: z.ZodString;
    uploadedAt: z.ZodDate;
    recordCount: z.ZodNumber;
    processedCount: z.ZodNumber;
    status: z.ZodEnum<["uploading", "processing", "completed", "failed"]>;
    errorMessage: z.ZodOptional<z.ZodString>;
    processingStats: z.ZodOptional<z.ZodObject<{
        duplicatesFound: z.ZodNumber;
        clustersCreated: z.ZodNumber;
        goldenRecordsCreated: z.ZodNumber;
        processingTimeMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        duplicatesFound: number;
        clustersCreated: number;
        goldenRecordsCreated: number;
        processingTimeMs: number;
    }, {
        duplicatesFound: number;
        clustersCreated: number;
        goldenRecordsCreated: number;
        processingTimeMs: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "uploading" | "processing" | "completed" | "failed";
    filename: string;
    uploadedBy: string;
    uploadedAt: Date;
    recordCount: number;
    processedCount: number;
    errorMessage?: string | undefined;
    processingStats?: {
        duplicatesFound: number;
        clustersCreated: number;
        goldenRecordsCreated: number;
        processingTimeMs: number;
    } | undefined;
}, {
    id: string;
    status: "uploading" | "processing" | "completed" | "failed";
    filename: string;
    uploadedBy: string;
    uploadedAt: Date;
    recordCount: number;
    processedCount: number;
    errorMessage?: string | undefined;
    processingStats?: {
        duplicatesFound: number;
        clustersCreated: number;
        goldenRecordsCreated: number;
        processingTimeMs: number;
    } | undefined;
}>;
export declare const UploadSessionSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    contentType: z.ZodString;
    totalSize: z.ZodNumber;
    uploadedSize: z.ZodNumber;
    chunkCount: z.ZodNumber;
    status: z.ZodEnum<["active", "completed", "failed", "expired"]>;
    createdAt: z.ZodDate;
    expiresAt: z.ZodDate;
    tempPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "completed" | "failed" | "active" | "expired";
    createdAt: Date;
    filename: string;
    contentType: string;
    totalSize: number;
    uploadedSize: number;
    chunkCount: number;
    expiresAt: Date;
    tempPath: string;
}, {
    id: string;
    status: "completed" | "failed" | "active" | "expired";
    createdAt: Date;
    filename: string;
    contentType: string;
    totalSize: number;
    uploadedSize: number;
    chunkCount: number;
    expiresAt: Date;
    tempPath: string;
}>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const SearchParamsSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    organizationName: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    minConfidence: z.ZodOptional<z.ZodNumber>;
    maxConfidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    organizationName?: string | undefined;
    batchId?: string | undefined;
    query?: string | undefined;
    minConfidence?: number | undefined;
    maxConfidence?: number | undefined;
}, {
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    organizationName?: string | undefined;
    batchId?: string | undefined;
    query?: string | undefined;
    minConfidence?: number | undefined;
    maxConfidence?: number | undefined;
}>;
export declare const PagedResultSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    hasNext: z.ZodBoolean;
    hasPrev: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    items: T["_output"][];
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
}, {
    page: number;
    limit: number;
    items: T["_input"][];
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
}>;
export declare const ApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: any;
    }, {
        code: string;
        message: string;
        details?: any;
    }>>;
    requestId: z.ZodString;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: any;
    }, {
        code: string;
        message: string;
        details?: any;
    }>>;
    requestId: z.ZodString;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: any;
    }, {
        code: string;
        message: string;
        details?: any;
    }>>;
    requestId: z.ZodString;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const HealthCheckSchema: z.ZodObject<{
    status: z.ZodEnum<["ok", "degraded", "unhealthy"]>;
    timestamp: z.ZodDate;
    version: z.ZodString;
    services: z.ZodRecord<z.ZodString, z.ZodObject<{
        status: z.ZodEnum<["ok", "degraded", "unhealthy"]>;
        message: z.ZodOptional<z.ZodString>;
        latency: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "ok" | "degraded" | "unhealthy";
        message?: string | undefined;
        latency?: number | undefined;
    }, {
        status: "ok" | "degraded" | "unhealthy";
        message?: string | undefined;
        latency?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "ok" | "degraded" | "unhealthy";
    timestamp: Date;
    version: string;
    services: Record<string, {
        status: "ok" | "degraded" | "unhealthy";
        message?: string | undefined;
        latency?: number | undefined;
    }>;
}, {
    status: "ok" | "degraded" | "unhealthy";
    timestamp: Date;
    version: string;
    services: Record<string, {
        status: "ok" | "degraded" | "unhealthy";
        message?: string | undefined;
        latency?: number | undefined;
    }>;
}>;
export type EntityInput = z.infer<typeof EntityInputSchema>;
export type GoldenRecord = z.infer<typeof GoldenRecordSchema>;
export type MatchLink = z.infer<typeof MatchLinkSchema>;
export type MatchCluster = z.infer<typeof MatchClusterSchema>;
export type BatchMeta = z.infer<typeof BatchMetaSchema>;
export type UploadSession = z.infer<typeof UploadSessionSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
//# sourceMappingURL=schemas.d.ts.map