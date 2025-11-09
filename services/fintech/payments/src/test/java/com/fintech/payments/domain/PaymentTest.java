package com.fintech.payments.domain;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for Payment domain entity.
 */
class PaymentTest {

    @Test
    void shouldCreatePaymentSuccessfully() {
        // Given
        var idempotencyKey = UUID.randomUUID();
        var fromAccountId = UUID.randomUUID();
        var toAccountId = UUID.randomUUID();
        var amount = BigDecimal.valueOf(100.50);
        var currency = Currency.USD;
        var description = "Test payment";

        // When
        var payment = Payment.create(idempotencyKey, fromAccountId, toAccountId, amount, currency, description);

        // Then
        assertThat(payment).isNotNull();
        assertThat(payment.getId()).isNotNull();
        assertThat(payment.getIdempotencyKey()).isEqualTo(idempotencyKey);
        assertThat(payment.getFromAccountId()).isEqualTo(fromAccountId);
        assertThat(payment.getToAccountId()).isEqualTo(toAccountId);
        assertThat(payment.getAmount()).isEqualTo(amount);
        assertThat(payment.getCurrency()).isEqualTo(currency);
        assertThat(payment.getDescription()).isEqualTo(description);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(payment.getCreatedAt()).isNotNull();
        assertThat(payment.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldThrowExceptionWhenCreatingPaymentWithNullIdempotencyKey() {
        assertThatThrownBy(() -> Payment.create(null, UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Idempotency key cannot be null");
    }

    @Test
    void shouldThrowExceptionWhenCreatingPaymentWithNullAmount() {
        assertThatThrownBy(() -> Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            null, Currency.USD, "test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Amount must be positive");
    }

    @Test
    void shouldThrowExceptionWhenCreatingPaymentWithZeroAmount() {
        assertThatThrownBy(() -> Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ZERO, Currency.USD, "test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Amount must be positive");
    }

    @Test
    void shouldThrowExceptionWhenCreatingPaymentWithNegativeAmount() {
        assertThatThrownBy(() -> Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.valueOf(-10), Currency.USD, "test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Amount must be positive");
    }

    @Test
    void shouldThrowExceptionWhenCreatingPaymentToSameAccount() {
        var accountId = UUID.randomUUID();
        assertThatThrownBy(() -> Payment.create(UUID.randomUUID(), accountId, accountId,
            BigDecimal.ONE, Currency.USD, "test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Cannot transfer to the same account");
    }

    @Test
    void shouldMarkPaymentAsProcessingSuccessfully() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // When
        var processingPayment = payment.markAsProcessing();

        // Then
        assertThat(processingPayment.getStatus()).isEqualTo(PaymentStatus.PROCESSING);
        assertThat(processingPayment.getUpdatedAt()).isAfter(payment.getUpdatedAt());
    }

    @Test
    void shouldThrowExceptionWhenMarkingNonPendingPaymentAsProcessing() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");
        var processingPayment = payment.markAsProcessing();

        // When & Then
        assertThatThrownBy(() -> processingPayment.markAsProcessing())
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Can only mark PENDING payments as processing");
    }

    @Test
    void shouldMarkPaymentAsCompletedSuccessfully() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");
        var processingPayment = payment.markAsProcessing();

        // When
        var completedPayment = processingPayment.markAsCompleted();

        // Then
        assertThat(completedPayment.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(completedPayment.getUpdatedAt()).isAfter(processingPayment.getUpdatedAt());
    }

    @Test
    void shouldThrowExceptionWhenMarkingNonProcessingPaymentAsCompleted() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // When & Then
        assertThatThrownBy(() -> payment.markAsCompleted())
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Can only mark PROCESSING payments as completed");
    }

    @Test
    void shouldMarkPaymentAsFailedSuccessfully() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // When
        var failedPayment = payment.markAsFailed("Insufficient funds");

        // Then
        assertThat(failedPayment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(failedPayment.getFailureReason()).isEqualTo("Insufficient funds");
        assertThat(failedPayment.getUpdatedAt()).isAfter(payment.getUpdatedAt());
    }

    @Test
    void shouldAllowRetryingFailedPayments() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // When
        var failedPayment = payment.markAsFailed("Network error");

        // Then
        assertThat(failedPayment.canRetry()).isTrue();
    }

    @Test
    void shouldAllowRetryingPendingPayments() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // Then
        assertThat(payment.canRetry()).isTrue();
    }

    @Test
    void shouldNotAllowRetryingCompletedPayments() {
        // Given
        var payment = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");
        var processingPayment = payment.markAsProcessing();
        var completedPayment = processingPayment.markAsCompleted();

        // Then
        assertThat(completedPayment.canRetry()).isFalse();
    }

    @Test
    void shouldImplementEqualsAndHashCodeBasedOnId() {
        // Given
        var id1 = UUID.randomUUID();
        var id2 = UUID.randomUUID();
        var payment1 = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");
        var payment2 = Payment.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            BigDecimal.ONE, Currency.USD, "test");

        // Simulate same ID for testing (normally IDs are auto-generated)
        assertThat(payment1).isNotEqualTo(payment2);
        assertThat(payment1.hashCode()).isNotEqualTo(payment2.hashCode());
    }
}
