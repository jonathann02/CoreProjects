package com.fintech.payments.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Service for rate limiting using Redis with atomic operations.
 * Uses Redis Lua scripts for atomic increment and expiration.
 */
@Service
public class RateLimitService {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitService.class);

    // Lua script for atomic rate limiting
    private static final String RATE_LIMIT_SCRIPT =
        "local key = KEYS[1] " +
        "local limit = tonumber(ARGV[1]) " +
        "local window = tonumber(ARGV[2]) " +
        "local current = redis.call('INCR', key) " +
        "if current == 1 then " +
        "    redis.call('EXPIRE', key, window) " +
        "end " +
        "return current";

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisScript<Long> rateLimitScript;
    private final RateLimitConfig config;

    public RateLimitService(RedisTemplate<String, String> redisTemplate, RateLimitConfig config) {
        this.redisTemplate = redisTemplate;
        this.config = config;
        this.rateLimitScript = RedisScript.of(RATE_LIMIT_SCRIPT, Long.class);
    }

    /**
     * Checks if a request is allowed based on rate limits.
     *
     * @param identifier unique identifier (e.g., user ID, IP address)
     * @return true if request is allowed, false if rate limited
     */
    public boolean isAllowed(String identifier) {
        if (!config.isEnabled()) {
            return true;
        }

        var key = getRateLimitKey(identifier);
        var limit = config.getRequestsPerMinute();
        var windowSeconds = 60; // 1 minute window

        try {
            Long currentCount = redisTemplate.execute(
                rateLimitScript,
                Collections.singletonList(key),
                String.valueOf(limit),
                String.valueOf(windowSeconds)
            );

            if (currentCount == null) {
                logger.warn("Rate limit script returned null for key: {}", key);
                return false;
            }

            boolean allowed = currentCount <= limit;
            if (!allowed) {
                logger.warn("Rate limit exceeded for identifier: {} (count: {})", identifier, currentCount);
            }

            return allowed;
        } catch (Exception e) {
            logger.error("Error checking rate limit for identifier: {}", identifier, e);
            // Fail open - allow request if Redis is unavailable
            return true;
        }
    }

    /**
     * Gets the remaining requests allowed for an identifier.
     */
    public long getRemainingRequests(String identifier) {
        if (!config.isEnabled()) {
            return Long.MAX_VALUE;
        }

        var key = getRateLimitKey(identifier);
        var limit = config.getRequestsPerMinute();

        try {
            String count = redisTemplate.opsForValue().get(key);
            if (count == null) {
                return limit;
            }

            long currentCount = Long.parseLong(count);
            return Math.max(0, limit - currentCount);
        } catch (Exception e) {
            logger.error("Error getting remaining requests for identifier: {}", identifier, e);
            return 0;
        }
    }

    /**
     * Gets the time until the rate limit resets (in seconds).
     */
    public long getResetTime(String identifier) {
        if (!config.isEnabled()) {
            return 0;
        }

        var key = getRateLimitKey(identifier);

        try {
            Long ttl = redisTemplate.getExpire(key);
            return ttl != null ? ttl : 0;
        } catch (Exception e) {
            logger.error("Error getting reset time for identifier: {}", identifier, e);
            return 60; // Default to 60 seconds
        }
    }

    /**
     * Manually resets the rate limit for an identifier (for testing/admin purposes).
     */
    public void reset(String identifier) {
        var key = getRateLimitKey(identifier);
        redisTemplate.delete(key);
        logger.debug("Rate limit reset for identifier: {}", identifier);
    }

    private String getRateLimitKey(String identifier) {
        return "ratelimit:" + identifier;
    }
}
