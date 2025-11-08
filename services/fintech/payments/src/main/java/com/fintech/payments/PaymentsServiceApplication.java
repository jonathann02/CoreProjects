package com.fintech.payments;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * FinTech Payments Service Application
 *
 * Provides payment processing functionality including:
 * - Idempotent payment initiation
 * - Debit/credit operations against accounts
 * - Transactional outbox pattern
 * - Redis-based rate limiting
 * - Event-driven architecture with Kafka
 * - JWT-based authentication
 */
@SpringBootApplication
@EnableKafka
@EnableAsync
public class PaymentsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentsServiceApplication.class, args);
    }
}
