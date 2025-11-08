package com.fintech.accounts.application.queries;

import java.util.UUID;

/**
 * Query to retrieve an account by ID.
 */
public record GetAccountQuery(UUID accountId) {
    public GetAccountQuery {
        if (accountId == null) {
            throw new IllegalArgumentException("Account ID cannot be null");
        }
    }
}
