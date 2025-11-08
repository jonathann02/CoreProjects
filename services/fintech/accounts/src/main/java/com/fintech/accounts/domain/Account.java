package com.fintech.accounts.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Account domain entity representing a financial account in the system.
 * Implements double-entry bookkeeping principles.
 */
public class Account {
    private final UUID id;
    private final String accountNumber;
    private final AccountType type;
    private final Currency currency;
    private final AccountStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;
    private BigDecimal balance;

    // Private constructor - use factory methods
    private Account(UUID id, String accountNumber, AccountType type, Currency currency,
                   AccountStatus status, BigDecimal balance, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.type = type;
        this.currency = currency;
        this.status = status;
        this.balance = balance;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;

        validate();
    }

    /**
     * Creates a new account with initial state.
     */
    public static Account create(String accountNumber, AccountType type, Currency currency) {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Account number cannot be null or empty");
        }
        if (type == null) {
            throw new IllegalArgumentException("Account type cannot be null");
        }
        if (currency == null) {
            throw new IllegalArgumentException("Currency cannot be null");
        }

        var now = Instant.now();
        return new Account(
            UUID.randomUUID(),
            accountNumber.trim(),
            type,
            currency,
            AccountStatus.ACTIVE,
            BigDecimal.ZERO,
            now,
            now
        );
    }

    /**
     * Debits the account (reduces balance).
     */
    public void debit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Debit amount must be positive");
        }
        if (status != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot debit inactive account");
        }

        var newBalance = balance.subtract(amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0 && type == AccountType.ASSET) {
            throw new IllegalStateException("Insufficient funds for debit operation");
        }

        balance = newBalance;
    }

    /**
     * Credits the account (increases balance).
     */
    public void credit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be positive");
        }
        if (status != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot credit inactive account");
        }

        balance = balance.add(amount);
    }

    /**
     * Closes the account.
     */
    public Account close() {
        if (balance.compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalStateException("Cannot close account with non-zero balance");
        }

        return new Account(
            id,
            accountNumber,
            type,
            currency,
            AccountStatus.CLOSED,
            balance,
            createdAt,
            Instant.now()
        );
    }

    /**
     * Validates the account state.
     */
    private void validate() {
        if (id == null) {
            throw new IllegalStateException("Account ID cannot be null");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new IllegalStateException("Account number cannot be null or empty");
        }
        if (type == null) {
            throw new IllegalStateException("Account type cannot be null");
        }
        if (currency == null) {
            throw new IllegalStateException("Currency cannot be null");
        }
        if (status == null) {
            throw new IllegalStateException("Account status cannot be null");
        }
        if (balance == null) {
            throw new IllegalStateException("Balance cannot be null");
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
    public String getAccountNumber() { return accountNumber; }
    public AccountType getType() { return type; }
    public Currency getCurrency() { return currency; }
    public AccountStatus getStatus() { return status; }
    public BigDecimal getBalance() { return balance; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Account account = (Account) o;
        return id.equals(account.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public String toString() {
        return "Account{" +
                "id=" + id +
                ", accountNumber='" + accountNumber + '\'' +
                ", type=" + type +
                ", currency=" + currency +
                ", status=" + status +
                ", balance=" + balance +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
