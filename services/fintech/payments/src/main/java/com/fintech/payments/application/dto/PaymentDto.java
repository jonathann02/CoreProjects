package com.fintech.payments.application.dto;

import com.fintech.payments.domain.Currency;
import com.fintech.payments.domain.Payment;
import com.fintech.payments.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object for Payment information.
 */
public record PaymentDto(
    UUID id,
    UUID idempotencyKey,
    UUID fromAccountId,
    UUID toAccountId,
    BigDecimal amount,
    Currency currency,
    String description,
    PaymentStatus status,
    String failureReason,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Creates PaymentDto from Payment domain entity.
     */
    public static PaymentDto from(Payment payment) {
        return new PaymentDto(
            payment.getId(),
            payment.getIdempotencyKey(),
            payment.getFromAccountId(),
            payment.getToAccountId(),
            payment.getAmount(),
            payment.getCurrency(),
            payment.getDescription(),
            payment.getStatus(),
            payment.getFailureReason(),
            payment.getCreatedAt(),
            payment.getUpdatedAt()
        );
    }
}
