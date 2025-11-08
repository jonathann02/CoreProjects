package com.fintech.payments.domain;

/**
 * Payment status indicating the current state of a payment transaction.
 */
public enum PaymentStatus {
    PENDING,    // Payment initiated but not yet processed
    PROCESSING, // Payment is being processed
    COMPLETED,  // Payment successfully completed
    FAILED      // Payment failed and cannot be completed
}
