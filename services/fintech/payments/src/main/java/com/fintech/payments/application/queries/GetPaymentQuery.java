package com.fintech.payments.application.queries;

import java.util.UUID;

/**
 * Query to retrieve a payment by ID.
 */
public record GetPaymentQuery(UUID paymentId) {
    public GetPaymentQuery {
        if (paymentId == null) {
            throw new IllegalArgumentException("Payment ID cannot be null");
        }
    }
}
