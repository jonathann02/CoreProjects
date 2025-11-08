package com.fintech.payments.application.commands;

import com.fintech.payments.domain.Currency;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command to initiate a new payment.
 * Supports idempotent operations via idempotency key.
 */
public record InitiatePaymentCommand(
    UUID idempotencyKey,
    UUID fromAccountId,
    UUID toAccountId,
    BigDecimal amount,
    Currency currency,
    String description
) {
    public InitiatePaymentCommand {
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
    }
}
