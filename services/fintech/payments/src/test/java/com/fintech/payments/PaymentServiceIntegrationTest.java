package com.fintech.payments;

import com.fintech.payments.application.commands.InitiatePaymentCommand;
import com.fintech.payments.application.handlers.PaymentHandler;
import com.fintech.payments.infrastructure.config.IdempotencyService;
import com.fintech.payments.infrastructure.config.RateLimitService;
import com.fintech.payments.infrastructure.client.AccountsServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Integration tests for Payment Service using Testcontainers.
 * Tests payment initiation, idempotency, and rate limiting with real infrastructure.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class PaymentServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
            .withDatabaseName("fintech_test")
            .withUsername("fintech_user")
            .withPassword("fintech_pass");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @Autowired
    private PaymentHandler paymentHandler;

    @Autowired
    private IdempotencyService idempotencyService;

    @Autowired
    private RateLimitService rateLimitService;

    @MockBean
    private AccountsServiceClient accountsClient;

    @BeforeEach
    void setUp() {
        // Mock the accounts service client to allow payments
        when(accountsClient.validateAccountForDebit(any(UUID.class), any(BigDecimal.class)))
            .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(null));

        when(accountsClient.debitAccount(any(UUID.class), any(BigDecimal.class), any(String.class)))
            .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(null));

        when(accountsClient.creditAccount(any(UUID.class), any(BigDecimal.class), any(String.class)))
            .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(null));
    }

    @Test
    void shouldInitiatePaymentSuccessfully() {
        // Given
        var idempotencyKey = UUID.randomUUID();
        var fromAccountId = UUID.randomUUID();
        var toAccountId = UUID.randomUUID();
        var amount = BigDecimal.valueOf(100.50);
        var currency = com.fintech.payments.domain.Currency.USD;
        var description = "Test payment";

        var command = new InitiatePaymentCommand(
            idempotencyKey,
            fromAccountId,
            toAccountId,
            amount,
            currency,
            description
        );

        // When
        var result = paymentHandler.initiatePayment(command, "test-user");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.id()).isNotNull();
        assertThat(result.status()).isEqualTo(com.fintech.payments.domain.PaymentStatus.PENDING);
        assertThat(result.amount()).isEqualTo(amount);
        assertThat(result.currency()).isEqualTo(currency);
    }

    @Test
    void shouldEnforceIdempotency() {
        // Given
        var idempotencyKey = UUID.randomUUID();
        var fromAccountId = UUID.randomUUID();
        var toAccountId = UUID.randomUUID();
        var amount = BigDecimal.valueOf(50.00);

        var command = new InitiatePaymentCommand(
            idempotencyKey,
            fromAccountId,
            toAccountId,
            amount,
            com.fintech.payments.domain.Currency.USD,
            "Idempotency test"
        );

        // When - First request
        var firstResult = paymentHandler.initiatePayment(command, "test-user");

        // When - Second request with same idempotency key
        var secondResult = paymentHandler.initiatePayment(command, "test-user");

        // Then
        assertThat(firstResult).isNotNull();
        assertThat(secondResult).isNotNull();
        assertThat(firstResult.id()).isEqualTo(secondResult.id()); // Same payment returned
    }

    @Test
    void shouldEnforceRateLimiting() {
        // Given
        var userId = "test-user";

        // When - Check initial rate limit status
        var initialAllowed = rateLimitService.isAllowed(userId);
        var remainingRequests = rateLimitService.getRemainingRequests(userId);

        // Then
        assertThat(initialAllowed).isTrue();
        assertThat(remainingRequests).isGreaterThan(0);
    }

    @Test
    void shouldValidateIdempotencyKeyIsRequired() {
        // Given
        var command = new InitiatePaymentCommand(
            null, // null idempotency key
            UUID.randomUUID(),
            UUID.randomUUID(),
            BigDecimal.valueOf(100.00),
            com.fintech.payments.domain.Currency.USD,
            "Test"
        );

        // When & Then
        org.junit.jupiter.api.Assertions.assertThrows(
            IllegalArgumentException.class,
            () -> paymentHandler.initiatePayment(command, "test-user")
        );
    }
}
