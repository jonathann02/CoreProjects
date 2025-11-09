import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { UploadSessionSchema } from '@graph-er/shared';
// In-memory storage for upload sessions (use Redis in production)
const uploadSessions = new Map();
// Configure multer for memory storage (we'll stream to disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10000000'), // 10MB default
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        // Only allow CSV files
        if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
            cb(new Error('Only CSV files are allowed'));
            return;
        }
        cb(null, true);
    },
});
export function createUploadRoutes() {
    const router = express.Router();
    /**
     * Start a new upload session
     * POST /v1/upload/start
     */
    router.post('/upload/start', async (req, res) => {
        try {
            const sessionId = randomUUID();
            const tempDir = process.env.TEMP_DIR || '/tmp/graph-er-uploads';
            const tempPath = path.join(tempDir, `${sessionId}.csv`);
            // Ensure temp directory exists
            await fs.mkdir(tempDir, { recursive: true });
            const session = {
                id: sessionId,
                filename: req.body.filename || 'upload.csv',
                contentType: req.body.contentType || 'text/csv',
                totalSize: parseInt(req.body.totalSize) || 0,
                uploadedSize: 0,
                chunkCount: 0,
                status: 'active',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                tempPath,
            };
            // Validate session data
            const validatedSession = UploadSessionSchema.parse(session);
            uploadSessions.set(sessionId, validatedSession);
            logger.info('Upload session started', {
                sessionId,
                filename: session.filename,
                totalSize: session.totalSize,
            });
            res.json({
                sessionId,
                expiresAt: session.expiresAt.toISOString(),
            });
        }
        catch (error) {
            logger.error('Failed to start upload session', { error });
            res.status(500).json({
                error: 'Failed to start upload session',
                code: 'UPLOAD_SESSION_START_FAILED',
            });
        }
    });
    /**
     * Upload a chunk of the file
     * POST /v1/upload/:sessionId/chunk
     */
    router.post('/upload/:sessionId/chunk', upload.single('chunk'), async (req, res) => {
        const { sessionId } = req.params;
        const chunkIndex = parseInt(req.body.chunkIndex) || 0;
        try {
            const session = uploadSessions.get(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: 'Upload session not found',
                    code: 'SESSION_NOT_FOUND',
                });
            }
            if (session.status !== 'active') {
                return res.status(400).json({
                    error: 'Upload session is not active',
                    code: 'SESSION_NOT_ACTIVE',
                });
            }
            if (new Date() > session.expiresAt) {
                session.status = 'expired';
                return res.status(410).json({
                    error: 'Upload session has expired',
                    code: 'SESSION_EXPIRED',
                });
            }
            if (!req.file) {
                return res.status(400).json({
                    error: 'No file chunk provided',
                    code: 'NO_CHUNK_PROVIDED',
                });
            }
            // Append chunk to temp file
            await fs.appendFile(session.tempPath, req.file.buffer);
            // Update session
            session.uploadedSize += req.file.size;
            session.chunkCount = Math.max(session.chunkCount, chunkIndex + 1);
            logger.debug('Upload chunk processed', {
                sessionId,
                chunkIndex,
                chunkSize: req.file.size,
                totalUploaded: session.uploadedSize,
            });
            res.json({
                sessionId,
                chunkIndex,
                uploadedSize: session.uploadedSize,
                remaining: Math.max(0, session.totalSize - session.uploadedSize),
            });
        }
        catch (error) {
            logger.error('Failed to process upload chunk', { error, sessionId });
            res.status(500).json({
                error: 'Failed to process upload chunk',
                code: 'CHUNK_PROCESS_FAILED',
            });
        }
    });
    /**
     * Commit the upload and trigger ETL processing
     * POST /v1/upload/:sessionId/commit
     */
    router.post('/upload/:sessionId/commit', async (req, res) => {
        const { sessionId } = req.params;
        try {
            const session = uploadSessions.get(sessionId);
            if (!session) {
                return res.status(404).json({
                    error: 'Upload session not found',
                    code: 'SESSION_NOT_FOUND',
                });
            }
            if (session.status !== 'active') {
                return res.status(400).json({
                    error: 'Upload session is not active',
                    code: 'SESSION_NOT_ACTIVE',
                });
            }
            // Validate that we have the complete file
            const stats = await fs.stat(session.tempPath);
            if (stats.size !== session.uploadedSize) {
                return res.status(400).json({
                    error: 'File size mismatch',
                    code: 'FILE_SIZE_MISMATCH',
                });
            }
            // TODO: Trigger ETL pipeline here
            // For now, just mark as completed
            session.status = 'completed';
            logger.info('Upload committed for processing', {
                sessionId,
                filename: session.filename,
                totalSize: session.uploadedSize,
            });
            res.json({
                sessionId,
                status: 'processing',
                message: 'File uploaded successfully, ETL processing started',
                batchId: randomUUID(), // TODO: Return actual batch ID from ETL
            });
        }
        catch (error) {
            logger.error('Failed to commit upload', { error, sessionId });
            res.status(500).json({
                error: 'Failed to commit upload',
                code: 'COMMIT_FAILED',
            });
        }
    });
    /**
     * Get upload session status
     * GET /v1/upload/:sessionId/status
     */
    router.get('/upload/:sessionId/status', (req, res) => {
        const { sessionId } = req.params;
        const session = uploadSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                error: 'Upload session not found',
                code: 'SESSION_NOT_FOUND',
            });
        }
        res.json({
            sessionId,
            status: session.status,
            uploadedSize: session.uploadedSize,
            totalSize: session.totalSize,
            progress: session.totalSize > 0 ? (session.uploadedSize / session.totalSize) * 100 : 0,
            expiresAt: session.expiresAt.toISOString(),
        });
    });
    return router;
}
//# sourceMappingURL=upload.js.map