package com.fintech.payments.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Service for managing idempotency keys using Redis.
 * Ensures that duplicate requests with the same idempotency key are handled correctly.
 */
@Service
public class IdempotencyService {

    private static final Logger logger = LoggerFactory.getLogger(IdempotencyService.class);

    private final RedisTemplate<String, String> redisTemplate;
    private final Duration ttl;

    public IdempotencyService(RedisTemplate<String, String> redisTemplate, IdempotencyConfig config) {
        this.redisTemplate = redisTemplate;
        this.ttl = Duration.ofSeconds(config.getTtlSeconds());
    }

    /**
     * Checks if an idempotency key is already being processed or has been processed.
     * If the key doesn't exist, marks it as being processed.
     *
     * @param idempotencyKey the idempotency key
     * @return true if the key is new (first request), false if it's already being processed
     */
    public boolean isNewRequest(UUID idempotencyKey) {
        var key = getRedisKey(idempotencyKey);
        var value = "PROCESSING";

        // Try to set the key only if it doesn't exist (NX option)
        var result = redisTemplate.opsForValue().setIfAbsent(key, value, ttl);

        if (result == null) {
            logger.warn("Redis operation failed for idempotency key: {}", idempotencyKey);
            return false;
        }

        if (result) {
            logger.debug("New idempotency key processed: {}", idempotencyKey);
            return true;
        } else {
            logger.debug("Duplicate idempotency key detected: {}", idempotencyKey);
            return false;
        }
    }

    /**
     * Marks an idempotency key as completed (successful processing).
     */
    public void markCompleted(UUID idempotencyKey) {
        var key = getRedisKey(idempotencyKey);
        redisTemplate.opsForValue().set(key, "COMPLETED", ttl);
        logger.debug("Idempotency key marked as completed: {}", idempotencyKey);
    }

    /**
     * Marks an idempotency key as failed.
     */
    public void markFailed(UUID idempotencyKey) {
        var key = getRedisKey(idempotencyKey);
        redisTemplate.opsForValue().set(key, "FAILED", ttl);
        logger.debug("Idempotency key marked as failed: {}", idempotencyKey);
    }

    /**
     * Checks the current status of an idempotency key.
     */
    public String getStatus(UUID idempotencyKey) {
        var key = getRedisKey(idempotencyKey);
        return redisTemplate.opsForValue().get(key);
    }

    /**
     * Removes an idempotency key (for cleanup/testing purposes).
     */
    public void remove(UUID idempotencyKey) {
        var key = getRedisKey(idempotencyKey);
        redisTemplate.delete(key);
        logger.debug("Idempotency key removed: {}", idempotencyKey);
    }

    private String getRedisKey(UUID idempotencyKey) {
        return "idempotency:" + idempotencyKey.toString();
    }
}
