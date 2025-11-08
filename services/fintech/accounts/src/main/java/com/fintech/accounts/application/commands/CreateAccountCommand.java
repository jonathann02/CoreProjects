package com.fintech.accounts.application.commands;

import com.fintech.accounts.domain.AccountType;
import com.fintech.accounts.domain.Currency;

/**
 * Command to create a new account.
 */
public record CreateAccountCommand(
    String accountNumber,
    AccountType type,
    Currency currency
) {
    public CreateAccountCommand {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Account number cannot be null or empty");
        }
        if (type == null) {
            throw new IllegalArgumentException("Account type cannot be null");
        }
        if (currency == null) {
            throw new IllegalArgumentException("Currency cannot be null");
        }
    }
}
