package com.fintech.accounts.domain;

/**
 * Account status indicating operational state.
 */
public enum AccountStatus {
    ACTIVE,     // Account is active and can be used for transactions
    SUSPENDED,  // Account is temporarily suspended
    CLOSED      // Account is permanently closed
}
