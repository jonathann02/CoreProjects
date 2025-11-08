package com.fintech.accounts.application.dto;

import com.fintech.accounts.domain.Account;
import com.fintech.accounts.domain.AccountStatus;
import com.fintech.accounts.domain.AccountType;
import com.fintech.accounts.domain.Currency;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object for Account information.
 */
public record AccountDto(
    UUID id,
    String accountNumber,
    AccountType type,
    Currency currency,
    AccountStatus status,
    BigDecimal balance,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Creates AccountDto from Account domain entity.
     */
    public static AccountDto from(Account account) {
        return new AccountDto(
            account.getId(),
            account.getAccountNumber(),
            account.getType(),
            account.getCurrency(),
            account.getStatus(),
            account.getBalance(),
            account.getCreatedAt(),
            account.getUpdatedAt()
        );
    }
}
