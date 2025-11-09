import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import expressRateLimit from 'express-rate-limit';

import { logger } from '../utils/logger.js';
import { UploadSessionSchema } from '@graph-er/shared';
import { processETLBatch } from '../services/etl.js';

// In-memory storage for upload sessions (use Redis in production)
const uploadSessions = new Map<string, z.infer<typeof UploadSessionSchema>>();

/**
 * Basic validation to check if content looks like valid CSV data.
 * This is a simple check to prevent obviously malicious uploads.
 */
function isValidCSVContent(content: string): boolean {
  if (!content || content.length === 0) {
    return false;
  }

  // Check for binary content (null bytes or high ratio of non-printable chars)
  const nonPrintableRatio = (content.match(/[^\x20-\x7E\t\n\r]/g) || []).length / content.length;
  if (nonPrintableRatio > 0.1) { // More than 10% non-printable characters
    return false;
  }

  // Check for very long lines (potential DoS)
  const lines = content.split('\n');
  const avgLineLength = content.length / lines.length;
  if (avgLineLength > 10000) { // Average line longer than 10KB
    return false;
  }

  // Check for CSV-like structure (at least one comma or semicolon delimiter)
  const hasDelimiter = content.includes(',') || content.includes(';') || content.includes('\t');

  // Allow content that looks like CSV or is the first chunk (might be headers only)
  return hasDelimiter || lines.length <= 2;
}

// Rate limiting configuration
const uploadRateLimit = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 upload requests per windowMs
  message: {
    error: 'Too many upload requests',
    message: 'Upload rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded for IP: %s', req.ip);
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'Upload rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Configure multer for memory storage (we'll stream to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10000000'), // 10MB default
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Strict CSV file validation
    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
    const allowedExtensions = ['.csv'];

    // Check mimetype
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn('Rejected file with invalid mimetype: %s', file.mimetype);
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
      return;
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      logger.warn('Rejected file with invalid extension: %s', fileExtension);
      cb(new Error('Invalid file extension. File must have .csv extension.'));
      return;
    }

    // Basic content validation will be done in the route handler
    cb(null, true);
  },
});

export function createUploadRoutes(): express.Router {
  const router = express.Router();

  /**
   * Start a new upload session
   * POST /v1/upload/start
   */
  router.post('/upload/start', uploadRateLimit, async (req, res) => {
    try {
      const sessionId = randomUUID();
      const tempDir = process.env.TEMP_DIR || '/tmp/graph-er-uploads';
      const tempPath = path.join(tempDir, `${sessionId}.csv`);

      // Ensure temp directory exists
      await fs.mkdir(tempDir, { recursive: true });

      const session: z.infer<typeof UploadSessionSchema> = {
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
    } catch (error) {
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
  router.post('/upload/:sessionId/chunk', uploadRateLimit, upload.single('chunk'), async (req, res) => {
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

      // Validate CSV content (basic check - ensure it's text and contains CSV-like structure)
      const chunkContent = req.file.buffer.toString('utf8');
      if (!isValidCSVContent(chunkContent)) {
        logger.warn('Rejected chunk with invalid CSV content for session: %s', sessionId);
        return res.status(400).json({
          error: 'Invalid file content. File must contain valid CSV data.',
          code: 'INVALID_CSV_CONTENT',
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
    } catch (error) {
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

      // Trigger ETL pipeline
      const batchId = randomUUID();

      // Start ETL processing asynchronously
      processETLBatch(session.tempPath, batchId)
        .then((result) => {
          logger.info('ETL processing completed', { sessionId, batchId, result });
          session.status = 'completed';
        })
        .catch((error) => {
          logger.error('ETL processing failed', { error, sessionId, batchId });
          session.status = 'failed';
        });

      logger.info('Upload committed for processing', {
        sessionId,
        filename: session.filename,
        totalSize: session.uploadedSize,
        batchId,
      });

      res.json({
        sessionId,
        status: 'processing',
        message: 'File uploaded successfully, ETL processing started',
        batchId,
      });
    } catch (error) {
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
