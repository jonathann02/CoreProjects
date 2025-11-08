package com.fintech.payments.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payment domain entity representing a financial transaction.
 * Supports idempotent operations and maintains payment state.
 */
public class Payment {
    private final UUID id;
    private final UUID idempotencyKey;
    private final UUID fromAccountId;
    private final UUID toAccountId;
    private final BigDecimal amount;
    private final Currency currency;
    private final String description;
    private final PaymentStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final String failureReason;

    // Private constructor - use factory methods
    private Payment(UUID id, UUID idempotencyKey, UUID fromAccountId, UUID toAccountId,
                   BigDecimal amount, Currency currency, String description,
                   PaymentStatus status, Instant createdAt, Instant updatedAt, String failureReason) {
        this.id = id;
        this.idempotencyKey = idempotencyKey;
        this.fromAccountId = fromAccountId;
        this.toAccountId = toAccountId;
        this.amount = amount;
        this.currency = currency;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.failureReason = failureReason;

        validate();
    }

    /**
     * Creates a new payment with PENDING status.
     */
    public static Payment create(UUID idempotencyKey, UUID fromAccountId, UUID toAccountId,
                               BigDecimal amount, Currency currency, String description) {
        if (idempotencyKey == null) {
            throw new IllegalArgumentException("Idempotency key cannot be null");
        }
        if (fromAccountId == null) {
            throw new IllegalArgumentException("From account ID cannot be null");
        }
        if (toAccountId == null) {
            throw new IllegalArgumentException("To account ID cannot be null");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        if (currency == null) {
            throw new IllegalArgumentException("Currency cannot be null");
        }
        if (fromAccountId.equals(toAccountId)) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }

        var now = Instant.now();
        return new Payment(
            UUID.randomUUID(),
            idempotencyKey,
            fromAccountId,
            toAccountId,
            amount,
            currency,
            description != null ? description.trim() : "",
            PaymentStatus.PENDING,
            now,
            now,
            null
        );
    }

    /**
     * Marks the payment as processing.
     */
    public Payment markAsProcessing() {
        if (status != PaymentStatus.PENDING) {
            throw new IllegalStateException("Can only mark PENDING payments as processing");
        }

        return new Payment(
            id, idempotencyKey, fromAccountId, toAccountId, amount, currency, description,
            PaymentStatus.PROCESSING, createdAt, Instant.now(), null
        );
    }

    /**
     * Marks the payment as completed.
     */
    public Payment markAsCompleted() {
        if (status != PaymentStatus.PROCESSING) {
            throw new IllegalStateException("Can only mark PROCESSING payments as completed");
        }

        return new Payment(
            id, idempotencyKey, fromAccountId, toAccountId, amount, currency, description,
            PaymentStatus.COMPLETED, createdAt, Instant.now(), null
        );
    }

    /**
     * Marks the payment as failed.
     */
    public Payment markAsFailed(String reason) {
        if (status == PaymentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot fail a completed payment");
        }

        return new Payment(
            id, idempotencyKey, fromAccountId, toAccountId, amount, currency, description,
            PaymentStatus.FAILED, createdAt, Instant.now(),
            reason != null ? reason.trim() : "Unknown error"
        );
    }

    /**
     * Checks if the payment can be retried.
     */
    public boolean canRetry() {
        return status == PaymentStatus.FAILED || status == PaymentStatus.PENDING;
    }

    /**
     * Validates the payment state.
     */
    private void validate() {
        if (id == null) {
            throw new IllegalStateException("Payment ID cannot be null");
        }
        if (idempotencyKey == null) {
            throw new IllegalStateException("Idempotency key cannot be null");
        }
        if (fromAccountId == null) {
            throw new IllegalStateException("From account ID cannot be null");
        }
        if (toAccountId == null) {
            throw new IllegalStateException("To account ID cannot be null");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Amount must be positive");
        }
        if (currency == null) {
            throw new IllegalStateException("Currency cannot be null");
        }
        if (status == null) {
            throw new IllegalStateException("Status cannot be null");
        }
        if (createdAt == null) {
            throw new IllegalStateException("Created date cannot be null");
        }
        if (updatedAt == null) {
            throw new IllegalStateException("Updated date cannot be null");
        }
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getIdempotencyKey() { return idempotencyKey; }
    public UUID getFromAccountId() { return fromAccountId; }
    public UUID getToAccountId() { return toAccountId; }
    public BigDecimal getAmount() { return amount; }
    public Currency getCurrency() { return currency; }
    public String getDescription() { return description; }
    public PaymentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getFailureReason() { return failureReason; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Payment payment = (Payment) o;
        return id.equals(payment.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public String toString() {
        return "Payment{" +
                "id=" + id +
                ", idempotencyKey=" + idempotencyKey +
                ", fromAccountId=" + fromAccountId +
                ", toAccountId=" + toAccountId +
                ", amount=" + amount +
                ", currency=" + currency +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
