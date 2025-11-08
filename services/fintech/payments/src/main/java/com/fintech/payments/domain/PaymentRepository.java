package com.fintech.payments.domain;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Payment domain operations.
 */
public interface PaymentRepository {

    /**
     * Saves a payment to the repository.
     */
    Payment save(Payment payment);

    /**
     * Finds a payment by its ID.
     */
    Optional<Payment> findById(UUID id);

    /**
     * Finds a payment by its idempotency key.
     */
    Optional<Payment> findByIdempotencyKey(UUID idempotencyKey);

    /**
     * Checks if a payment exists with the given idempotency key.
     */
    boolean existsByIdempotencyKey(UUID idempotencyKey);

    /**
     * Updates the status of a payment.
     */
    Payment updateStatus(UUID paymentId, PaymentStatus newStatus, String failureReason);
}
