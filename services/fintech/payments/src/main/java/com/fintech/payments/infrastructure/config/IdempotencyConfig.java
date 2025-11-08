package com.fintech.payments.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for idempotency handling.
 */
@Component
@ConfigurationProperties(prefix = "app.idempotency")
public class IdempotencyConfig {

    private long ttlSeconds = 86400; // 24 hours default

    public long getTtlSeconds() {
        return ttlSeconds;
    }

    public void setTtlSeconds(long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }
}
