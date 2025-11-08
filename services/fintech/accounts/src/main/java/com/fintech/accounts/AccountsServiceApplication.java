package com.fintech.accounts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * FinTech Accounts Service Application
 *
 * Provides account management functionality including:
 * - Account creation and retrieval
 * - Double-entry ledger operations
 * - Event-driven architecture with Kafka
 * - JWT-based authentication
 */
@SpringBootApplication
@EnableKafka
public class AccountsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AccountsServiceApplication.class, args);
    }
}
